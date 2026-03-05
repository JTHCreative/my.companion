import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../firebase';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  displayName: '',
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateDisplayName: async () => {},
  updateUserEmail: async () => {},
  updateUserPassword: async () => {},
});

const GOOGLE_WEB_CLIENT_ID = '862637928628-b73q3rk3m8i4uj1vtgisfh237hkd0m4k.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setDisplayName(firebaseUser?.displayName || '');
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogleHandler = async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In failed: no ID token returned.');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
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

  const updateDisplayName = async (name: string) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updateProfile(auth.currentUser, { displayName: name });
    setDisplayName(name);
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) throw new Error('Not signed in');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updateEmail(auth.currentUser, newEmail);
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) throw new Error('Not signed in');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider value={{
      user,
      initializing,
      displayName,
      signIn,
      signInWithGoogle: signInWithGoogleHandler,
      signUp,
      signOut,
      updateDisplayName,
      updateUserEmail,
      updateUserPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
