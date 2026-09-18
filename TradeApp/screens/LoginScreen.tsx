import React, {useState} from 'react';
import {View, Text, TextInput, Button} from 'react-native';

function LoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Login:', email, password);

    navigation.navigate('Home');
  };

  return (
    <View>
      <Text>TradeApp Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title="Login"
        onPress={handleLogin}
      />

      <Button
        title="Create Account"
        onPress={() => navigation.navigate('Register')}
      />
    </View>
  );
}

export default LoginScreen;