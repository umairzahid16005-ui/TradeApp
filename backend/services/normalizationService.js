
const SUPPORTED_SYMBOLS = [
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

export const normalizeMarketData = (marketData) => {
  if (!Array.isArray(marketData)) {
    throw new Error('Market data must be an array');
  }

  return marketData
    .map((item) => ({
      platform: item.platform,
      symbol: String(item.symbol || '').toUpperCase(),
      price: Number(item.price),
      volume: Number(item.volume ?? 0),
      change24h: Number(item.change24h ?? 0),
      recordedAt: item.recordedAt
        ? new Date(item.recordedAt)
        : new Date(),
    }))
    .filter(
      (item) =>
        SUPPORTED_SYMBOLS.includes(item.symbol) &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        Number.isFinite(item.volume) &&
        Number.isFinite(item.change24h),
    );
};