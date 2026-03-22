require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check Endpoint for AWS ALB
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'notification' });
});

// Routes
app.use('/api/notifications', notificationRoutes);

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 3004;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopease-notifications', { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('Local MongoDB connection failed. Booting In-Memory DB for testing fallback...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log('Connected to In-Memory MongoDB Fallback Instance');
  }
};

// Start the Express server immediately for ALB health checks
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
});

// Boot the database asynchronously in the background
connectDB();
