import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import candleRoutes from './routes/candleRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { authMiddleware } from './middleware/authMiddleware.js';

const app = express();

app.use(cors());
app.use(express.json());

// REQUEST LOGGER
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.url}`,
  );

  next();
});

// API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/candles', candleRoutes);
app.use('/api/admin', adminRoutes);

// TEST ROUTE
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'TradeApp Backend is working!',
  });
});

// PROTECTED ROUTE
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Protected API accessed successfully',
    user: req.user,
  });
});

// START SERVER
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`TradeApp Backend running on port ${PORT}`);
});