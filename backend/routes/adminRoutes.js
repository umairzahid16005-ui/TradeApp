import express from 'express';

import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';

import {
  getAdminStats,
  getAdminUsers,
  getAdminSubscriptions,
  getAdminPayments,
} from '../controllers/adminController.js';

const router = express.Router();

// ADMIN DASHBOARD
router.get(
  '/dashboard',
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    return res.json({
      success: true,
      message: 'Welcome to TradeApp Admin Dashboard',
      admin: req.user,
    });
  },
);

// ADMIN STATISTICS
router.get(
  '/stats',
  authMiddleware,
  adminMiddleware,
  getAdminStats,
);

// ALL USERS
router.get(
  '/users',
  authMiddleware,
  adminMiddleware,
  getAdminUsers,
);

// ALL SUBSCRIPTIONS
router.get(
  '/subscriptions',
  authMiddleware,
  adminMiddleware,
  getAdminSubscriptions,
);

// ALL PAYMENTS
router.get(
  '/payments',
  authMiddleware,
  adminMiddleware,
  getAdminPayments,
);

export default router;