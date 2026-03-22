const emailService = require('../services/emailService');
const Notification = require('../models/Notification');

exports.sendWelcomeEmail = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    const { subject, body } = await emailService.generateWelcome(email, name);
    
    const notification = await Notification.create({
      recipientEmail: email,
      type: 'welcome',
      subject,
      body
    });

    res.status(200).json({ message: 'Welcome email sent and logged', notification });
  } catch (error) {
    next(error);
  }
};

exports.sendOrderPlacedEmail = async (req, res, next) => {
  try {
    const { orderId, userEmail, totalAmount, items, shippingAddress } = req.body;
    const { subject, body } = await emailService.generateOrderPlaced(orderId, userEmail, totalAmount, items, shippingAddress);
    
    const notification = await Notification.create({
      recipientEmail: userEmail,
      type: 'order',
      subject,
      body
    });

    res.status(200).json({ message: 'Order confirmation sent and logged', notification });
  } catch (error) {
    next(error);
  }
};

exports.sendOrderStatusEmail = async (req, res, next) => {
  try {
    const { orderId, userEmail, status } = req.body;
    const { subject, body } = await emailService.generateOrderStatus(orderId, userEmail, status);
    
    const notification = await Notification.create({
      recipientEmail: userEmail,
      type: 'status',
      subject,
      body
    });

    res.status(200).json({ message: 'Order status sent and logged', notification });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationHistory = async (req, res, next) => {
  try {
    const email = req.user.email;
    const history = await Notification.find({ recipientEmail: email }).sort({ createdAt: -1 });

    // Strict two-way cache busting to prevent 304 Not Modified responses
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.status(200).json({ notifications: history });
  } catch (error) {
    next(error);
  }
};
