import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFS } from '../types';
import {
  setupNotificationChannel,
  requestNotificationPermissions,
  getPermissionStatus,
  registerPushToken,
  syncScheduledNotifications,
} from '../services/notifications';

const PREFS_KEY = 'companion_notification_prefs';

interface NotificationContextValue {
  prefs: NotificationPreferences;
  permissionStatus: string;
  updatePrefs: (updates: Partial<NotificationPreferences>) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue>({
  prefs: DEFAULT_NOTIFICATION_PREFS,
  permissionStatus: 'undetermined',
  updatePrefs: async () => {},
  requestPermissions: async () => false,
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { scheduleEvents, pets } = useData();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [initialized, setInitialized] = useState(false);

  // Track previous values to avoid unnecessary reschedules
  const prevSyncKey = useRef('');

  // Load saved preferences from AsyncStorage
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        try {
          setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) });
        } catch {
          // ignore corrupt data
        }
      }
      setInitialized(true);
    })();
  }, []);

  // Setup notification channel + check permissions on mount
  useEffect(() => {
    (async () => {
      await setupNotificationChannel();
      const status = await getPermissionStatus();
      setPermissionStatus(status);
    })();
  }, []);

  // Register push token when user signs in and permissions are granted
  useEffect(() => {
    if (user && permissionStatus === 'granted') {
      registerPushToken(user.uid);
    }
  }, [user, permissionStatus]);

  // Sync scheduled local notifications whenever events, pets, or prefs change
  useEffect(() => {
    if (!initialized) return;

    // Build a key to detect meaningful changes
    const syncKey = JSON.stringify({
      enabled: prefs.enabled && prefs.scheduleReminders,
      mins: prefs.reminderMinutesBefore,
      events: scheduleEvents.map((e) => `${e.id}:${e.time}:${e.days.join(',')}`),
      petIds: pets.map((p) => p.id),
    });

    if (syncKey === prevSyncKey.current) return;
    prevSyncKey.current = syncKey;

    if (!prefs.enabled || !prefs.scheduleReminders || permissionStatus !== 'granted') {
      // Notifications disabled — cancel everything
      Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    syncScheduledNotifications(scheduleEvents, pets, prefs.reminderMinutesBefore);
  }, [scheduleEvents, pets, prefs, permissionStatus, initialized]);

  const updatePrefs = useCallback(async (updates: Partial<NotificationPreferences>) => {
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
  }, [prefs]);

  const requestPermissions = useCallback(async () => {
    const granted = await requestNotificationPermissions();
    const status = await getPermissionStatus();
    setPermissionStatus(status);

    if (granted && user) {
      registerPushToken(user.uid);
    }

    return granted;
  }, [user]);

  return (
    <NotificationContext.Provider value={{ prefs, permissionStatus, updatePrefs, requestPermissions }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
