
import { fetchAllCandles } from '../services/candleService.js';

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

const normalizeSymbol = (value) => {
  let symbol = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (symbol.startsWith('XBT')) {
    symbol = `BTC${symbol.slice(3)}`;
  }

  for (const coin of allowedSymbols) {
    if (
      symbol === coin ||
      symbol === `${coin}USDT` ||
      symbol === `${coin}USDC` ||
      symbol === `${coin}USD`
    ) {
      return coin;
    }
  }

  return symbol;
};

export const getCandles = async (req, res) => {
  try {
    const normalizedSymbol = normalizeSymbol(req.params.symbol);

    if (!allowedSymbols.includes(normalizedSymbol)) {
      return res.status(400).json({
        success: false,
        message: `Invalid symbol. Use: ${allowedSymbols.join(', ')}`,
        data: [],
      });
    }

    const allCandles = await fetchAllCandles();

    if (!Array.isArray(allCandles)) {
      throw new Error('Candle service did not return an array.');
    }

    const symbolCandles = allCandles
      .filter((item) => {
        return normalizeSymbol(item?.symbol) === normalizedSymbol;
      })
      .map((item) => ({
        ...item,
        symbol: normalizedSymbol,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume ?? 0),
      }))
      .filter((item) => {
        const timestamp = new Date(item.candleTime).getTime();

        return (
          Number.isFinite(timestamp) &&
          Number.isFinite(item.open) &&
          Number.isFinite(item.high) &&
          Number.isFinite(item.low) &&
          Number.isFinite(item.close)
        );
      })
      .sort(
        (a, b) =>
          new Date(a.candleTime).getTime() -
          new Date(b.candleTime).getTime(),
      );

    // Keep one candle per platform, timeframe and timestamp.
    const uniqueCandles = new Map();

    for (const candle of symbolCandles) {
      const key = [
        candle.platform || 'unknown',
        candle.symbol,
        candle.timeframe || '5m',
        new Date(candle.candleTime).getTime(),
      ].join('_');

      uniqueCandles.set(key, candle);
    }

    const data = Array.from(uniqueCandles.values()).sort(
      (a, b) =>
        new Date(a.candleTime).getTime() -
        new Date(b.candleTime).getTime(),
    );

    return res.status(200).json({
      success: true,
      symbol: normalizedSymbol,
      timeframe: '5m',
      count: data.length,
      data,
      message:
        data.length > 0
          ? 'Candles fetched successfully'
          : `No candle data available for ${normalizedSymbol}`,
    });
  } catch (error) {
    console.error('Candle controller error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch candle data',
      error: error?.message || 'Unknown candle error',
      data: [],
    });
  }
};
