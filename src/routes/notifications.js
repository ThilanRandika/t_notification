const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const Notification = require('../models/Notification');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

// Helper functions for mock email printing
const printHeader = (title) => {
  console.log('\n======================================================');
  console.log(`✉️  NEW EMAIL INTERCEPTED - ShopEase Notification`);
  console.log(`======================================================`);
  console.log(`SUBJECT: ${title}`);
};

const printFooter = () => {
  console.log(`\nThanks for choosing ShopEase - Sleep Better!`);
  console.log(`======================================================\n`);
};

const printToConsole = (email, subject, bodyChunks) => {
  printHeader(subject);
  console.log(`TO: ${email}`);
  bodyChunks.forEach(chunk => console.log(chunk));
  printFooter();
};

/**
 * @swagger
 * /api/notifications/welcome:
 *   post:
 *     summary: Send a welcome email to a new user
 *     tags: [Notifications]
 */
router.post(
  '/welcome',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, name } = req.body;
      const subject = 'Welcome to ShopEase!';
      const bodyChunks = [
        `\nHi ${name},`,
        `\nWelcome to ShopEase! We are thrilled to have you here.`,
        `Explore our premium luxury silk pillowcases and ultra-soft bedsheets.`
      ];

      printToConsole(email, subject, bodyChunks);
      const emailBody = bodyChunks.join('\n');

      const notification = await Notification.create({
        recipientEmail: email,
        type: 'welcome',
        subject,
        body: emailBody
      });

      res.status(200).json({ message: 'Welcome email sent and logged', notification });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/order-placed:
 *   post:
 *     summary: Send an order confirmation email
 *     tags: [Notifications]
 */
