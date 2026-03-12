import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchLeaderboard } from '../../../src/api/social';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { data, isLoading } = useQuery({ queryKey: ['leaderboard'], queryFn: fetchLeaderboard });
  const entries: any[] = data?.leaderboard ?? data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.heading}>Weekly Leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.sub}>Top lifters by volume this week</Text>
      {isLoading ? <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={entries}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index === 0 && styles.rowFirst]}>
              <Text style={styles.rank}>{MEDAL[index] ?? `#${index + 1}`}</Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.displayName ?? item.name ?? 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.displayName ?? item.name}</Text>
                <Text style={styles.meta}>{item.workoutCount ?? 0} workouts</Text>
              </View>
              <Text style={styles.volume}>{((item.totalVolume ?? 0) / 1000).toFixed(1)}t</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No data yet this week</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  sub: { color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  rowFirst: { borderColor: '#f59e0b' },
  rank: { fontSize: 22, marginRight: 12, width: 32, textAlign: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700' },
  info: { flex: 1 },
  name: { color: '#fff', fontWeight: '600', fontSize: 15 },
  meta: { color: '#666', fontSize: 12 },
  volume: { color: '#6C63FF', fontWeight: '700', fontSize: 16 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
});
