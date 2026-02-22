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
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    textInverse: '#FFFFFF',
    border: '#E2E8F0',
    accent: '#3B82F6',
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    inputBackground: '#F8FAFC',
    tabBar: '#FFFFFF',
    tabBarInactive: '#94A3B8',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.5)',
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#3B82F6',
    primaryLight: '#1E3A5F',
    primaryDark: '#60A5FA',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textInverse: '#FFFFFF',
    border: '#334155',
    accent: '#60A5FA',
    danger: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
    inputBackground: '#334155',
    tabBar: '#1E293B',
    tabBarInactive: '#64748B',
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
