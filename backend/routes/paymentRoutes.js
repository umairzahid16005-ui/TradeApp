import express from 'express';

import {
  createPayment,
  getMyPayments,
} from '../controllers/paymentController.js';

import {authMiddleware} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  createPayment,
);

router.get(
  '/my',
  authMiddleware,
  getMyPayments,
);

export default router;