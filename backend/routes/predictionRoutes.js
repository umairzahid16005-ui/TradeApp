import express from 'express';

import {
  createPrediction,
  getMyPredictions,
} from '../controllers/predictionController.js';

import {authMiddleware} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createPrediction);
router.get('/my', authMiddleware, getMyPredictions);

export default router;