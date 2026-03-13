// Run: npx expo install expo-notifications
// Run: npx expo install expo-secure-store  (already installed)

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { storage as SecureStore } from '../utils/storage';

import {
  cancelWorkoutReminders,
  getNotificationPermissionStatus,
  registerForPushNotificationsAsync,
  scheduleWorkoutReminder,
} from '../lib/notifications';

// ─── Storage keys ────────────────────────────────────────────────────────────
const STORAGE_KEY_ENABLED = 'notif_reminder_enabled';
const STORAGE_KEY_HOUR = 'notif_reminder_hour';
const STORAGE_KEY_MINUTE = 'notif_reminder_minute';
const STORAGE_KEY_DAYS = 'notif_reminder_days';

// ─── Constants ────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DEFAULT_HOUR = 8;
const DEFAULT_MINUTE = 0;
const DEFAULT_DAYS = [1, 3, 5]; // Mon, Wed, Fri

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function loadPrefs(): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
  days: number[];
}> {
  try {
    const [enabledRaw, hourRaw, minuteRaw, daysRaw] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEY_ENABLED),
      SecureStore.getItemAsync(STORAGE_KEY_HOUR),
      SecureStore.getItemAsync(STORAGE_KEY_MINUTE),
      SecureStore.getItemAsync(STORAGE_KEY_DAYS),
    ]);

    return {
      enabled: enabledRaw === 'true',
      hour: hourRaw != null ? parseInt(hourRaw, 10) : DEFAULT_HOUR,
      minute: minuteRaw != null ? parseInt(minuteRaw, 10) : DEFAULT_MINUTE,
      days: daysRaw != null ? (JSON.parse(daysRaw) as number[]) : DEFAULT_DAYS,
    };
  } catch {
    return { enabled: false, hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE, days: DEFAULT_DAYS };
  }
}

async function savePrefs(
  enabled: boolean,
  hour: number,
  minute: number,
  days: number[],
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEY_ENABLED, String(enabled)),
    SecureStore.setItemAsync(STORAGE_KEY_HOUR, String(hour)),
    SecureStore.setItemAsync(STORAGE_KEY_MINUTE, String(minute)),
    SecureStore.setItemAsync(STORAGE_KEY_DAYS, JSON.stringify(days)),
  ]);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ColumnPickerProps {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  formatValue?: (v: number) => string;
}

