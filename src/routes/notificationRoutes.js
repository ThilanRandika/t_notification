const express = require('express');
const { sendWelcomeEmail, sendOrderPlacedEmail, sendOrderStatusEmail, getNotificationHistory } = require('../controllers/notificationController');
const { validateWelcome, validateOrderPlaced, validateOrderStatus } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/notifications/welcome:
 *   post:
 *     summary: Send a welcome email to a new user
 *     tags: [Notifications]
 */
router.post('/welcome', validateWelcome, sendWelcomeEmail);

/**
 * @swagger
 * /api/notifications/order-placed:
 *   post:
 *     summary: Send an order confirmation email
 *     tags: [Notifications]
 */
router.post('/order-placed', validateOrderPlaced, sendOrderPlacedEmail);

/**
 * @swagger
 * /api/notifications/order-status:
 *   post:
 *     summary: Send an order status update email
 *     tags: [Notifications]
 */
router.post('/order-status', validateOrderStatus, sendOrderStatusEmail);

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
router.get('/my-history', authenticate, getNotificationHistory);

module.exports = router;
