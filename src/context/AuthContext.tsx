import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
  updateProfile,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  User,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  arrayRemove,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  displayName: '',
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  sendPasswordReset: async () => {},
  updateDisplayName: async () => {},
  updateUserEmail: async (_newEmail: string) => {},
  updateUserPassword: async (_newPassword: string) => {},
  deleteAccount: async () => {},
});

const GOOGLE_WEB_CLIENT_ID = '862637928628-b73q3rk3m8i4uj1vtgisfh237hkd0m4k.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '862637928628-i38mpnmpcct1nhpsantece2vihr1abj3.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setDisplayName(firebaseUser?.displayName || '');
      if (initializing) setInitializing(false);

      if (firebaseUser) {
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              email: firebaseUser.email || null,
              displayName: firebaseUser.displayName || null,
              photoURL: firebaseUser.photoURL || null,
              lastLoginAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (error) {
          console.warn('Failed to sync user profile to Firestore:', error);
        }
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogleHandler = async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In failed: no ID token returned.');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  };

  const signInWithAppleHandler = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS.');
    }
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sign in with Apple is not available on this device.');
    }

    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!appleCredential.identityToken) {
      throw new Error('Apple Sign-In failed: no identity token returned.');
    }

    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });
    const result = await signInWithCredential(auth, credential);

    // Apple only sends fullName on first sign-in; persist it as displayName.
    const fullName = appleCredential.fullName;
    const composedName = [fullName?.givenName, fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (composedName && !result.user.displayName) {
      await updateProfile(result.user, { displayName: composedName });
      setDisplayName(composedName);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(credential.user, { displayName: name });
      setDisplayName(name);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateDisplayName = async (name: string) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updateProfile(auth.currentUser, { displayName: name });
    setDisplayName(name);
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updateEmail(auth.currentUser, newEmail);
  };

  const updateUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updatePassword(auth.currentUser, newPassword);
  };

  const deleteAccount = async (password?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not signed in');
    const uid = currentUser.uid;

    // Re-authenticate before destructive operation
    const isGoogleUser = currentUser.providerData.some(
      (p) => p.providerId === 'google.com',
    );
    const isAppleUser = currentUser.providerData.some(
      (p) => p.providerId === 'apple.com',
    );

    if (isGoogleUser) {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('Google re-authentication failed.');
      const credential = GoogleAuthProvider.credential(idToken);
      await reauthenticateWithCredential(currentUser, credential);
    } else if (isAppleUser) {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
        nonce: hashedNonce,
      });
      if (!appleCredential.identityToken) {
        throw new Error('Apple re-authentication failed.');
      }
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });
      await reauthenticateWithCredential(currentUser, credential);
    } else {
      if (!password) throw new Error('Password is required to delete account.');
      if (!currentUser.email) throw new Error('No email on account.');
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    }

    // 1. Delete user profile document
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.warn('Failed to delete user profile:', e);
    }

    // 2. Delete all pet documents owned by this user
    try {
      const ownedPetsQuery = query(
        collection(db, 'pets'),
        where('ownerUid', '==', uid),
      );
      const ownedSnapshot = await getDocs(ownedPetsQuery);

      if (!ownedSnapshot.empty) {
        const batch = writeBatch(db);
        for (const petDoc of ownedSnapshot.docs) {
          const shareCode = petDoc.data().shareCode;
          if (shareCode) {
            batch.delete(doc(db, 'shareLinks', shareCode));
          }
          batch.delete(petDoc.ref);
        }
        await batch.commit();
      }

      // 3. Remove user from shared pets (where they're a member but not owner)
      const sharedPetsQuery = query(
        collection(db, 'pets'),
        where('members', 'array-contains', uid),
      );
      const sharedSnapshot = await getDocs(sharedPetsQuery);
      for (const petDoc of sharedSnapshot.docs) {
        await updateDoc(petDoc.ref, { members: arrayRemove(uid) });
      }
    } catch (firestoreError) {
      console.warn('Firestore cleanup failed, proceeding with account deletion:', firestoreError);
    }

    // 4. Clear local storage
    await AsyncStorage.clear();

    // 5. Delete the Firebase Auth user
    await deleteUser(currentUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      initializing,
      displayName,
      signIn,
      signInWithGoogle: signInWithGoogleHandler,
      signInWithApple: signInWithAppleHandler,
      signUp,
      signOut,
      sendPasswordReset,
      updateDisplayName,
      updateUserEmail,
      updateUserPassword,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
