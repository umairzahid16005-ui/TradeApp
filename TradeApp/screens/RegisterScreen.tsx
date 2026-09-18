import React, {useState} from 'react';
import {View, Text, TextInput, Button} from 'react-native';

function RegisterScreen({navigation}: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    console.log('Register:', name, email, password);

    navigation.navigate('Login');
  };

  return (
    <View>
      <Text>Create TradeApp Account</Text>

      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />

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
        title="Register"
        onPress={handleRegister}
      />

      <Button
        title="Already have an account?"
        onPress={() => navigation.navigate('Login')}
      />
    </View>
  );
}

export default RegisterScreen;