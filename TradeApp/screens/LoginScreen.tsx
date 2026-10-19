import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { loginUser } from '../services/api';

function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser(email.trim(), password);

      if (!response?.token || !response?.user) {
        throw new Error('Invalid login response from server');
      }

      const user = response.user;

      if (user.role === 'ADMIN') {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'AdminDashboard',
              params: {
                token: response.token,
                user,
              },
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Home',
              params: {
                token: response.token,
                user,
              },
            },
          ],
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error?.message || 'Unable to login. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>T</Text>
        </View>

        <Text style={styles.title}>TradeApp</Text>

        <Text style={styles.subtitle}>
          Smart Market Analysis & Predictions
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome Back</Text>

          <Text style={styles.description}>
            Login to access your investment dashboard
          </Text>

          <Text style={styles.label}>EMAIL</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>PASSWORD</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0B0B0B" />
            ) : (
              <Text style={styles.loginText}>LOGIN</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.registerText}>
              CREATE NEW ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Analyze. Predict. Invest Smarter.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0B0B0B',
  },
  title: {
    color: '#F5C518',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#292929',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    color: '#888',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 22,
  },
  label: {
    color: '#F5C518',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    height: 50,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  loginButton: {
    height: 52,
    backgroundColor: '#F5C518',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
  loginText: {
    color: '#0B0B0B',
    fontSize: 14,
    fontWeight: '900',
  },
  registerButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  registerText: {
    color: '#F5C518',
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    color: '#555',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 25,
  },
});

export default LoginScreen;