function ColumnPicker({ values, selected, onSelect, formatValue = pad }: ColumnPickerProps) {
  const ITEM_HEIGHT = 40;
  const VISIBLE_ITEMS = 3;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx !== -1) {
      scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    }
  }, [selected, values]);

  return (
    <View style={[pickerStyles.container, { height: ITEM_HEIGHT * VISIBLE_ITEMS }]}>
      <View style={pickerStyles.selectionHighlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clampedIdx = Math.max(0, Math.min(idx, values.length - 1));
          onSelect(values[clampedIdx]);
        }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
      >
        {values.map((v) => (
          <TouchableOpacity
            key={v}
            style={[pickerStyles.item, { height: ITEM_HEIGHT }]}
            onPress={() => {
              const idx = values.indexOf(v);
              scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              onSelect(v);
            }}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.itemText, v === selected && pickerStyles.itemTextSelected]}>
              {formatValue(v)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    width: 64,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    top: 40, // ITEM_HEIGHT * 1 (center row)
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#3B82F622',
    borderRadius: 8,
    zIndex: 0,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 20,
    color: '#4A6080',
    fontWeight: '500',
    fontFamily: 'DMSans-Medium',
  },
  itemTextSelected: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'DMSans-Bold',
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [minute, setMinute] = useState(DEFAULT_MINUTE);
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [initialized, setInitialized] = useState(false);

  // Load persisted preferences on mount
  useEffect(() => {
    async function init() {
      const [prefs, status] = await Promise.all([loadPrefs(), getNotificationPermissionStatus()]);
      setPermissionStatus(status);
      setEnabled(prefs.enabled);
      setHour(prefs.hour);
      setMinute(prefs.minute);
      setDays(prefs.days);
      setInitialized(true);
    }
    init();
  }, []);

  // Persist and reschedule whenever enabled/hour/minute/days change (after init)
  useEffect(() => {
    if (!initialized) return;

    async function applyChanges() {
      await savePrefs(enabled, hour, minute, days);

      if (enabled && days.length > 0 && permissionStatus === 'granted') {
        await scheduleWorkoutReminder(hour, minute, days);
      } else {
        await cancelWorkoutReminders();
      }
    }

    applyChanges();
  }, [enabled, hour, minute, days, initialized, permissionStatus]);

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (value && permissionStatus !== 'granted') {
        const token = await registerForPushNotificationsAsync();
        const newStatus = await getNotificationPermissionStatus();
        setPermissionStatus(newStatus);

        if (!token || newStatus !== 'granted') {
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device Settings to use workout reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }

      setEnabled(value);
    },
    [permissionStatus],
  );

  const handleEnableNotifications = useCallback(async () => {
    if (permissionStatus === 'denied') {
      Alert.alert(
        'Enable Notifications',
        'Notifications are blocked. Please enable them in your device Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    const token = await registerForPushNotificationsAsync();
    const newStatus = await getNotificationPermissionStatus();
    setPermissionStatus(newStatus);

    if (token) {
      setEnabled(true);
    }
  }, [permissionStatus]);

  const toggleDay = useCallback((day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  const permissionDenied = permissionStatus === 'denied';
  const permissionUnavailable = permissionStatus === 'unavailable';

  return (
    <View style={styles.container}>
      {/* Permission banner */}
      {permissionStatus !== 'granted' && !permissionUnavailable && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            {permissionDenied
              ? 'Notifications are blocked. Open Settings to enable them.'
              : 'Notifications permission not granted.'}
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={handleEnableNotifications}
            activeOpacity={0.75}
          >
            <Text style={styles.permissionBtnText}>
              {permissionDenied ? 'Open Settings' : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {permissionUnavailable && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Notifications are not supported on this device or platform.
          </Text>
        </View>
      )}

      {/* Workout Reminders toggle row */}
      <View style={styles.row}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>Workout Reminders</Text>
          <Text style={styles.sublabel}>Get notified to stay consistent</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#162540', true: '#3B82F6' }}
          thumbColor="#fff"
          disabled={permissionUnavailable}
        />
      </View>

      {/* Expanded configuration — shown only when enabled */}
      {enabled && permissionStatus === 'granted' && (
        <View style={styles.config}>
          {/* Time picker */}
          <Text style={styles.configLabel}>Reminder Time</Text>
          <View style={styles.timePicker}>
            <ColumnPicker values={HOURS} selected={hour} onSelect={setHour} />
            <Text style={styles.timeSeparator}>:</Text>
            <ColumnPicker values={MINUTES} selected={minute} onSelect={setMinute} />
          </View>

          {/* Day chips */}
          <Text style={[styles.configLabel, { marginTop: 16 }]}>Repeat On</Text>
          <View style={styles.dayChips}>
            {DAY_LABELS.map((label, idx) => {
              const active = days.includes(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleDay(idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {days.length === 0 && (
            <Text style={styles.noDaysWarning}>Select at least one day to receive reminders.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Renders inside a parent card; no additional card chrome needed
  },

  permissionBanner: {
    backgroundColor: '#0B1326',
    borderWidth: 1,
    borderColor: '#162540',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  permissionText: {
    fontSize: 13,
    color: '#A8BDD4',
    lineHeight: 18,
    fontFamily: 'DMSans-Regular',
  },
  permissionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  labelGroup: { flex: 1 },
  label: { fontSize: 15, color: '#fff', fontFamily: 'DMSans-Regular' },
  sublabel: { fontSize: 12, color: '#4A6080', marginTop: 2, fontFamily: 'DMSans-Regular' },

  config: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#162540',
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A6080',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'BarlowCondensed-SemiBold',
  },

  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeSeparator: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'BarlowCondensed-Bold',
  },

  dayChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#162540',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A6080',
    fontFamily: 'DMSans-Bold',
  },
  chipTextActive: {
    color: '#fff',
  },

  noDaysWarning: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 8,
    fontFamily: 'DMSans-Regular',
  },
});
