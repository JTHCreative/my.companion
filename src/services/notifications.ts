import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ScheduleEvent, Pet } from '../types';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android notification channel
const CHANNEL_ID = 'schedule-reminders';

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Schedule Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators/emulators
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function getPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Get the Expo push token and store it in Firestore for future
 * remote notifications via Cloud Functions.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: '0a8465a7-7db8-4a0a-ae13-ed48e6d1b8c7',
    });

    // Store in Firestore for backend use
    await setDoc(
      doc(db, 'userTokens', userId),
      {
        expoPushToken: token,
        platform: Platform.OS,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    return token;
  } catch {
    return null;
  }
}

/**
 * Cancel all currently scheduled notifications and reschedule
 * based on the current set of schedule events.
 */
export async function syncScheduledNotifications(
  events: ScheduleEvent[],
  pets: Pet[],
  reminderMinutesBefore: number,
): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const petMap = new Map(pets.map((p) => [p.id, p]));

  const dayMap: Record<string, number> = {
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
    Sat: 7,
  };

  for (const event of events) {
    // Skip events with notifications explicitly disabled
    if (event.notificationEnabled === false) continue;

    const pet = petMap.get(event.petId);
    if (!pet) continue;

    const [hourStr, minuteStr] = event.time.split(':');
    let hour = parseInt(hourStr, 10);
    let minute = parseInt(minuteStr, 10) - reminderMinutesBefore;

    // Handle minute underflow
    while (minute < 0) {
      minute += 60;
      hour -= 1;
    }
    // Handle hour underflow
    while (hour < 0) {
      hour += 24;
    }

    const title = getEventTitle(event.type);
    const body = reminderMinutesBefore > 0
      ? `${event.title} for ${pet.name} in ${reminderMinutesBefore} min`
      : `Time for ${event.title} — ${pet.name}`;

    for (const day of event.days) {
      const weekday = dayMap[day];
      if (!weekday) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { eventId: event.id, petId: event.petId },
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      });
    }
  }
}

function getEventTitle(type: string): string {
  switch (type) {
    case 'feeding':
      return '🍽 Feeding Time';
    case 'potty':
      return '🐾 Potty Break';
    case 'walk':
      return '🚶 Walk Time';
    case 'medication':
      return '💊 Medication Reminder';
    case 'nap':
      return '😴 Nap Time';
    case 'wake':
      return '☀️ Wake Up';
    case 'sleep':
      return '🌙 Bedtime';
    case 'play':
      return '🎾 Play Time';
    default:
      return '📋 Pet Reminder';
  }
}
