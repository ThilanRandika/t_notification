/**
 * Notification Service - Integration Test Suite
 *
 * Pattern followed from the group's established testing conventions:
 *  - Framework   : Jest (v29)
 *  - HTTP layer  : Supertest (fires real HTTP against the Express app)
 *  - DB mocking  : jest.mock('mongoose') — stubs connect() so no real Atlas
 *                  connection is opened during tests
 *  - Model mock  : jest.mock('../models/Notification') — returns in-memory
 *                  fixtures for every Mongoose query
 *  - Axios mock  : jest.mock('axios') — intercepts all inter-service HTTP
 *                  calls (auth/verify, order hydration) and returns controlled
 *                  fixtures, matching the pattern used in t_order
 *
 * NOTE: The health check in index.js guards on mongoose.connection.readyState.
 * We patch readyState to 1 (connected) so the test receives 200 instead of 503.
 */

// ── 1. Stub MongoDB connection ────────────────────────────────────────────────
// Provide a fake `connection` object with readyState=1 so the /health guard
// (which checks mongoose.connection.readyState !== 1) returns 200, not 503.
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(true),
    connection: { readyState: 1 },
  };
});

// ── 2. Stub Notification model ────────────────────────────────────────────────
const MOCK_STATUS_LOG = {
  _id: 'notif_status_1',
  recipientEmail: 'customer@example.com',
  type: 'status',
  subject: 'Update on your ShopEase Order #abc123',
  body: '\nYour order status has been updated to: [ SHIPPED ]',
  isRead: false,
  createdAt: new Date('2026-04-20T10:00:00Z'),
  toObject: function () { return { ...this }; },
};

const MOCK_ORDER_LOG = {
  _id: 'notif_order_1',
  recipientEmail: 'customer@example.com',
  type: 'order',
  subject: 'Your ShopEase Order #ord123 is Confirmed!',
  body: '\nGreat news! We have received your order.',
  isRead: false,
  createdAt: new Date('2026-04-19T08:00:00Z'),
  toObject: function () { return { ...this }; },
};

const MOCK_WELCOME_LOG = {
  _id: 'notif_welcome_1',
  recipientEmail: 'newuser@example.com',
  type: 'welcome',
  subject: 'Welcome to ShopEase!',
  body: '\nHi Jane,\n\nWelcome to ShopEase!',
  isRead: false,
  createdAt: new Date('2026-04-18T06:00:00Z'),
  toObject: function () { return { ...this }; },
};

jest.mock('../models/Notification', () => ({
  create: jest.fn().mockImplementation((data) =>
    Promise.resolve({ _id: 'new_notif_id', ...data })
  ),
  // Chainable query used by my-history (find → sort)
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip:  jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([MOCK_STATUS_LOG]),
      }),
      // Used by my-history (no skip/limit chaining)
      then: undefined, // not a thenable itself
    }),
    // Direct resolved for my-history (find → sort → resolves)
  }),
  countDocuments: jest.fn().mockResolvedValue(1),
}));

// ── 3. Stub axios (inter-service: auth/verify + order hydration) ──────────────
jest.mock('axios', () => ({
  get: jest.fn().mockImplementation((url) => {
    if (url.includes('/auth/verify')) {
      return Promise.resolve({
        data: { user: { userId: 'user_admin_1', email: 'admin@shopease.com', role: 'admin' } },
      });
    }
    if (url.includes('/orders/')) {
      return Promise.resolve({
        data: {
          order: {
            _id: 'abc123',
            status: 'shipped',
            totalAmount: 4500,
            items: [{ productName: 'Silk Pillowcase', quantity: 2, price: 2250 }],
            shippingAddress: { street: '12 Main St', city: 'Colombo', country: 'Sri Lanka' },
          },
        },
      });
    }
    return Promise.resolve({ data: {} });
  }),
}));

// ── 4. Silence noisy console output ─────────────────────────────────────────
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();


const request = require('supertest');
const app = require('../index');

