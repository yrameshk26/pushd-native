import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProgressSummary {
  totalWorkouts: number;
  totalVolume: number;
  avgWorkoutsPerWeek: number;
}

function useProgressSummary() {
  return useQuery<ProgressSummary>({
    queryKey: ['progress-summary'],
    queryFn: async () => (await api.get('/api/progress/summary')).data,
  });
}

export default function ProgressScreen() {
  const { data, isLoading } = useProgressSummary();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Progress</Text>

        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{data?.totalWorkouts ?? 0}</Text>
              <Text style={styles.statLabel}>Total Workouts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{((data?.totalVolume ?? 0) / 1000).toFixed(1)}t</Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{(data?.avgWorkoutsPerWeek ?? 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Avg / Week</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: {
    flex: 1, minWidth: '45%', backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#2a2a2a',
  },
  statValue: { color: '#6C63FF', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#888', fontSize: 13 },
});
