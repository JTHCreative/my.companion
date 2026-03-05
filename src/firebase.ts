import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from '@firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: Platform.select({
    ios: 'AIzaSyCialDOvd5AHXmqHIQhhYgkGWGD9nM8Xhk',
    default: 'AIzaSyBbpqd54URJc5CmG5W-xFI0bU_T3f9tztE',
  }),
  authDomain: 'petfolio-3806c.firebaseapp.com',
  projectId: 'petfolio-3806c',
  storageBucket: 'petfolio-3806c.firebasestorage.app',
  messagingSenderId: '862637928628',
  appId: Platform.select({
    ios: '1:862637928628:ios:dc8d8749cc727e423be7e1',
    default: '1:862637928628:android:30048af8d29bb75e3be7e1',
  }),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Native Firestore SDK — offline persistence is enabled by default
export const db = firestore();
