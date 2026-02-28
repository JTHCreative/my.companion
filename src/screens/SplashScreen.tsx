import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Logo } from '../components/Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in logo
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Fade in title text
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(800),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <Logo size={300} />
      </Animated.View>
      <Animated.View style={[styles.textWrap, { opacity: titleOpacity }]}>
        <Text style={styles.title}>Petfolio</Text>
        <Text style={styles.tagline}>COMPANION APP</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#2D3A2E',
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  tagline: {
    fontSize: 14,
    color: '#6B7C6B',
    letterSpacing: 4,
    marginTop: 6,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
});