// ─────────────────────────────────────────────────────────────────────────────
describe('Notification Service APIs', () => {

  // ── Health Check ──────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 with service name and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('notification-service');
    });
  });

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  describe('GET /unknown-route', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /api/notifications/welcome ──────────────────────────────────────
  describe('POST /api/notifications/welcome', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/notifications/welcome')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/notifications/welcome')
        .send({ email: 'not-an-email', name: 'Jane' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 200 and log the welcome notification for valid input', async () => {
      const res = await request(app)
        .post('/api/notifications/welcome')
        .send({ email: 'jane@example.com', name: 'Jane' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Welcome email sent and logged');
      expect(res.body.notification).toBeDefined();
      expect(res.body.notification.recipientEmail).toBe('jane@example.com');
    });
  });

  // ── POST /api/notifications/order-placed ─────────────────────────────────
  describe('POST /api/notifications/order-placed', () => {
    const validOrderPayload = {
      orderId: 'ord_001',
      userEmail: 'buyer@example.com',
      totalAmount: 5000,
      items: [{ productId: 'prod_001', productName: 'Silk Sheet', quantity: 1, price: 5000 }],
      shippingAddress: { street: '5 Lake Rd', city: 'Kandy', country: 'Sri Lanka' },
    };

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/notifications/order-placed')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 when items array is empty', async () => {
      const res = await request(app)
        .post('/api/notifications/order-placed')
        .send({ ...validOrderPayload, items: [] });
      expect(res.statusCode).toBe(400);
    });

    it('should return 200 and confirm the notification was logged', async () => {
      const res = await request(app)
        .post('/api/notifications/order-placed')
        .send(validOrderPayload);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Order confirmation sent and logged');
      expect(res.body.notification).toBeDefined();
    });
  });

  // ── POST /api/notifications/order-status ─────────────────────────────────
  describe('POST /api/notifications/order-status', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/notifications/order-status')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 200 for a valid status update notification', async () => {
      const res = await request(app)
        .post('/api/notifications/order-status')
        .send({
          orderId: 'ord_001',
          userEmail: 'buyer@example.com',
          status: 'Processing',
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Order status sent and logged');
      expect(res.body.notification).toBeDefined();
    });

    it('should return 200 and attempt logistics hydration for "shipped" status', async () => {
      const res = await request(app)
        .post('/api/notifications/order-status')
        .send({
          orderId: 'ord_001',
          userEmail: 'buyer@example.com',
          status: 'shipped',
        });
      expect(res.statusCode).toBe(200);
      // axios was called — the body should mention the shipped phrase
      expect(res.body.notification.body).toContain('SHIPPED');
    });
  });

  // ── GET /api/notifications/my-history ────────────────────────────────────
  describe('GET /api/notifications/my-history', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).get('/api/notifications/my-history');
      expect(res.statusCode).toBe(401);
    });

    it('should return 200 with notification history for a valid token', async () => {
      // Repatch find to return a simple sort chain for my-history
      const Notification = require('../models/Notification');
      Notification.find.mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue([MOCK_ORDER_LOG, MOCK_WELCOME_LOG]),
      });

      const res = await request(app)
        .get('/api/notifications/my-history')
        .set('Authorization', 'Bearer valid_admin_token');
      expect(res.statusCode).toBe(200);
      expect(res.body.notifications).toBeDefined();
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });
  });

  // ── GET /api/notifications/system-logs (admin only) ──────────────────────
  describe('GET /api/notifications/system-logs', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).get('/api/notifications/system-logs');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when the authenticated user is not an admin', async () => {
      // Temporarily override axios to return a customer role
      const axios = require('axios');
      axios.get.mockImplementationOnce((url) => {
        if (url.includes('/auth/verify')) {
          return Promise.resolve({
            data: { user: { userId: 'user_cust_1', email: 'cust@example.com', role: 'customer' } },
          });
        }
        return Promise.resolve({ data: {} });
      });

      const res = await request(app)
        .get('/api/notifications/system-logs')
        .set('Authorization', 'Bearer customer_token');
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Admin access required');
    });

    it('should return 200 with paginated logs and pagination metadata for an admin', async () => {
      const Notification = require('../models/Notification');
      Notification.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([MOCK_STATUS_LOG]),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/notifications/system-logs')
        .set('Authorization', 'Bearer valid_admin_token');
      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('should respect ?limit and ?page query params', async () => {
      const Notification = require('../models/Notification');
      Notification.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      Notification.countDocuments.mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/notifications/system-logs?page=2&limit=5')
        .set('Authorization', 'Bearer valid_admin_token');
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(5);
    });
  });
});
