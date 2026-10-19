import {db} from '../src/prisma/db.js';

const MarketData = db.orm.public.MarketData;
const Prediction = db.orm.public.Prediction;
const Subscription = db.orm.public.Subscription;

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Latest market data
    const marketData = await MarketData
      .all();

    // User's predictions
    const predictions = await Prediction
      .where({
        userId,
      })
      .all();

    // User's subscription
    const subscription = await Subscription.first({
      userId,
    });

    return res.json({
      success: true,
      data: {
        marketData,
        predictions,
        subscription: subscription || null,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
    });
  }
};