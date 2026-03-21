const express = require('express');
const { sendWelcomeEmail, sendOrderPlacedEmail, sendOrderStatusEmail } = require('../controllers/notificationController');
const { validateWelcome, validateOrderPlaced, validateOrderStatus } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/notifications/welcome:
 *   post:
 *     summary: Send a welcome email to a new user
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name]
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Welcome email sent successfully
 *       400:
 *         description: Validation error
 */
router.post('/welcome', validateWelcome, sendWelcomeEmail);

/**
 * @swagger
 * /api/notifications/order-placed:
 *   post:
 *     summary: Send an order confirmation email
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, userEmail, totalAmount, items, shippingAddress]
 *             properties:
 *               orderId:
 *                 type: string
 *               userEmail:
 *                 type: string
 *               totalAmount:
 *                 type: number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productName:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *               shippingAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Order confirmation email sent
 *       400:
 *         description: Validation error
 */
router.post('/order-placed', validateOrderPlaced, sendOrderPlacedEmail);

/**
 * @swagger
 * /api/notifications/order-status:
 *   post:
 *     summary: Send an order status update email
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, userEmail, status]
 *             properties:
 *               orderId:
 *                 type: string
 *               userEmail:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status email sent
 *       400:
 *         description: Validation error
 */
router.post('/order-status', validateOrderStatus, sendOrderStatusEmail);

module.exports = router;
