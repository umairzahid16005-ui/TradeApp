import React from 'react';
import {View, Text, Button} from 'react-native';

function HomeScreen({navigation}: any) {
  return (
    <View>
      <Text>Welcome to TradeApp</Text>

      <Text>
        Your investment analysis dashboard
      </Text>

      <Button
        title="Logout"
        onPress={() => navigation.navigate('Login')}
      />
    </View>
  );
}

export default HomeScreen;