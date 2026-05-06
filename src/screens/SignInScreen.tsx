import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';

interface SignInScreenProps {
  onGoToSignUp: () => void;
}

export function SignInScreen({ onGoToSignUp }: SignInScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google Sign In Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const trimmed = email.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setErrors((prev) => ({ ...prev, email: 'Enter your email above to reset your password' }));
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a password reset link to ${trimmed}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await sendPasswordReset(trimmed);
              Alert.alert(
                'Check Your Email',
                `If an account exists for ${trimmed}, a password reset link has been sent.`,
              );
            } catch (error: any) {
              let message = 'Could not send reset email. Please try again.';
              if (error.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
              } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many attempts. Please try again later.';
              }
              Alert.alert('Reset Failed', message);
            }
          },
        },
      ],
    );
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      let message = 'Something went wrong. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      }
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 24) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <Logo size={160} color={theme.colors.text} />
          <Text style={[styles.title, { color: theme.colors.text }]}>PetPassport</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            COMPANION APP
          </Text>
        </View>

        <View style={styles.form}>
          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
          />

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordLink}
            disabled={loading || googleLoading || appleLoading}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading || googleLoading || appleLoading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          <Button
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="secondary"
            loading={googleLoading}
            disabled={loading || googleLoading || appleLoading}
            icon={<Ionicons name="logo-google" size={20} color={theme.colors.primary} />}
          />

          {Platform.OS === 'ios' && (
            <Button
              title="Continue with Apple"
              onPress={handleAppleSignIn}
              variant="secondary"
              loading={appleLoading}
              disabled={loading || googleLoading || appleLoading}
              icon={<Ionicons name="logo-apple" size={20} color={theme.colors.primary} />}
              style={{ marginTop: 12 }}
            />
          )}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={onGoToSignUp}>
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 4,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  form: {
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
