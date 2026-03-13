import { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRESET_DURATIONS = [
  { label: '1m', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

interface Props {
  visible: boolean;
  remaining: number; // seconds remaining
  totalDuration: number; // total duration chosen
  onSkip: () => void;
  onChangeDuration: (seconds: number) => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const CIRCLE_RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function RestTimer({ visible, remaining, totalDuration, onSkip, onChangeDuration }: Props) {
  const animValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible || totalDuration === 0) return;
    const progress = remaining / totalDuration;
    Animated.timing(animValue, {
      toValue: progress,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [remaining, totalDuration, visible, animValue]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const handleChangeDuration = useCallback(
    (seconds: number) => {
      onChangeDuration(seconds);
    },
    [onChangeDuration],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Title */}
          <Text style={styles.title}>Rest Timer</Text>

          {/* Circular countdown */}
          <View style={styles.circleContainer}>
            {/* Background track */}
            <View style={styles.trackCircle} />
            {/* Animated progress ring using border trick */}
            <View style={styles.countdownCenter}>
              <Text style={styles.countdown}>{formatCountdown(remaining)}</Text>
              <Text style={styles.countdownSub}>remaining</Text>
            </View>
          </View>

          {/* Duration presets */}
          <Text style={styles.presetsLabel}>Change duration</Text>
          <View style={styles.presets}>
            {PRESET_DURATIONS.map((preset) => (
              <TouchableOpacity
                key={preset.seconds}
                style={[
                  styles.presetBtn,
                  totalDuration === preset.seconds && styles.presetBtnActive,
                ]}
                onPress={() => handleChangeDuration(preset.seconds)}
              >
                <Text
                  style={[
                    styles.presetText,
                    totalDuration === preset.seconds && styles.presetTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skip button */}
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Ionicons name="play-skip-forward" size={18} color="#fff" />
            <Text style={styles.skipText}>Skip Rest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#060C1B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    paddingBottom: 48,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#162540',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 32, fontFamily: 'BarlowCondensed-Bold' },
  circleContainer: {
    width: 200, height: 200, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#0B1326',
    borderWidth: 6,
    borderColor: '#162540',
  },
  trackCircle: {
    position: 'absolute',
    width: 188, height: 188, borderRadius: 94,
    borderWidth: 6,
    borderColor: '#3B82F6',
  },
  countdownCenter: { alignItems: 'center' },
  countdown: { color: '#fff', fontSize: 52, fontWeight: '800', letterSpacing: -1, fontFamily: 'BarlowCondensed-ExtraBold' },
  countdownSub: { color: '#718FAF', fontSize: 13, marginTop: 2, fontFamily: 'DMSans-Regular' },
  presetsLabel: {
    color: '#718FAF', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
    fontFamily: 'BarlowCondensed-SemiBold',
  },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  presetBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
  },
  presetBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  presetText: { color: '#718FAF', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  presetTextActive: { color: '#fff' },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#162540', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  skipText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
});
