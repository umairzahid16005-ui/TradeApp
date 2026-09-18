export const getMarketData = (req, res) => {
  const marketData = [
    {
      symbol: 'BTC',
      price: 104800,
      change24h: 3.2,
      volume: 24500,
    },
    {
      symbol: 'ETH',
      price: 3500,
      change24h: 1.8,
      volume: 18200,
    },
    {
      symbol: 'SOL',
      price: 145,
      change24h: -0.7,
      volume: 9600,
    },
  ];

  res.json({
    success: true,
    data: marketData,
  });
};