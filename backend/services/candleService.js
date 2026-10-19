const CRYPTO_COM_CANDLE_API =
  'https://api.crypto.com/exchange/v1/public/get-candlestick';

const KRAKEN_OHLC_API =
  'https://api.kraken.com/0/public/OHLC';

const BINANCE_CANDLE_API =
  'https://data-api.binance.vision/api/v3/klines';

const cryptoComInstruments = [
  'BTC_USD',
  'ETH_USD',
  'SOL_USD',
];

const krakenPairs = [
  'XBTUSD',
  'ETHUSD',
  'SOLUSD',
];

const symbolMap = {
  XBTUSD: 'BTC',
  ETHUSD: 'ETH',
  SOLUSD: 'SOL',
};

const binanceSymbols = [
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

const TIMEFRAME = '5m';

export const fetchCryptoComCandles = async () => {
  const results = [];

  for (const instrument of cryptoComInstruments) {
    try {
      const url =
        `${CRYPTO_COM_CANDLE_API}` +
        `?instrument_name=${encodeURIComponent(instrument)}` +
        `&timeframe=${TIMEFRAME}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.message || 'Crypto.com API error');
      }

      for (const candle of result.result?.data || []) {
        results.push({
          platform: 'crypto.com',
          symbol: instrument.split('_')[0],
          timeframe: TIMEFRAME,
          open: Number(candle.o),
          high: Number(candle.h),
          low: Number(candle.l),
          close: Number(candle.c),
          volume: Number(candle.v),
          candleTime: new Date(Number(candle.t)),
        });
      }
    } catch (error) {
      console.error(
        `Crypto.com ${instrument} candle error:`,
        error.message,
      );
    }
  }

  return results;
};

export const fetchKrakenCandles = async () => {
  const results = [];

  for (const pair of krakenPairs) {
    try {
      const url =
        `${KRAKEN_OHLC_API}` +
        `?pair=${encodeURIComponent(pair)}` +
        '&interval=5';

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.error?.length) {
        throw new Error(result.error.join(', '));
      }

      const tickerKey = Object.keys(result.result || {}).find(
        (key) => key !== 'last',
      );

      const candles = tickerKey ? result.result[tickerKey] : [];

      for (const candle of candles) {
        results.push({
          platform: 'kraken',
          symbol: symbolMap[pair],
          timeframe: TIMEFRAME,
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          volume: Number(candle[6]),
          candleTime: new Date(Number(candle[0]) * 1000),
        });
      }
    } catch (error) {
      console.error(
        `Kraken ${pair} candle error:`,
        error.message,
      );
    }
  }

  return results;
};

export const fetchBinanceCandles = async () => {
  const results = [];

  const responses = await Promise.allSettled(
    binanceSymbols.map(async (symbol) => {
      const url =
        `${BINANCE_CANDLE_API}` +
        `?symbol=${symbol}&interval=5m&limit=500`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${symbol}`);
      }

      const candles = await response.json();

      if (!Array.isArray(candles)) {
        throw new Error(`Invalid candle response for ${symbol}`);
      }

      return candles.map((candle) => ({
        platform: 'binance',
        symbol: symbol.replace('USDT', ''),
        timeframe: TIMEFRAME,
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
        candleTime: new Date(Number(candle[0])),
      }));
    }),
  );

  responses.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    } else {
      console.error(
        `Binance ${binanceSymbols[index]} candle error:`,
        result.reason?.message || result.reason,
      );
    }
  });

  return results;
};

export const fetchAllCandles = async () => {
  const services = [
    fetchCryptoComCandles,
    fetchKrakenCandles,
    fetchBinanceCandles,
  ];

  const results = await Promise.allSettled(
    services.map((service) => service()),
  );

  const allCandles = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allCandles.push(...result.value);
    } else {
      console.error(
        `Candle provider ${index + 1} failed:`,
        result.reason?.message || result.reason,
      );
    }
  });

  if (!allCandles.length) {
    throw new Error('No candle data available from any platform');
  }

  return allCandles;
};