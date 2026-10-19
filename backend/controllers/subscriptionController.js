import {db} from '../src/prisma/db.js';

const Subscription = db.orm.public.Subscription;

const allowedPlans = [
  'BASIC',
  'PRO',
  'PREMIUM',
];

export const createSubscription = async (req, res) => {
  try {
    const {plan} = req.body;

    if (!plan) {
      return res.status(400).json({
        message: 'Subscription plan is required',
      });
    }

    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({
        message: 'Invalid subscription plan',
      });
    }

    const userId = req.user.userId;

    const startedAt = new Date();

    const expiresAt = new Date();
    expiresAt.setMonth(
      expiresAt.getMonth() + 1,
    );

    const subscription = await Subscription.create({
      userId,
      plan,
      status: 'ACTIVE',
      startedAt,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    console.error('Subscription error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
    });
  }
};

export const getMySubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscription = await Subscription.first({
      userId,
    });

    return res.json({
      success: true,
      data: subscription || null,
    });
  } catch (error) {
    console.error(
      'Get subscription error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to get subscription',
    });
  }
};