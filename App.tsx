import React, { useState } from 'react';
import { Text, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { OfflineBanner } from './src/components/OfflineBanner';

// Lock text rendering to our designed sizes so iOS Dynamic Type and Android
// font-scale preferences don't push text larger on one platform than the other.
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = false;

// Apply serif font globally to all Text components
const serifFont = Platform.select({ ios: 'Georgia', default: 'serif' });
// const originalTextRender = (Text as any).render;
// if (originalTextRender) {
//   (Text as any).render = function (props: any, ref: any) {
//     return originalTextRender.call(this, {
//       ...props,
//       style: [{ fontFamily: serifFont }, props.style],
//     }, ref);
//   };
// }

function AppContent() {
  const { isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NetworkProvider>
          <AuthProvider>
            <DataProvider>
              <NotificationProvider>
                <AppNavigator />
                <OfflineBanner />
                <StatusBar style={isDark ? 'light' : 'dark'} />
              </NotificationProvider>
            </DataProvider>
          </AuthProvider>
        </NetworkProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
