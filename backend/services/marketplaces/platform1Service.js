
const CRYPTO_COM_API =
  'https://api.crypto.com/exchange/v1/public/get-tickers';

const instruments = ['BTC_USD', 'ETH_USD', 'SOL_USD'];
const REQUEST_TIMEOUT = 20000;

export const fetchPlatform1Data = async () => {
  const results = await Promise.allSettled(
    instruments.map(async instrument => {
      const response = await fetch(
        `${CRYPTO_COM_API}?instrument_name=${encodeURIComponent(instrument)}`,
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT) },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${instrument}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(
          result.message || `Crypto.com API error: ${instrument}`,
        );
      }

      const item = result.result?.data?.[0];

      if (!item) {
        throw new Error(`No ticker data: ${instrument}`);
      }

      const price = Number(item.a);
      const change24h = Number(item.c) * 100;
      const volume = Number(item.v);

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid price: ${instrument}`);
      }

      return {
        platform: 'crypto.com',
        symbol: instrument.split('_')[0],
        price,
        change24h: Number.isFinite(change24h) ? change24h : 0,
        volume: Number.isFinite(volume) ? volume : 0,
        recordedAt: item.t ? new Date(Number(item.t)) : new Date(),
      };
    }),
  );

  const data = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Crypto.com ${instruments[index]} error:`,
        result.reason?.message || result.reason,
      );
    }
  });

  if (data.length === 0) {
    throw new Error('No Crypto.com market data available');
  }

  console.log(`Crypto.com returned ${data.length}/${instruments.length} coins`);

  return data;
};
