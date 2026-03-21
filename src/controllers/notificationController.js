const emailService = require('../services/emailService');

exports.sendWelcomeEmail = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    await emailService.sendWelcome(email, name);
    res.status(200).json({ message: 'Welcome email sent successfully' });
  } catch (error) {
    next(error);
  }
};

exports.sendOrderPlacedEmail = async (req, res, next) => {
  try {
    const { orderId, userEmail, totalAmount, items, shippingAddress } = req.body;
    await emailService.sendOrderPlaced(orderId, userEmail, totalAmount, items, shippingAddress);
    res.status(200).json({ message: 'Order confirmation email sent' });
  } catch (error) {
    next(error);
  }
};

exports.sendOrderStatusEmail = async (req, res, next) => {
  try {
    const { orderId, userEmail, status } = req.body;
    await emailService.sendOrderStatus(orderId, userEmail, status);
    res.status(200).json({ message: 'Order status email sent' });
  } catch (error) {
    next(error);
  }
};
