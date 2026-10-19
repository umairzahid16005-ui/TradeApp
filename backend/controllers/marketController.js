import {db} from '../src/prisma/db.js';
import {fetchMarketData} from '../services/marketService.js';
import {normalizeMarketData} from '../services/normalizationService.js';
import {analyzeMarketData} from '../services/marketAnalysisService.js';

const MarketData = db.orm.public.MarketData;

export const getMarketData = async (req, res) => {
  try {
    const rawMarketData = await fetchMarketData();

    const normalizedData = normalizeMarketData(rawMarketData);

    const analyzedData = analyzeMarketData(normalizedData);

    for (const item of normalizedData) {
      await MarketData.create({
        platform: item.platform,
        symbol: item.symbol,
        price: item.price,
        change24h: item.change24h,
        volume: item.volume,
        recordedAt: item.recordedAt,
      });
    }

    return res.json({
      success: true,
      message: 'Market data fetched, normalized, analyzed and saved',
      data: analyzedData,
    });
  } catch (error) {
    console.error('Market data error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to process market data',
    });
  }
};