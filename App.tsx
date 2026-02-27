import React, { useState } from 'react';
import { Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DataProvider } from './src/context/DataContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';

// Apply serif font globally to all Text components
const serifFont = Platform.select({ ios: 'Georgia', default: 'serif' });
const originalTextRender = (Text as any).render;
if (originalTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    return originalTextRender.call(this, {
      ...props,
      style: [{ fontFamily: serifFont }, props.style],
    }, ref);
  };
}

function AppContent() {
  const { isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DataProvider>
        <AppNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </DataProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
