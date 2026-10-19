
const KRAKEN_API = 'https://api.kraken.com/0/public/Ticker';

const pairs = ['XBTUSD', 'ETHUSD', 'SOLUSD'];

const symbolMap = {
  XBTUSD: 'BTC',
  ETHUSD: 'ETH',
  SOLUSD: 'SOL',
};

const REQUEST_TIMEOUT = 20000;

export const fetchPlatform2Data = async () => {
  const results = await Promise.allSettled(
    pairs.map(async pair => {
      const response = await fetch(
        `${KRAKEN_API}?pair=${encodeURIComponent(pair)}`,
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT) },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${pair}`);
      }

      const result = await response.json();

      if (result.error?.length) {
        throw new Error(result.error.join(', '));
      }

      const tickerKey = Object.keys(result.result || {})[0];
      const ticker = result.result?.[tickerKey];

      if (!ticker) {
        throw new Error(`No ticker data: ${pair}`);
      }

      const price = Number(ticker.c?.[0]);
      const openingPrice = Number(ticker.o);
      const volume = Number(ticker.v?.[1]);

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid Kraken price: ${pair}`);
      }

      const change24h =
        Number.isFinite(openingPrice) && openingPrice > 0
          ? ((price - openingPrice) / openingPrice) * 100
          : 0;

      return {
        platform: 'kraken',
        symbol: symbolMap[pair],
        price,
        change24h,
        volume: Number.isFinite(volume) ? volume : 0,
        recordedAt: new Date(),
      };
    }),
  );

  const data = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Kraken ${pairs[index]} error:`,
        result.reason?.message || result.reason,
      );
    }
  });

  if (data.length === 0) {
    throw new Error('No Kraken market data available');
  }

  console.log(`Kraken returned ${data.length}/${pairs.length} coins`);

  return data;
};
