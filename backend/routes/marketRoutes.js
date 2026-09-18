import express from 'express';

import {getMarketData} from '../controllers/marketController.js';

const router = express.Router();

router.get('/', getMarketData);

export default router;