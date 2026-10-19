
const BINANCE_API =
  'https://data-api.binance.vision/api/v3/ticker/24hr';

const symbols = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'TRXUSDT',
  'LINKUSDT',
];

const REQUEST_TIMEOUT = 20000;

const fetchTicker = async (symbol) => {
  const response = await fetch(
    `${BINANCE_API}?symbol=${symbol}`,
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT) },
  );

  if (!response.ok) {
    throw new Error(`Binance HTTP ${response.status}: ${symbol}`);
  }

  const data = await response.json();

  if (data.code) {
    throw new Error(data.msg || `Binance error: ${symbol}`);
  }

  const price = Number(data.lastPrice);
  const change24h = Number(data.priceChangePercent);
  const volume = Number(data.volume);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid Binance price: ${symbol}`);
  }

  return {
    platform: 'binance',
    symbol: symbol.replace('USDT', ''),
    price,
    change24h: Number.isFinite(change24h) ? change24h : 0,
    volume: Number.isFinite(volume) ? volume : 0,
    recordedAt: new Date(),
  };
};

export const fetchBinanceData = async () => {
  const results = await Promise.allSettled(
    symbols.map(fetchTicker),
  );

  const data = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Binance ${symbols[index]} error:`,
        result.reason?.message || result.reason,
      );
    }
  });

  if (data.length === 0) {
    throw new Error('No Binance market data available');
  }

  console.log(`Binance returned ${data.length}/${symbols.length} coins`);

  return data;
};
