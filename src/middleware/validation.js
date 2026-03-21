const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

exports.validateWelcome = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  handleValidationErrors,
];

exports.validateOrderPlaced = [
  body('orderId').trim().notEmpty().withMessage('Order ID is required'),
  body('userEmail').isEmail().normalizeEmail().withMessage('Valid user email is required'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('shippingAddress').isObject().withMessage('Shipping address must be an object'),
  handleValidationErrors,
];

exports.validateOrderStatus = [
  body('orderId').trim().notEmpty().withMessage('Order ID is required'),
  body('userEmail').isEmail().normalizeEmail().withMessage('Valid user email is required'),
  body('status').trim().notEmpty().withMessage('Status is required'),
  handleValidationErrors,
];
