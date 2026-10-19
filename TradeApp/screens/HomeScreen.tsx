import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  getDashboard,
  getMarketData,
  getMyPredictions,
  getCandles,
} from '../services/api';
type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};
type MarketItem = {
  symbol: string;
  price: number | string;
  change24h: number | string;
  volume: number | string;
  trend: string;
  platform?: string;
};
type CandlestickChartViewProps = {
  candles: Candle[];
};
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
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toFixed(3);
  }
  return price.toFixed(5);
}
function CandlestickChartView({
  candles,
}: CandlestickChartViewProps) {
  const visibleCandles = candles.slice(-60);
  if (visibleCandles.length === 0) {
    return (
      <View style={styles.chartLoading}>
        <Text style={styles.chartLoadingText}>
          No candle data available
        </Text>
      </View>
    );
  }
  const allPrices = visibleCandles.flatMap((candle: Candle) => [
    candle.high,
    candle.low,
  ]);
  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  const chartHeight = 270;
  const candleWidth = 9;
  const candleGap = 7;
  const chartWidth =
    visibleCandles.length * (candleWidth + candleGap) + 30;
  const chartPadding = 18;
  const priceToY = (price: number) =>
    chartPadding +
    ((maxPrice - price) / priceRange) *
      (chartHeight - chartPadding * 2);
  const latestCandle = visibleCandles[visibleCandles.length - 1];
  return (
    <View>
      <View style={styles.chartMainArea}>
        <View style={styles.priceLabels}>
          <Text style={styles.priceLabel}>
            {formatPrice(maxPrice)}
          </Text>
          <Text style={styles.priceLabel}>
            {formatPrice(minPrice + priceRange * 0.75)}
          </Text>
          <Text style={styles.priceLabel}>
            {formatPrice(minPrice + priceRange * 0.5)}
          </Text>
          <Text style={styles.priceLabel}>
            {formatPrice(minPrice + priceRange * 0.25)}
          </Text>
          <Text style={styles.priceLabel}>
            {formatPrice(minPrice)}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{width: chartWidth}}>
          <View
            style={[
              styles.candleArea,
              {width: chartWidth, height: chartHeight},
            ]}>
            <View style={[styles.gridLine, {top: 0}]} />
            <View
              style={[
                styles.gridLine,
                {top: chartHeight * 0.25},
              ]}
            />
            <View
              style={[
                styles.gridLine,
                {top: chartHeight * 0.5},
              ]}
            />
            <View
              style={[
                styles.gridLine,
                {top: chartHeight * 0.75},
              ]}
            />
            <View
              style={[
                styles.gridLine,
                {top: chartHeight - 1},
              ]}
            />
            {visibleCandles.map((candle: Candle, index: number) => {
              const highY = priceToY(candle.high);
              const lowY = priceToY(candle.low);
              const openY = priceToY(candle.open);
              const closeY = priceToY(candle.close);
              const bodyTop = Math.min(openY, closeY);
              const bodyBottom = Math.max(openY, closeY);
              const bodyHeight = Math.max(bodyBottom - bodyTop, 2);
              const isBullish = candle.close >= candle.open;
              const candleColor = isBullish
                ? '#35D07F'
                : '#FF5C5C';
              const left = 15 + index * (candleWidth + candleGap);
              return (
                <View
                  key={`${candle.timestamp}-${index}`}
                  style={[
                    styles.singleCandle,
                    {left, height: chartHeight},
                  ]}>
                  <View
                    style={[
                      styles.candleWick,
                      {
                        backgroundColor: candleColor,
                        top: highY,
                        height: Math.max(lowY - highY, 1),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.candleBody,
                      {
                        backgroundColor: candleColor,
                        top: bodyTop,
                        height: bodyHeight,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <View style={styles.ohlcRow}>
        <View>
          <Text style={styles.ohlcLabel}>OPEN</Text>
          <Text style={styles.ohlcValue}>
            ${formatPrice(latestCandle.open)}
          </Text>
        </View>
        <View>
          <Text style={styles.ohlcLabel}>HIGH</Text>
          <Text style={styles.ohlcValue}>
            ${formatPrice(latestCandle.high)}
          </Text>
        </View>
        <View>
          <Text style={styles.ohlcLabel}>LOW</Text>
          <Text style={styles.ohlcValue}>
            ${formatPrice(latestCandle.low)}
          </Text>
        </View>
        <View>
          <Text style={styles.ohlcLabel}>CLOSE</Text>
          <Text
            style={[
              styles.ohlcValue,
              latestCandle.close >= latestCandle.open
                ? styles.positive
                : styles.negative,
            ]}>
            ${formatPrice(latestCandle.close)}
          </Text>
        </View>
      </View>
    </View>
  );
}
function HomeScreen({navigation, route}: any) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [loading, setLoading] = useState(true);
  const [candleLoading, setCandleLoading] = useState(false);
  const token = route.params?.token;
  const user = route.params?.user;
  // Keep only one market entry per coin.
  // The exchange/source is intentionally hidden from the UI.
  const uniqueMarketData: MarketItem[] = Array.from(
    new Map(
      marketData
        .filter((item: MarketItem) => Boolean(item.symbol))
        .map((item: MarketItem) => [item.symbol, item]),
    ).values(),
  );
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (!token) {
        Alert.alert('Error', 'Login token not found');
        navigation.navigate('Login');
        return;
      }
      try {
        const [
          dashboardResponse,
          marketResponse,
          predictionResponse,
        ] = await Promise.all([
          getDashboard(token),
          getMarketData(),
          getMyPredictions(token),
        ]);
        if (!active) {
          return;
        }
        setDashboard(dashboardResponse.data);
        setMarketData(
          Array.isArray(marketResponse.data)
            ? marketResponse.data
            : [],
        );
        const predictionList: any[] = Array.isArray(predictionResponse.data)
          ? predictionResponse.data
          : [];
        // Keep only the newest prediction for each coin.
        const latestPredictions = new Map<string, any>();
        predictionList.forEach((item: any) => {
          let rawSymbol = String(item?.symbol || '')
            .toUpperCase()
            .trim()
            .replace(/[^A-Z0-9]/g, '');
          if (rawSymbol.startsWith('XBT')) rawSymbol = 'BTC' + rawSymbol.slice(3);
          const symbol = SUPPORTED_SYMBOLS.find(coin =>
            rawSymbol === coin || rawSymbol === `${coin}USDT` ||
            rawSymbol === `${coin}USDC` || rawSymbol === `${coin}USD`
          );
          if (!symbol) return;
          const normalizedItem = { ...item, symbol };
          const currentTime = new Date(item?.createdAt || 0).getTime();
          const existing = latestPredictions.get(symbol);
          const existingTime = existing ? new Date(existing?.createdAt || 0).getTime() : -1;
          if (!existing || currentTime >= existingTime) {
            latestPredictions.set(symbol, normalizedItem);
          }
        });
        setPredictions(Array.from(latestPredictions.values()));
      } catch (error: any) {
        if (active) {
          Alert.alert(
            'Dashboard Error',
            error?.message || 'Unable to load dashboard',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [token, navigation]);
  useEffect(() => {
    if (!token) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const response = await getMarketData();
        setMarketData(
          Array.isArray(response.data) ? response.data : [],
        );
      } catch {
        console.log('Market refresh failed');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);
  useEffect(() => {
    let active = true;
    const loadCandles = async () => {
      setCandleLoading(true);
      setCandles([]);
      try {
        const response = await getCandles(selectedSymbol);
        const data: any[] = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];
        const mapped: Candle[] = data
          .map((item: any): Candle => ({
            timestamp: new Date(item.candleTime).getTime(),
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
          }))
          .filter(
            (item: Candle) =>
              Number.isFinite(item.timestamp) &&
              Number.isFinite(item.open) &&
              Number.isFinite(item.high) &&
              Number.isFinite(item.low) &&
              Number.isFinite(item.close) &&
              item.high >= item.low,
          )
          .sort(
            (a: Candle, b: Candle) =>
              a.timestamp - b.timestamp,
          );
        // One candle per timestamp. Later duplicate replaces earlier.
        const unique = new Map<number, Candle>();
        mapped.forEach((candle: Candle) => {
          unique.set(candle.timestamp, candle);
        });
        if (active) {
          setCandles(Array.from(unique.values()));
        }
      } catch (error: any) {
        console.log(
          'Candle loading error:',
          error?.message || error,
        );
        if (active) {
          setCandles([]);
        }
      } finally {
        if (active) {
          setCandleLoading(false);
        }
      }
    };
    loadCandles();
    return () => {
      active = false;
    };
  }, [selectedSymbol]);
  const subscriptionStatus =
    dashboard?.subscription?.status || 'INACTIVE';
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.logoSmall}>
          <Text style={styles.logoText}>T</Text>
        </View>
        <ActivityIndicator size="large" color="#F5C518" />
        <Text style={styles.loadingText}>
          Loading market data...
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.smallTitle}>TRADEAPP</Text>
            <Text style={styles.welcome}>
              Welcome{user?.name ? `, ${user.name}` : ''}
            </Text>
          </View>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>T</Text>
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Market Intelligence</Text>
          <Text style={styles.heroText}>
            Real-time market data for crypto analysis.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.predictButton}
          onPress={() =>
            navigation.navigate('Prediction', {token})
          }>
          <Text style={styles.predictButtonText}>
            PREDICT MARKET
          </Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>MARKET CHART</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartSymbol}>
                {selectedSymbol}
              </Text>
              <Text style={styles.chartSubtitle}>
                5 MINUTE CANDLES
              </Text>
            </View>
            <Text style={styles.chartType}>OHLC</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.symbolSelector}
            contentContainerStyle={styles.symbolSelectorContent}>
            {SUPPORTED_SYMBOLS.map((symbol: string) => (
              <TouchableOpacity
                key={symbol}
                style={[
                  styles.symbolButton,
                  selectedSymbol === symbol &&
                    styles.selectedSymbolButton,
                ]}
                onPress={() => setSelectedSymbol(symbol)}>
                <Text
                  style={[
                    styles.symbolButtonText,
                    selectedSymbol === symbol &&
                      styles.selectedSymbolText,
                  ]}>
                  {symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {candleLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="large" color="#F5C518" />
              <Text style={styles.chartLoadingText}>
                Loading {selectedSymbol} candles...
              </Text>
            </View>
          ) : candles.length === 0 ? (
            <View style={styles.chartLoading}>
              <Text style={styles.chartLoadingText}>
                No candle data available for {selectedSymbol}
              </Text>
            </View>
          ) : (
            <View style={styles.chartWrapper}>
              <CandlestickChartView candles={candles} />
            </View>
          )}
          <Text style={styles.chartInfo}>
            🟢 Bullish candle   🔴 Bearish candle
          </Text>
        </View>
        <Text style={styles.sectionTitle}>LIVE MARKET DATA</Text>
        {uniqueMarketData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Market data is currently unavailable.
            </Text>
          </View>
        ) : (
          uniqueMarketData.map((item: MarketItem) => {
            const change = Number(item.change24h);
            const price = Number(item.price);
            const volume = Number(item.volume);
            const trend = String(item.trend || 'NEUTRAL').toUpperCase();
            return (
              <View key={item.symbol} style={styles.marketCard}>
                <View style={styles.marketTop}>
                  <View>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.platform}>LIVE PRICE</Text>
                  </View>
                  <Text style={styles.price}>
                    ${Number.isFinite(price) ? formatPrice(price) : '--'}
                  </Text>
                </View>
                <View style={styles.marketBottom}>
                  <Text
                    style={[
                      styles.change,
                      change >= 0 ? styles.positive : styles.negative,
                    ]}>
                    {Number.isFinite(change)
                      ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
                      : '--'}
                  </Text>
                  <Text style={styles.marketInfo}>
                    Volume: {Number.isFinite(volume)
                      ? volume.toLocaleString()
                      : '--'}
                  </Text>
                  <Text
                    style={[
                      styles.marketInfo,
                      trend === 'BULLISH'
                        ? styles.positive
                        : trend === 'BEARISH'
                        ? styles.negative
                        : styles.neutral,
                    ]}>
                    {trend}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <Text style={styles.sectionTitle}>MY PREDICTIONS</Text>
        {predictions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No predictions generated yet.
            </Text>
          </View>
        ) : (
          predictions.map((item: any, index: number) => (
            <View
              key={`${item.symbol}-${item.id || index}`}
              style={styles.predictionCard}>
              <View style={styles.predictionTop}>
                <View>
                  <Text style={styles.predictionSymbol}>
                    {item.symbol}
                  </Text>
                  <Text style={styles.predictionPrice}>
                    {item.prediction !== null &&
                    item.prediction !== undefined &&
                    item.prediction !== '' &&
                    Number.isFinite(Number(item.prediction))
                      ? `${Number(item.prediction) > 0 ? '+' : ''}${Number(item.prediction).toFixed(2)}% predicted change`
                      : 'Prediction unavailable'}
                  </Text>
                </View>
                <View style={styles.predictionBadge}>
                  <Text style={styles.predictionText}>
                    {['BUY', 'SELL', 'HOLD'].includes(
                      String(item.signal || '').toUpperCase(),
                    )
                      ? String(item.signal).toUpperCase()
                      : 'FORECAST'}
                  </Text>
                </View>
              </View>
              <View style={styles.predictionDetails}>
                <View>
                  <Text style={styles.detailLabel}>CONFIDENCE</Text>
                  <Text style={styles.detailValue}>
                    {item.confidence !== null &&
                    item.confidence !== undefined &&
                    item.confidence !== '' &&
                    Number.isFinite(Number(item.confidence))
                      ? `${Number(item.confidence).toFixed(1)}%`
                      : '--'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>RISK</Text>
                  <Text style={styles.detailValue}>
                    {item.riskLevel || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
        <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
        <TouchableOpacity
          style={styles.subscriptionCard}
          onPress={() =>
            navigation.navigate('Subscription', {token})
          }>
          <View>
            <Text style={styles.cardLabel}>CURRENT STATUS</Text>
            <Text style={styles.subscriptionText}>
              {subscriptionStatus}
            </Text>
            <Text style={styles.manageText}>
              TAP TO MANAGE PLAN
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              subscriptionStatus === 'ACTIVE'
                ? styles.activeDot
                : styles.inactiveDot,
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: '#0B0B0B',
    fontSize: 34,
    fontWeight: '900',
  },
  loadingText: {
    color: '#888',
    marginTop: 15,
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  smallTitle: {
    color: '#F5C518',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  welcome: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  headerLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoText: {
    color: '#0B0B0B',
    fontSize: 25,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: '#F5C518',
    borderRadius: 18,
    padding: 22,
    marginBottom: 15,
  },
  heroTitle: {
    color: '#0B0B0B',
    fontSize: 21,
    fontWeight: '900',
  },
  heroText: {
    color: '#272000',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  predictButton: {
    height: 50,
    backgroundColor: '#151515',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  predictButtonText: {
    color: '#F5C518',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#777',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 5,
  },
  chartCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 15,
    marginBottom: 25,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartSymbol: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  chartSubtitle: {
    color: '#777',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  chartType: {
    color: '#F5C518',
    fontSize: 10,
    fontWeight: '900',
  },
  symbolSelector: {
    marginBottom: 10,
    flexGrow: 0,
  },
  symbolSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolButton: {
    width: 62,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: '#303030',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedSymbolButton: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  symbolButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedSymbolText: {
    color: '#0B0B0B',
  },
  chartWrapper: {
    marginTop: 10,
  },
  chartMainArea: {
    flexDirection: 'row',
    width: '100%',
    height: 270,
    backgroundColor: '#0B0B0B',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceLabels: {
    width: 58,
    height: 270,
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingRight: 6,
    alignItems: 'flex-end',
  },
  priceLabel: {
    color: '#666',
    fontSize: 8,
    fontWeight: '700',
  },
  candleArea: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#202020',
  },
  singleCandle: {
    position: 'absolute',
    width: 9,
  },
  candleWick: {
    position: 'absolute',
    left: 4,
    width: 1,
  },
  candleBody: {
    position: 'absolute',
    left: 0,
    width: 9,
    minHeight: 2,
    borderRadius: 1,
  },
  chartLoading: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    color: '#777',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  ohlcRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  ohlcLabel: {
    color: '#666',
    fontSize: 8,
    fontWeight: '800',
  },
  ohlcValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  chartInfo: {
    color: '#666',
    textAlign: 'center',
    fontSize: 9,
    marginTop: 12,
  },
  marketCard: {
    backgroundColor: '#151515',
    borderRadius: 15,
    padding: 17,
    borderWidth: 1,
    borderColor: '#292929',
    marginBottom: 10,
  },
  marketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbol: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  platform: {
    color: '#777',
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  price: {
    color: '#F5C518',
    fontSize: 18,
    fontWeight: '900',
  },
  marketBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    alignItems: 'center',
  },
  change: {
    fontSize: 13,
    fontWeight: '900',
  },
  positive: {
    color: '#35D07F',
  },
  negative: {
    color: '#FF5C5C',
  },
  neutral: {
    color: '#999',
  },
  marketInfo: {
    color: '#777',
    fontSize: 10,
  },
  predictionCard: {
    backgroundColor: '#151515',
    borderRadius: 15,
    padding: 18,
    borderWidth: 1,
    borderColor: '#292929',
    marginBottom: 10,
  },
  predictionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionSymbol: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  predictionPrice: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  predictionBadge: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  predictionText: {
    color: '#0B0B0B',
    fontSize: 12,
    fontWeight: '900',
  },
  predictionDetails: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  detailLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
    marginRight: 50,
  },
  emptyCard: {
    backgroundColor: '#151515',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  emptyText: {
    color: '#777',
    textAlign: 'center',
  },
  subscriptionCard: {
    backgroundColor: '#151515',
    borderRadius: 15,
    padding: 18,
    borderWidth: 1,
    borderColor: '#292929',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  cardLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: '800',
  },
  subscriptionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  manageText: {
    color: '#F5C518',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 5,
  },
  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  activeDot: {
    backgroundColor: '#F5C518',
  },
  inactiveDot: {
    backgroundColor: '#555',
  },
  logoutButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#F5C518',
    fontSize: 13,
    fontWeight: '900',
  },
});
export default HomeScreen;
