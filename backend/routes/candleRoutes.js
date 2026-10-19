import express from 'express';

import {
  getCandles,
} from '../controllers/candleController.js';

const router = express.Router();

router.get('/:symbol', getCandles);

export default router;