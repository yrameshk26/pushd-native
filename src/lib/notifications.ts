// Run: npx expo install expo-notifications
// Run: npx expo install @react-native-async-storage/async-storage

import { Platform } from 'react-native';

// Graceful import — expo-notifications may not be installed yet
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  console.warn('[notifications] expo-notifications not installed. Run: npx expo install expo-notifications');
}

const WORKOUT_REMINDER_IDENTIFIER_PREFIX = 'workout-reminder-';

/**
 * Sets the foreground notification handler so notifications are shown
 * even when the app is in the foreground.
 */
export function setupNotificationHandler(): void {
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permissions and returns the Expo push token,
 * or null if permission was denied or the device does not support it.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) {
    console.warn('[notifications] expo-notifications not available');
    return null;
  }

  try {
    // Android requires an explicit notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('workout-reminders', {
        name: 'Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[notifications] Permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    console.error('[notifications] Failed to register for push notifications:', err);
    return null;
  }
}

/**
 * Schedules a repeating weekly workout reminder notification.
 *
 * @param hour   - Hour in 24h format (0–23)
 * @param minute - Minute (0–59)
 * @param days   - Array of weekday numbers where 0 = Sunday, 6 = Saturday
 */
export async function scheduleWorkoutReminder(
  hour: number,
  minute: number,
  days: number[],
): Promise<void> {
  if (!Notifications) {
    console.warn('[notifications] expo-notifications not available');
    return;
  }

  if (days.length === 0) return;

  try {
    // Cancel any existing reminders before scheduling new ones
    await cancelWorkoutReminders();

    for (const day of days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${WORKOUT_REMINDER_IDENTIFIER_PREFIX}${day}`,
        content: {
          title: "Time to push! 💪",
          body: "Your workout is waiting. Let's get it done.",
          sound: 'default',
          data: { type: 'workout-reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1, // expo-notifications uses 1=Sunday … 7=Saturday
          hour,
          minute,
        },
      });
    }
  } catch (err) {
    console.error('[notifications] Failed to schedule workout reminder:', err);
  }
}

/**
 * Cancels all scheduled workout reminder notifications.
 */
export async function cancelWorkoutReminders(): Promise<void> {
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminderIds = scheduled
      .map((n) => n.identifier)
      .filter((id) => id.startsWith(WORKOUT_REMINDER_IDENTIFIER_PREFIX));

    await Promise.all(reminderIds.map((id) => Notifications!.cancelScheduledNotificationAsync(id)));
  } catch (err) {
    console.error('[notifications] Failed to cancel workout reminders:', err);
  }
}

/**
 * Returns the current notification permission status string,
 * or 'unavailable' if expo-notifications is not installed.
 */
export async function getNotificationPermissionStatus(): Promise<string> {
  if (!Notifications) return 'unavailable';

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'unavailable';
  }
}
