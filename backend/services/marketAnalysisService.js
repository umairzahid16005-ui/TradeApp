
export const analyzeMarketData = (marketData) => {
  if (!Array.isArray(marketData)) {
    throw new Error('Market data must be an array');
  }

  return marketData.map((item) => {
    const change24h = Number(item.change24h);
    const volume = Number(item.volume);

    let trend = 'NEUTRAL';

    if (change24h > 2) {
      trend = 'BULLISH';
    } else if (change24h < -2) {
      trend = 'BEARISH';
    }

    let volumeLevel = 'LOW';

    if (volume >= 20000) {
      volumeLevel = 'HIGH';
    } else if (volume >= 10000) {
      volumeLevel = 'MEDIUM';
    }

    return {
      platform: item.platform,
      symbol: item.symbol,
      price: item.price,
      change24h,
      volume,
      trend,
      volumeLevel,
    };
  });
};