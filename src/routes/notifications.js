const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

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

module.exports = router;
