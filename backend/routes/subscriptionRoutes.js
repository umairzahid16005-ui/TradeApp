import express from 'express';

import {
  createSubscription,
  getMySubscription,
} from '../controllers/subscriptionController.js';

import {authMiddleware} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  createSubscription,
);

router.get(
  '/me',
  authMiddleware,
  getMySubscription,
);

export default router;