router.post(
  '/order-placed',
  [
    body('orderId').trim().notEmpty().withMessage('Order ID is required'),
    body('userEmail').isEmail().normalizeEmail().withMessage('Valid user email is required'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('shippingAddress').isObject().withMessage('Shipping address must be an object'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { orderId, userEmail, totalAmount, items, shippingAddress } = req.body;
      const subject = `Your ShopEase Order #${orderId} is Confirmed!`;
      const bodyChunks = [
        `\nGreat news! We've received your order and are getting it ready.`,
        `\n--- Order Details ---`
      ];

      if (items && Array.isArray(items)) {
        for (const item of items) {
          let enrichedName = item.productName || 'Unknown Product';
          let imageUrlStr = '';

          if (item.productId) {
            try {
              const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/products/${item.productId}`, { timeout: 3000 });
              if (data && data.product) {
                enrichedName = data.product.name || enrichedName;
                if (data.product.imageUrl) {
                  imageUrlStr = ` [Image: ${data.product.imageUrl}]`;
                }
              }
            } catch (err) {
              console.warn(`[Hydration Warning] Could not fetch product ${item.productId}: ${err.message}`);
              // Graceful degradation: fall back to basic text from initial payload
            }
          }

          bodyChunks.push(`- ${item.quantity}x ${enrichedName}${imageUrlStr} @ LKR ${item.price}`);
        }
      }

      bodyChunks.push(`\nTotal Amount: LKR ${totalAmount}`);
      bodyChunks.push(`\nShipping To:`);
      if (shippingAddress) {
        bodyChunks.push(`${shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.country || ''}`);
      }

      printToConsole(userEmail, subject, bodyChunks);
      const emailBody = bodyChunks.join('\n');

      const notification = await Notification.create({
        recipientEmail: userEmail,
        type: 'order',
        subject,
        body: emailBody
      });

      res.status(200).json({ message: 'Order confirmation sent and logged', notification });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/order-status:
 *   post:
 *     summary: Send an order status update email
 *     tags: [Notifications]
 */
router.post(
  '/order-status',
  [
    body('orderId').trim().notEmpty().withMessage('Order ID is required'),
    body('userEmail').isEmail().normalizeEmail().withMessage('Valid user email is required'),
    body('status').trim().notEmpty().withMessage('Status is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { orderId, userEmail, status } = req.body;
      const subject = `Update on your ShopEase Order #${orderId}`;
      const bodyChunks = [
        `\nYour order status has been updated to: [ ${status.toUpperCase()} ]`
      ];
      if (status.toLowerCase() === 'shipped') {
        bodyChunks.push(`Your premium bedding is on its way to you! Expect it soon.`);

        try {
          const { data } = await axios.get(`${ORDER_SERVICE_URL}/api/orders/${orderId}/tracking`, { timeout: 3000 });
          if (data && data.tracking) {
            bodyChunks.push(`\n--- Logistics Details ---`);
            if (data.tracking.courier) bodyChunks.push(`Courier: ${data.tracking.courier}`);
            if (data.tracking.trackingNumber) bodyChunks.push(`Tracking Number: ${data.tracking.trackingNumber}`);
            if (data.tracking.trackingUrl) bodyChunks.push(`Track your package here: ${data.tracking.trackingUrl}`);
            if (data.tracking.estimatedDelivery) bodyChunks.push(`Estimated Delivery: ${data.tracking.estimatedDelivery}`);
          }
        } catch (err) {
          console.warn(`[Hydration Warning] Could not fetch logistics data for order ${orderId}: ${err.message}`);
          // Graceful degradation: fall back to basic text from initial payload
        }
      }

      printToConsole(userEmail, subject, bodyChunks);
      const emailBody = bodyChunks.join('\n');

      const notification = await Notification.create({
        recipientEmail: userEmail,
        type: 'status',
        subject,
        body: emailBody
      });

      res.status(200).json({ message: 'Order status sent and logged', notification });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/product-update:
 *   post:
 *     summary: Send a product lifecycle notification to an admin
 *     description: Called by product-service when a product is created, updated, or deleted.
 *     tags: [Notifications]
 */
router.post(
  '/product-update',
  [
    body('adminEmail').isEmail().normalizeEmail().withMessage('Valid admin email is required'),
    body('productName').trim().notEmpty().withMessage('Product name is required'),
    body('action').isIn(['created', 'updated', 'deleted']).withMessage('Action must be created, updated, or deleted'),
    body('productId').trim().notEmpty().withMessage('Product ID is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { adminEmail, productId, productName, action, price, category } = req.body;
      const actionPast = action === 'created' ? 'Created' : action === 'updated' ? 'Updated' : 'Deleted';
      const subject = `Product ${actionPast}: ${productName}`;
      const bodyChunks = [
        `\nA product has been ${action} in the catalog.`,
        `\n--- Product Details ---`,
        `Name: ${productName}`,
        `Category: ${category || 'N/A'}`,
        `Price: LKR ${price ?? 'N/A'}`,
        `Product ID: ${productId}`,
        `Action: ${actionPast}`,
      ];

      printToConsole(adminEmail, subject, bodyChunks);
      const emailBody = bodyChunks.join('\n');

      const notification = await Notification.create({
        recipientEmail: adminEmail,
        type: 'product',
        subject,
        body: emailBody,
      });

      res.status(200).json({ message: 'Product notification sent and logged', notification });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/notifications/my-history:
 *   get:
 *     summary: Get notification history for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized token
 */
router.get('/my-history', authenticate, async (req, res, next) => {
  try {
    const email = req.user.email;
    const history = await Notification.find({ recipientEmail: email }).sort({ createdAt: -1 });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.status(200).json({ notifications: history });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/system-logs:
 *   get:
 *     summary: Get admin activity logs - order status changes and product lifecycle events (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of admin activity logs
 *       403:
 *         description: Admin access required
 */
router.get('/system-logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch both order-status and product lifecycle logs
    const logFilter = { type: { $in: ['status', 'product'] } };

    const logs = await Notification.find(logFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Hydrate logs: only order-status logs get order details
    const authHeader = req.headers.authorization;
    const hydratedLogs = await Promise.all(logs.map(async (log) => {
      const logObj = log.toObject();

      // For product-type logs, no hydration needed
      if (log.type === 'product') {
        return logObj;
      }

      // For status-type logs, hydrate with order details from order-service
      let orderDetails = null;
      const match = log.subject.match(/Order #([a-f0-9]{24})/i) || log.subject.match(/Order #([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        try {
          const { data } = await axios.get(`${ORDER_SERVICE_URL}/orders/${match[1]}`, {
            headers: { Authorization: authHeader },
            timeout: 3000
          });
          orderDetails = data.order;
        } catch (err) {
          console.warn(`[Hydration Warning] Could not fetch order ${match[1]}: ${err.response?.status} ${err.message}`);
        }
      } else {
        console.warn(`[Hydration Warning] Could not extract orderId from subject: "${log.subject}"`);
      }
      return { ...logObj, orderDetails };
    }));

    const total = await Notification.countDocuments(logFilter);

    res.status(200).json({
      logs: hydratedLogs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
