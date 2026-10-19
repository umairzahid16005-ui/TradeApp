import React, {useState} from 'react';

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

import {createPrediction} from '../services/api';

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

function PredictionScreen({route}: any) {
  const token = route.params?.token;

  const [symbol, setSymbol] = useState('BTC');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePrediction = async () => {
    if (!token) {
      Alert.alert('Error', 'Login token not found');
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await createPrediction(token, symbol);

      const predictionData =
        response?.data?.data ?? response?.data;

      if (!predictionData) {
        throw new Error('Invalid prediction response');
      }

      const returnedSignal = String(
        predictionData.signal ?? '',
      ).toUpperCase();

      const validSignal = ['BUY', 'SELL', 'HOLD'].includes(
        returnedSignal,
      );

      if (!validSignal) {
        throw new Error('Invalid prediction signal');
      }

      setResult(predictionData);
    } catch (error: any) {
      Alert.alert(
        'Prediction Error',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to generate prediction',
      );
    } finally {
      setLoading(false);
    }
  };

  const signal = String(
    result?.signal ?? 'HOLD',
  ).toUpperCase();

  const signalStyle =
    signal === 'BUY'
      ? styles.positive
      : signal === 'SELL'
      ? styles.negative
      : styles.neutral;

  const confidence =
    result?.confidence == null
      ? '--'
      : `${Number(result.confidence).toFixed(1)}%`;

  const predictedChange = Number(
    result?.predictedChangePct,
  );

  const hasPredictedChange =
    result?.predictedChangePct != null &&
    Number.isFinite(predictedChange);

  const change24h =
    result?.change24h != null
      ? Number(result.change24h)
      : null;

  const currentPrice =
    result?.price != null
      ? Number(result.price)
      : null;

  const predictedPrice =
    result?.predictedPrice != null
      ? Number(result.predictedPrice)
      : null;

  const modelUncertainty =
    result?.modelUncertaintyPct != null
      ? Number(result.modelUncertaintyPct)
      : null;

  const directionUp =
    result?.directionProbabilityUp != null
      ? Number(result.directionProbabilityUp)
      : null;

  const directionDown =
    result?.directionProbabilityDown != null
      ? Number(result.directionProbabilityDown)
      : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>

        <Text style={styles.title}>
          Market Prediction
        </Text>

        <Text style={styles.subtitle}>
          Select a cryptocurrency
        </Text>

        {/* SYMBOLS */}
        <View style={styles.symbolGrid}>
          {SUPPORTED_SYMBOLS.map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.symbolButton,
                symbol === item && styles.selectedButton,
              ]}
              onPress={() => {
                setSymbol(item);
                setResult(null);
              }}
              disabled={loading}>

              <Text
                style={[
                  styles.symbolText,
                  symbol === item && styles.selectedText,
                ]}>
                {item}
              </Text>

            </TouchableOpacity>
          ))}
        </View>

        {/* GENERATE BUTTON */}
        <TouchableOpacity
          style={[
            styles.predictButton,
            loading && styles.disabledButton,
          ]}
          onPress={handlePrediction}
          disabled={loading}>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#0B0B0B" />

              <Text style={styles.loadingText}>
                ANALYZING MARKET...
              </Text>
            </View>
          ) : (
            <Text style={styles.predictText}>
              GENERATE {symbol} PREDICTION
            </Text>
          )}

        </TouchableOpacity>

        {/* RESULT */}
        {result && (
          <View style={styles.resultCard}>

            {/* SYMBOL */}
            <Text style={styles.resultSymbol}>
              {result.symbol || symbol}
            </Text>

            {/* SIGNAL */}
            <Text
              style={[
                styles.prediction,
                signalStyle,
              ]}>
              {signal}
            </Text>

            <Text style={styles.horizon}>
              Forecast horizon:{' '}
              {result.horizonHours ?? 6} hours
            </Text>

            {/* CONFIDENCE + RISK */}
            <View style={styles.details}>

              <View style={styles.detailItem}>
                <Text style={styles.label}>
                  CONFIDENCE
                </Text>

                <Text style={styles.value}>
                  {confidence}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.label}>
                  RISK
                </Text>

                <Text
                  style={[
                    styles.value,
                    result.riskLevel === 'HIGH'
                      ? styles.highRisk
                      : result.riskLevel === 'LOW'
                      ? styles.lowRisk
                      : styles.mediumRisk,
                  ]}>
                  {result.riskLevel || '--'}
                </Text>
              </View>

            </View>

            {/* CURRENT PRICE */}
            <Text style={styles.label}>
              CURRENT PRICE
            </Text>

            <Text style={styles.price}>
              {currentPrice != null &&
              Number.isFinite(currentPrice)
                ? `$${currentPrice.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 8,
                    },
                  )}`
                : '--'}
            </Text>

            {/* PREDICTED PRICE */}
            <Text style={styles.label}>
              PREDICTED PRICE
            </Text>

            <Text style={styles.price}>
              {predictedPrice != null &&
              Number.isFinite(predictedPrice)
                ? `$${predictedPrice.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 8,
                    },
                  )}`
                : '--'}
            </Text>

            {/* PREDICTED CHANGE */}
            <Text
              style={[
                styles.change,
                hasPredictedChange &&
                  predictedChange > 0 &&
                  styles.changePositive,
                hasPredictedChange &&
                  predictedChange < 0 &&
                  styles.changeNegative,
              ]}>

              Predicted Change:{' '}

              {hasPredictedChange
                ? `${
                    predictedChange > 0 ? '+' : ''
                  }${predictedChange.toFixed(4)}%`
                : '--'}

            </Text>

            {/* 24H CHANGE */}
            <Text
              style={[
                styles.change,
                change24h != null &&
                  change24h > 0 &&
                  styles.changePositive,
                change24h != null &&
                  change24h < 0 &&
                  styles.changeNegative,
              ]}>

              24h Change:{' '}

              {change24h != null &&
              Number.isFinite(change24h)
                ? `${
                    change24h > 0 ? '+' : ''
                  }${change24h.toFixed(2)}%`
                : '--'}

            </Text>

            {/* DIRECTION PROBABILITIES */}
            {(directionUp != null ||
              directionDown != null) && (
              <View style={styles.probabilityBox}>

                <Text style={styles.sectionTitle}>
                  MARKET DIRECTION
                </Text>

                <View style={styles.probabilityRow}>

                  <Text style={styles.probabilityLabel}>
                    UP
                  </Text>

                  <Text style={styles.probabilityValue}>
                    {directionUp != null
                      ? `${directionUp.toFixed(2)}%`
                      : '--'}
                  </Text>

                </View>

                <View style={styles.probabilityRow}>

                  <Text style={styles.probabilityLabel}>
                    DOWN
                  </Text>

                  <Text style={styles.probabilityValue}>
                    {directionDown != null
                      ? `${directionDown.toFixed(2)}%`
                      : '--'}
                  </Text>

                </View>

              </View>
            )}

            {/* MODEL */}
            <Text style={styles.change}>
              Model:{' '}
              {result.model ||
                'RandomForestRegressor+BinaryClassifier'}
            </Text>

            {/* MODEL UNCERTAINTY */}
            <Text style={styles.change}>
              Model Uncertainty:{' '}

              {modelUncertainty != null &&
              Number.isFinite(modelUncertainty)
                ? `${modelUncertainty.toFixed(4)}%`
                : '--'}
            </Text>

            {/* PLATFORMS */}
            <Text style={styles.platforms}>
              Platforms Compared:{' '}
              {result.platformsCompared ?? '--'}
            </Text>

            {/* DISCLAIMER */}
            <Text style={styles.note}>
              Predictions are estimates based on
              historical market data and model
              analysis. They are not guaranteed
              results or financial advice.
            </Text>

          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    color: '#F5C518',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 20,
  },

  subtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 25,
  },

  symbolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },

  symbolButton: {
    width: '31.5%',
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedButton: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },

  symbolText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  selectedText: {
    color: '#0B0B0B',
  },

  predictButton: {
    height: 52,
    backgroundColor: '#F5C518',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  disabledButton: {
    opacity: 0.6,
  },

  predictText: {
    color: '#0B0B0B',
    fontSize: 13,
    fontWeight: '900',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: '#0B0B0B',
    fontSize: 12,
    fontWeight: '900',
  },

  resultCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 20,
    marginTop: 25,
  },

  resultSymbol: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  prediction: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },

  positive: {
    color: '#35D07F',
  },

  negative: {
    color: '#FF5C5C',
  },

  neutral: {
    color: '#F5C518',
  },

  horizon: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },

  details: {
    flexDirection: 'row',
    gap: 50,
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },

  detailItem: {
    minWidth: 75,
  },

  label: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 14,
  },

  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },

  highRisk: {
    color: '#FF5C5C',
  },

  mediumRisk: {
    color: '#F5C518',
  },

  lowRisk: {
    color: '#35D07F',
  },

  price: {
    color: '#F5C518',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },

  change: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },

  changePositive: {
    color: '#35D07F',
  },

  changeNegative: {
    color: '#FF5C5C',
  },

  probabilityBox: {
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },

  sectionTitle: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 10,
  },

  probabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  probabilityLabel: {
    color: '#888',
    fontSize: 12,
  },

  probabilityValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  platforms: {
    color: '#666',
    fontSize: 11,
    marginTop: 12,
  },

  note: {
    color: '#777',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 16,
  },
});

export default PredictionScreen;