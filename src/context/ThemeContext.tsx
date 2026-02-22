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
    primary: '#6FA85C',
    primaryLight: '#E4F0DF',
    primaryDark: '#558A42',
    background: '#F5F7F4',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#2D3A2E',
    textSecondary: '#6B7C6B',
    textInverse: '#FFFFFF',
    border: '#DDE5DA',
    accent: '#82B870',
    danger: '#D9534F',
    success: '#5CA648',
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
    primary: '#82B870',
    primaryLight: '#2B3330',
    primaryDark: '#A0D48E',
    background: '#1A1D1F',
    surface: '#242729',
    card: '#242729',
    text: '#E4E6E3',
    textSecondary: '#8D9290',
    textInverse: '#FFFFFF',
    border: '#383C3E',
    accent: '#96CA84',
    danger: '#E87070',
    success: '#6FB35D',
    warning: '#D4A843',
    inputBackground: '#2C3032',
    tabBar: '#242729',
    tabBarInactive: '#6A6F6D',
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
