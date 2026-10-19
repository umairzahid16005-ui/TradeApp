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

import {createPayment} from '../services/api';

function PaymentScreen({navigation, route}: any) {
  const token = route.params?.token;
  const plan = route.params?.plan;
  const amount = route.params?.amount;

  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount || 0);

  const handlePayment = async () => {
    if (!token) {
      Alert.alert('Error', 'Login token not found');
      return;
    }

    if (!plan || numericAmount <= 0) {
      Alert.alert(
        'Error',
        'Invalid subscription details.',
      );
      return;
    }

    try {
      setLoading(true);

      await createPayment(
        token,
        numericAmount,
        'TEST',
        plan,
      );

      Alert.alert(
        'Payment Successful',
        `${plan} subscription is now ACTIVE.`,
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('Home', {
                token,
              }),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Payment Failed',
        error?.message || 'Unable to complete payment',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            PAYMENT
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Complete Payment
          </Text>

          <Text style={styles.subtitle}>
            Review your subscription before continuing.
          </Text>
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            ORDER SUMMARY
          </Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.label}>
                SUBSCRIPTION PLAN
              </Text>

              <Text style={styles.plan}>
                {plan || '--'}
              </Text>
            </View>

            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                MONTHLY
              </Text>
            </View>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              TOTAL AMOUNT
            </Text>

            <Text style={styles.amount}>
              PKR {numericAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            PAYMENT METHOD
          </Text>

          <TouchableOpacity
            style={styles.method}
            activeOpacity={0.8}
            disabled={loading}>

            <View style={styles.methodLeft}>
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>
                  T
                </Text>
              </View>

              <View>
                <Text style={styles.methodText}>
                  TEST PAYMENT
                </Text>

                <Text style={styles.methodSubtext}>
                  Development payment method
                </Text>
              </View>
            </View>

            <View style={styles.selectedCircle}>
              <View style={styles.selectedInner} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={styles.securityCard}>
          <Text style={styles.securityIcon}>
            🔒
          </Text>

          <View style={styles.securityTextContainer}>
            <Text style={styles.securityTitle}>
              Secure Checkout
            </Text>

            <Text style={styles.securityText}>
              Your payment request is securely sent to
              the TradeApp backend.
            </Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.payButton,
            loading && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={loading}>

          {loading ? (
            <>
              <ActivityIndicator
                size="small"
                color="#0B0B0B"
              />

              <Text style={styles.loadingText}>
                PROCESSING...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.payText}>
                PAY PKR {numericAmount.toLocaleString()}
              </Text>

              <Text style={styles.arrow}>
                →
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          This is currently a test payment. A real
          payment gateway will be integrated later.
        </Text>

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
    paddingBottom: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 25,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#292929',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backText: {
    color: '#F5C518',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },

  headerTitle: {
    color: '#F5C518',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  headerSpacer: {
    width: 40,
  },

  titleContainer: {
    marginBottom: 22,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  subtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 7,
  },

  card: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 18,
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#777',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  divider: {
    height: 1,
    backgroundColor: '#292929',
    marginVertical: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
  },

  plan: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
  },

  planBadge: {
    backgroundColor: '#26230F',
    borderWidth: 1,
    borderColor: '#F5C518',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  planBadgeText: {
    color: '#F5C518',
    fontSize: 8,
    fontWeight: '900',
  },

  amountBox: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },

  amountLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
  },

  amount: {
    color: '#F5C518',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },

  method: {
    minHeight: 62,
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: '#F5C518',
    borderRadius: 11,
    marginTop: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  methodIconText: {
    color: '#0B0B0B',
    fontSize: 16,
    fontWeight: '900',
  },

  methodText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  methodSubtext: {
    color: '#666',
    fontSize: 9,
    marginTop: 3,
  },

  selectedCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F5C518',
  },

  securityCard: {
    backgroundColor: '#111111',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#222222',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  securityIcon: {
    fontSize: 18,
    marginRight: 12,
  },

  securityTextContainer: {
    flex: 1,
  },

  securityTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  securityText: {
    color: '#666',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  payButton: {
    height: 54,
    backgroundColor: '#F5C518',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  payButtonDisabled: {
    opacity: 0.7,
  },

  payText: {
    color: '#0B0B0B',
    fontSize: 12,
    fontWeight: '900',
  },

  arrow: {
    color: '#0B0B0B',
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 10,
  },

  loadingText: {
    color: '#0B0B0B',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 8,
  },

  note: {
    color: '#555',
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 14,
    paddingHorizontal: 15,
  },
});

export default PaymentScreen;