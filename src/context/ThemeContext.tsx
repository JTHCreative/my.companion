import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    textInverse: string;
    border: string;
    accent: string;
    danger: string;
    success: string;
    warning: string;
    inputBackground: string;
    tabBar: string;
    tabBarInactive: string;
    shadow: string;
    overlay: string;
  };
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#8DB580',
    primaryLight: '#E8F0E4',
    primaryDark: '#6B9A5B',
    background: '#F5F7F4',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#2D3A2E',
    textSecondary: '#6B7C6B',
    textInverse: '#FFFFFF',
    border: '#DDE5DA',
    accent: '#9FC490',
    danger: '#D9534F',
    success: '#7BB369',
    warning: '#D4A843',
    inputBackground: '#F8FAF7',
    tabBar: '#FFFFFF',
    tabBarInactive: '#9CA89C',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.5)',
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#9FC490',
    primaryLight: '#2A3A28',
    primaryDark: '#B5D4A8',
    background: '#1A1F1A',
    surface: '#252B25',
    card: '#252B25',
    text: '#E2E8E0',
    textSecondary: '#8A9A88',
    textInverse: '#FFFFFF',
    border: '#3A4A38',
    accent: '#B0D1A2',
    danger: '#E87070',
    success: '#7BB369',
    warning: '#D4A843',
    inputBackground: '#2F382E',
    tabBar: '#252B25',
    tabBarInactive: '#667664',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem('theme_preference').then((value) => {
      if (value !== null) {
        setIsDark(value === 'dark');
      }
    });
  }, []);

  const toggleTheme = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    AsyncStorage.setItem('theme_preference', newValue ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
