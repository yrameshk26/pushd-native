import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchExerciseProgress } from '../../../src/api/progress';
import { PRBadge } from '../../../src/components/PRBadge';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toLocaleString()}kg`;
}

export default function ExerciseProgressScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exercise-progress', exerciseId],
    queryFn: () => fetchExerciseProgress(exerciseId!),
    enabled: !!exerciseId,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {data?.exerciseName ?? 'Exercise Progress'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#888" />
          <Text style={styles.errorText}>Could not load progress data.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Estimated 1RM Hero */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Estimated 1RM</Text>
            <Text style={styles.heroValue}>{data?.estimated1RM ?? 0}kg</Text>
            <Text style={styles.heroSub}>Based on your best sets</Text>
          </View>

          {/* Personal Records */}
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.prGrid}>
            <View style={styles.prCard}>
              <View style={styles.prCardHeader}>
                <Ionicons name="barbell-outline" size={16} color="#F59E0B" />
                <PRBadge size="sm" />
              </View>
              <Text style={styles.prCardValue}>{data?.bestWeight ?? 0}kg</Text>
              <Text style={styles.prCardLabel}>Best Weight</Text>
            </View>
            <View style={styles.prCard}>
              <View style={styles.prCardHeader}>
                <Ionicons name="repeat-outline" size={16} color="#F59E0B" />
                <PRBadge size="sm" />
              </View>
              <Text style={styles.prCardValue}>{data?.bestReps ?? 0}</Text>
              <Text style={styles.prCardLabel}>Best Reps</Text>
            </View>
            <View style={[styles.prCard, { flexBasis: '100%' }]}>
              <View style={styles.prCardHeader}>
                <Ionicons name="layers-outline" size={16} color="#F59E0B" />
                <PRBadge size="sm" />
              </View>
              <Text style={styles.prCardValue}>{formatVolume(data?.bestVolume ?? 0)}</Text>
              <Text style={styles.prCardLabel}>Best Session Volume</Text>
            </View>
          </View>

          {/* Session History */}
          <Text style={styles.sectionTitle}>Session History</Text>
          {(data?.sessions?.length ?? 0) === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No sessions recorded yet.</Text>
            </View>
          ) : (
            data!.sessions.map((session, index) => (
              <View key={session.id} style={styles.sessionRow}>
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                  <Text style={styles.sessionSet}>
                    Top set: {session.topWeight}kg × {session.topReps} reps
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionVolume}>{formatVolume(session.totalVolume)}</Text>
                  <Text style={styles.sessionVolumeLabel}>volume</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },

  content: { padding: 20, paddingBottom: 40 },

  heroCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#6C63FF44',
  },
  heroLabel: { color: '#888', fontSize: 13, fontWeight: '500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#6C63FF', fontSize: 52, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: '#555', fontSize: 13 },

  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  prCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  prCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  prCardValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  prCardLabel: { color: '#888', fontSize: 12 },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sessionLeft: { flex: 1 },
  sessionDate: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  sessionSet: { color: '#888', fontSize: 13 },
  sessionRight: { alignItems: 'flex-end' },
  sessionVolume: { color: '#6C63FF', fontSize: 15, fontWeight: '700' },
  sessionVolumeLabel: { color: '#555', fontSize: 11 },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#888', fontSize: 15 },

  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#555', fontSize: 15 },
});
