import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TourProvider, useTour } from './src/context/TourContext';
import { ActivationScreen } from './src/screens/ActivationScreen';
import { TourMapScreen } from './src/screens/TourMapScreen';

const RootNavigator: React.FC = () => {
  const { booking } = useTour();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {booking ? <TourMapScreen /> : <ActivationScreen />}
    </View>
  );
};

export default function App() {
  return (
    <TourProvider>
      <RootNavigator />
    </TourProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
});
