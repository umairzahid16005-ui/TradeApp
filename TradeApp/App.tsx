import React from 'react';
import { StyleSheet } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import PredictionScreen from './screens/PredictionScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import PaymentScreen from './screens/PaymentScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: styles.header,
          headerTintColor: '#FFFFFF',
          headerTitleStyle: styles.headerTitle,
          contentStyle: styles.content,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Create Account' }}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'TradeApp' }}
        />

        <Stack.Screen
          name="Prediction"
          component={PredictionScreen}
          options={{ title: 'AI Predictions' }}
        />

        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'Subscription Plans' }}
        />

        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'Payment' }}
        />

        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: 'Admin Dashboard' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0B1120',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    backgroundColor: '#F8FAFC',
  },
});

export default App;