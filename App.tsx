import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlayerStore } from './src/store/player';

const DarkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

export default function App() {
  const init = usePlayerStore((s) => s.init);
  useEffect(() => {
    init();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={DarkTheme}>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
