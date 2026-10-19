import {db} from '../src/prisma/db.js';

const Payment = db.orm.public.Payment;
const Subscription = db.orm.public.Subscription;

export const createPayment = async (req, res) => {
  try {
    const {
      amount,
      gateway,
      plan,
    } = req.body;

    if (!amount || !gateway || !plan) {
      return res.status(400).json({
        message: 'Amount, gateway and plan are required',
      });
    }

    const allowedPlans = [
      'BASIC',
      'PRO',
      'PREMIUM',
    ];

    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({
        message: 'Invalid subscription plan',
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Invalid payment amount',
      });
    }

    const userId = req.user.userId;

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: numericAmount,
      currency: 'PKR',
      gateway,
      transactionId: `TEST-${Date.now()}`,
      status: 'SUCCESS',
    });

    const startedAt = new Date();

    const expiresAt = new Date();
    expiresAt.setMonth(
      expiresAt.getMonth() + 1,
    );

    // Check user's existing active subscription
    const existingSubscription =
      await Subscription
        .where({
          userId,
          status: 'ACTIVE',
        })
        .first();

    let subscription;

    if (existingSubscription) {
      // Update existing active subscription
      subscription = await Subscription
        .where({
          id: existingSubscription.id,
        })
        .update({
          plan,
          status: 'ACTIVE',
          startedAt,
          expiresAt,
        });
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        userId,
        plan,
        status: 'ACTIVE',
        startedAt,
        expiresAt,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        'Payment successful and subscription activated',
      data: {
        payment,
        subscription,
      },
    });
  } catch (error) {
    console.error(
      'Payment error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message: 'Payment failed',
    });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const payments = await Payment
      .where({
        userId,
      })
      .all();

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error(
      'Get payments error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to get payments',
    });
  }
};