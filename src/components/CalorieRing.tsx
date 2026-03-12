import { View, Text, StyleSheet } from 'react-native';

interface Props {
  consumed: number;
  goal: number;
}

export function CalorieRing({ consumed, goal }: Props) {
  const remaining = goal - consumed;
  const isOver = remaining < 0;
  const ringColor = isOver ? '#FF4B4B' : '#22C55E';
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;

  // Simple segmented ring using overlapping Views + borderRadius trick
  // We use a square with circular border and clip one side to show progress
  const size = 160;
  const thickness = 12;
  const innerSize = size - thickness * 2;

  return (
    <View style={styles.wrapper}>
      {/* Outer ring track */}
      <View
        style={[
          styles.ringTrack,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {/* Progress arc simulation: colored fill layer */}
        <View
          style={[
            styles.ringFill,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: thickness,
              borderColor: ringColor,
              opacity: pct,
            },
          ]}
        />
        {/* Inner circle (cutout) */}
        <View
          style={[
            styles.innerCircle,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              top: thickness,
              left: thickness,
            },
          ]}
        >
          <Text style={[styles.calorieNumber, { color: isOver ? '#FF4B4B' : '#fff' }]}>
            {Math.round(consumed)}
          </Text>
          <Text style={styles.kcalLabel}>kcal</Text>
        </View>
      </View>

      {/* Below ring: remaining / over */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{goal}</Text>
          <Text style={styles.infoLabel}>Goal</Text>
        </View>
        <View style={styles.infoSep} />
        <View style={styles.infoItem}>
          <Text style={[styles.infoValue, { color: isOver ? '#FF4B4B' : '#22C55E' }]}>
            {Math.abs(Math.round(remaining))}
          </Text>
          <Text style={styles.infoLabel}>{isOver ? 'Over' : 'Left'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginVertical: 8 },
  ringTrack: {
    backgroundColor: '#2a2a2a',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  innerCircle: {
    position: 'absolute',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  kcalLabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 24,
  },
  infoItem: { alignItems: 'center' },
  infoValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  infoLabel: { color: '#888', fontSize: 12, marginTop: 2 },
  infoSep: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
});
