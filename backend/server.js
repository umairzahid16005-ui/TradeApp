import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import marketRoutes from './routes/marketRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);

app.get('/api/test', (req, res) => {
  res.json({
    message: 'TradeApp Backend is working!',
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`TradeApp Backend running on port ${PORT}`);
});