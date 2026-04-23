const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopEase Notification Service API',
      version: '1.0.0',
      description: 'API for sending mock email notifications for ShopEase',
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
