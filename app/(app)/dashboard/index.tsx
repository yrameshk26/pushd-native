import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DashboardData {
  workouts: { id: string; title: string; completedAt: string }[];
  streak: number;
}

function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [workouts, streak] = await Promise.all([
        api.get('/api/workouts?limit=5'),
        api.get('/api/users/streak'),
      ]);
      return { workouts: workouts.data.workouts ?? [], streak: streak.data.streak ?? 0 };
    },
  });
}

export default function DashboardScreen() {
  const { data, isLoading } = useDashboard();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Dashboard</Text>

        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Current Streak</Text>
              <Text style={styles.cardValue}>{data?.streak ?? 0} 🔥</Text>
            </View>

            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {(data?.workouts ?? []).map((w) => (
              <View key={w.id} style={styles.workoutRow}>
                <Text style={styles.workoutTitle}>{w.title}</Text>
                <Text style={styles.workoutDate}>
                  {new Date(w.completedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardLabel: { color: '#888', fontSize: 14, marginBottom: 4 },
  cardValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  sectionTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  workoutRow: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  workoutTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  workoutDate: { color: '#666', fontSize: 13 },
});
