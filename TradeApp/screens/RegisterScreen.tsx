import React, {useState} from 'react';

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
} from 'react-native';

import {registerUser} from '../services/api';

function RegisterScreen({navigation}: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    try {
      setLoading(true);

      await registerUser(name, email, password);

      Alert.alert(
        'Success',
        'Account created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'Unable to register',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>T</Text>
        </View>

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Start your smart investment journey
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>
            Join TradeApp
          </Text>

          <Text style={styles.description}>
            Create your account to access market insights
          </Text>

          <Text style={styles.label}>NAME</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>EMAIL</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>PASSWORD</Text>

          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleRegister}
            disabled={loading}>
            <Text style={styles.registerText}>
              {loading
                ? 'CREATING ACCOUNT...'
                : 'CREATE ACCOUNT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() =>
              navigation.navigate('Login')
            }>
            <Text style={styles.loginText}>
              ALREADY HAVE AN ACCOUNT? LOGIN
            </Text>
          </TouchableOpacity>
        </View>
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
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0B0B0B',
  },

  title: {
    color: '#F5C518',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 25,
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
    fontSize: 21,
    fontWeight: '800',
  },

  description: {
    color: '#888',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 18,
  },

  label: {
    color: '#F5C518',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 7,
  },

  input: {
    height: 49,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 7,
  },

  registerButton: {
    height: 52,
    backgroundColor: '#F5C518',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  disabledButton: {
    opacity: 0.6,
  },

  registerText: {
    color: '#0B0B0B',
    fontSize: 13,
    fontWeight: '900',
  },

  loginButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#F5C518',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  loginText: {
    color: '#F5C518',
    fontSize: 11,
    fontWeight: '800',
  },
});

export default RegisterScreen;