import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutListItem } from '../types';

interface Props {
  workout: WorkoutListItem;
  onPress: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

export function WorkoutCard({ workout, onPress }: Props) {
  const visibleExercises = workout.exercises.slice(0, 4);
  const remaining = workout.exercises.length - 4;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{workout.title}</Text>
          {workout.prCount > 0 && (
            <View style={styles.prBadge}>
              <Text style={styles.prText}>{workout.prCount} PR</Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>{formatDate(workout.completedAt)}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={13} color="#888" />
          <Text style={styles.statText}>{formatDuration(workout.duration)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="barbell-outline" size={13} color="#888" />
          <Text style={styles.statText}>{formatVolume(workout.volume)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="layers-outline" size={13} color="#888" />
          <Text style={styles.statText}>{workout.exercises.length} exercises</Text>
        </View>
      </View>

      {/* Exercise list */}
      <View style={styles.exerciseList}>
        {visibleExercises.map((ex, i) => (
          <Text key={i} style={styles.exerciseName} numberOfLines={1}>
            {ex.exerciseName}
          </Text>
        ))}
        {remaining > 0 && (
          <Text style={styles.moreText}>+{remaining} more</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: { marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  date: { color: '#888', fontSize: 13 },
  prBadge: {
    backgroundColor: '#2a1a6e',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  prText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#888', fontSize: 13 },
  statDivider: { width: 1, height: 12, backgroundColor: '#2a2a2a', marginHorizontal: 10 },
  exerciseList: { gap: 4 },
  exerciseName: { color: '#bbb', fontSize: 13 },
  moreText: { color: '#666', fontSize: 13, fontStyle: 'italic' },
});
