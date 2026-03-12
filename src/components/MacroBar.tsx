import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  current: number;
  goal: number;
  color: string;
}

export function MacroBar({ label, current, goal, color }: Props) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          <Text style={[styles.current, { color }]}>{Math.round(current)}g</Text>
          <Text style={styles.separator}> / </Text>
          <Text style={styles.goal}>{goal}g</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { color: '#fff', fontSize: 14, fontWeight: '600' },
  values: { fontSize: 13 },
  current: { fontWeight: '700' },
  separator: { color: '#555' },
  goal: { color: '#888' },
  track: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
