import React, {useState} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';

function SubscriptionScreen({navigation, route}: any) {
  const [selectedPlan, setSelectedPlan] = useState('PRO');

  const token = route.params?.token;

  const plans = [
    {
      name: 'BASIC',
      price: 999,
      description: 'Basic market insights',
      features: [
        'Market data',
        'Basic market analysis',
        'Limited predictions',
      ],
    },
    {
      name: 'PRO',
      price: 1999,
      description: 'Advanced predictions',
      features: [
        'Real-time market data',
        'Advanced predictions',
        'Confidence & risk analysis',
        'Prediction history',
      ],
    },
    {
      name: 'PREMIUM',
      price: 3999,
      description: 'Full market intelligence',
      features: [
        'Full market intelligence',
        'Advanced AI predictions',
        'Detailed risk analysis',
        'Unlimited predictions',
        'Priority access',
      ],
    },
  ];

  const selectedPlanData = plans.find(
    plan => plan.name === selectedPlan,
  );

  const handleSubscribe = () => {
    if (!token) {
      Alert.alert('Error', 'Login token not found');
      return;
    }

    if (!selectedPlanData) {
      Alert.alert('Error', 'Please select a subscription plan.');
      return;
    }

    navigation.navigate('Payment', {
      token,
      plan: selectedPlanData.name,
      amount: selectedPlanData.price,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>SUBSCRIPTION</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Choose Your Plan</Text>

          <Text style={styles.subtitle}>
            Unlock more market intelligence, predictions and advanced
            analysis.
          </Text>
        </View>

        {plans.map(plan => {
          const isSelected = selectedPlan === plan.name;

          return (
            <TouchableOpacity
              key={plan.name}
              activeOpacity={0.85}
              style={[
                styles.planCard,
                isSelected && styles.selectedCard,
              ]}
              onPress={() => setSelectedPlan(plan.name)}>

              <View style={styles.planTop}>
                <View style={styles.planTitleArea}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>
                      {plan.name}
                    </Text>

                    {plan.name === 'PRO' && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>
                          POPULAR
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.description}>
                    {plan.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    isSelected && styles.radioSelected,
                  ]}>
                  {isSelected && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>

              <View style={styles.priceSection}>
                <Text style={styles.currency}>PKR</Text>

                <Text style={styles.price}>
                  {plan.price.toLocaleString()}
                </Text>

                <Text style={styles.perMonth}>/ month</Text>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View
                    key={`${plan.name}-feature-${index}`}
                    style={styles.featureRow}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>

                    <Text style={styles.featureText}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {selectedPlanData && (
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>
                SELECTED PLAN
              </Text>

              <Text style={styles.summaryPlan}>
                {selectedPlanData.name}
              </Text>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.summaryAmount}>
                PKR {selectedPlanData.price.toLocaleString()}
              </Text>

              <Text style={styles.summaryPeriod}>
                / month
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.subscribeButton}
          onPress={handleSubscribe}>

          <Text style={styles.subscribeText}>
            CONTINUE TO PAYMENT
          </Text>

          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.securityContainer}>
          <Text style={styles.securityIcon}>🔒</Text>

          <Text style={styles.note}>
            Secure payment will be processed on the next step.
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          You can manage your subscription from your TradeApp account.
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
    marginBottom: 25,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  subtitle: {
    color: '#777',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  planCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 17,
    padding: 18,
    marginBottom: 14,
  },

  selectedCard: {
    borderColor: '#F5C518',
    backgroundColor: '#17160F',
  },

  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  planTitleArea: {
    flex: 1,
    paddingRight: 10,
  },

  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  planName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  popularBadge: {
    backgroundColor: '#F5C518',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },

  popularText: {
    color: '#0B0B0B',
    fontSize: 7,
    fontWeight: '900',
  },

  description: {
    color: '#777',
    fontSize: 11,
    marginTop: 5,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioSelected: {
    borderColor: '#F5C518',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F5C518',
  },

  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
  },

  currency: {
    color: '#777',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 5,
  },

  price: {
    color: '#F5C518',
    fontSize: 27,
    fontWeight: '900',
  },

  perMonth: {
    color: '#666',
    fontSize: 10,
    marginLeft: 5,
  },

  featuresContainer: {
    marginTop: 15,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#26230F',
    borderWidth: 1,
    borderColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },

  checkText: {
    color: '#F5C518',
    fontSize: 10,
    fontWeight: '900',
  },

  featureText: {
    color: '#AAAAAA',
    fontSize: 11,
    flex: 1,
  },

  summaryCard: {
    backgroundColor: '#151515',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#292929',
    padding: 16,
    marginTop: 5,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryLabel: {
    color: '#666',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  summaryPlan: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },

  summaryRight: {
    alignItems: 'flex-end',
  },

  summaryAmount: {
    color: '#F5C518',
    fontSize: 15,
    fontWeight: '900',
  },

  summaryPeriod: {
    color: '#666',
    fontSize: 9,
    marginTop: 2,
  },

  subscribeButton: {
    height: 54,
    backgroundColor: '#F5C518',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 5,
  },

  subscribeText: {
    color: '#0B0B0B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  arrow: {
    color: '#0B0B0B',
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 10,
  },

  securityContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  securityIcon: {
    fontSize: 11,
    marginRight: 5,
  },

  note: {
    color: '#666',
    textAlign: 'center',
    fontSize: 10,
  },

  disclaimer: {
    color: '#444',
    textAlign: 'center',
    fontSize: 9,
    marginTop: 10,
    lineHeight: 14,
  },
});

export default SubscriptionScreen;