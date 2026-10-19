import { db } from '../src/prisma/db.js';

const User = db.orm.public.User;
const Subscription = db.orm.public.Subscription;
const Payment = db.orm.public.Payment;

// GET ADMIN STATISTICS
export const getAdminStats = async (req, res) => {
  try {
    const users = await User.where({}).all();
    const subscriptions = await Subscription.where({}).all();
    const payments = await Payment.where({}).all();

    return res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalSubscriptions: subscriptions.length,
        totalPayments: payments.length,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
    });
  }
};

// GET ALL USERS
export const getAdminUsers = async (req, res) => {
  try {
    const users = await User.where({}).all();

    return res.json({
      success: true,
      total: users.length,
      users: users.map(({ id, name, email, role, createdAt }) => ({
        id,
        name,
        email,
        role,
        createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin users error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

// GET ALL SUBSCRIPTIONS
export const getAdminSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.where({}).all();

    return res.json({
      success: true,
      total: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
    });
  }
};

// GET ALL PAYMENTS
export const getAdminPayments = async (req, res) => {
  try {
    const payments = await Payment.where({}).all();

    return res.json({
      success: true,
      total: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Admin payments error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
    });
  }
};