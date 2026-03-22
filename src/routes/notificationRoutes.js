const express = require('express');
const { sendWelcomeEmail, sendOrderPlacedEmail, sendOrderStatusEmail, getNotificationHistory } = require('../controllers/notificationController');
const { validateWelcome, validateOrderPlaced, validateOrderStatus } = require('../middleware/validation');

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
 * /api/notifications/{email}:
 *   get:
 *     summary: Get notification history for a specific email
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/:email', getNotificationHistory);

module.exports = router;
