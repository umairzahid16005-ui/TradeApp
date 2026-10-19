import { fetchPlatform1Data } from './marketplaces/platform1Service.js';
import { fetchPlatform2Data } from './marketplaces/platform2Service.js';
import { fetchBinanceData } from './marketplaces/binanceService.js';

export const fetchMarketData = async () => {
  const services = [
    { name: 'Crypto.com', fetch: fetchPlatform1Data },
    { name: 'Kraken', fetch: fetchPlatform2Data },
    { name: 'Binance', fetch: fetchBinanceData },
  ];

  const results = await Promise.allSettled(
    services.map((service) => service.fetch()),
  );

  const allData = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allData.push(...result.value);
    } else {
      console.error(
        `${services[index].name} market service failed:`,
        result.reason?.message || result.reason,
      );
    }
  });

  if (!allData.length) {
    throw new Error('No market data available from any platform');
  }

  return allData;
};