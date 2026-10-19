
import { db } from '../src/prisma/db.js';

import { fetchMarketData } from '../services/marketService.js';
import { normalizeMarketData } from '../services/normalizationService.js';
import { analyzeMarketData } from '../services/marketAnalysisService.js';
import { generatePrediction } from '../services/predictionService.js';

const Prediction = db.orm.public.Prediction;

const allowedSymbols = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'TRX',
  'LINK',
];

export const createPrediction = async (req, res) => {
  try {
    const symbol = String(req.body?.symbol || '').toUpperCase().trim();

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required',
      });
    }

    if (!allowedSymbols.includes(symbol)) {
      return res.status(400).json({
        success: false,
        message: `Invalid symbol. Use: ${allowedSymbols.join(', ')}`,
      });
    }

    // Fetch and prepare market data.
    const rawMarketData = await fetchMarketData();
    const normalizedData = normalizeMarketData(rawMarketData);
    const analyzedData = analyzeMarketData(normalizedData);

    const selectedData = analyzedData.filter(
      (item) => String(item.symbol || '').toUpperCase() === symbol
    );

    if (selectedData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Market data not found for ${symbol}.`,
      });
    }

    // Generate prediction using the prediction service.
    const predictions = await generatePrediction(selectedData);

    const result = Array.isArray(predictions)
      ? predictions.find(
          (item) => String(item.symbol || '').toUpperCase() === symbol
        )
      : predictions;

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Unable to generate prediction for ${symbol}`,
      });
    }

    // Validate prediction value.
    const predictionValue =
      result.prediction ?? result.predictedChangePct;

    if (
      predictionValue === null ||
      predictionValue === undefined ||
      !Number.isFinite(Number(predictionValue))
    ) {
      throw new Error('Prediction value is missing or invalid');
    }

    // Validate confidence without treating it as a probability.
    const rawConfidence = result.confidence;

    const confidenceValue =
      rawConfidence === null || rawConfidence === undefined
        ? null
        : Number(rawConfidence);

    if (
      confidenceValue !== null &&
      (!Number.isFinite(confidenceValue) || confidenceValue < 0)
    ) {
      throw new Error('Confidence value is invalid');
    }

    const confidence = confidenceValue ?? 0;

    // Save prediction in the database.
    const savedPrediction = await Prediction.create({
      userId: req.user.userId,
      symbol: result.symbol || symbol,
      prediction: Number(predictionValue),
      confidence,
      riskLevel: result.riskLevel ?? 'UNKNOWN',
    });

    // Return saved data and available ML results.
    return res.status(201).json({
      success: true,
      message: 'Prediction generated successfully',
      data: {
        ...savedPrediction,

        price: result.price ?? result.currentPrice ?? null,
        predictedPrice: result.predictedPrice ?? null,
        predictedChangePct: result.predictedChangePct ?? null,

        signal: result.signal ?? null,
        horizonHours: result.horizonHours ?? 6,
        model: result.model ?? 'RandomForestRegressor',

        modelUncertaintyPct: result.modelUncertaintyPct ?? null,

        confidence,
        confidenceType:
          result.confidenceType ??
          'model_score_not_calibrated_probability',

        directionProbabilityUp:
          result.directionProbabilityUp ?? null,
        directionProbabilityDown:
          result.directionProbabilityDown ?? null,

        riskLevel: result.riskLevel ?? 'UNKNOWN',
        change24h: result.change24h ?? null,
        platformsCompared: result.platformsCompared ?? [],
      },
    });
  } catch (error) {
    console.error('Prediction error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to generate prediction',
      error: error.message,
    });
  }
};

export const getMyPredictions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const predictions = await Prediction.where({
      userId,
    }).all();

    return res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error('Get predictions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get predictions',
      error: error.message,
    });
  }
};
