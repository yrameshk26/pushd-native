import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../../src/api/client';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Routine { id: string; name: string; description: string | null; _count: { exercises: number } }

function useRoutines() {
  return useQuery<Routine[]>({
    queryKey: ['routines'],
    queryFn: async () => (await api.get('/api/routines')).data,
  });
}

export default function RoutinesScreen() {
  const { data, isLoading } = useRoutines();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Routines</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/routines/create')}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/routines/${item.id}`)}
            >
              <Text style={styles.name}>{item.name}</Text>
              {item.description && <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>}
              <Text style={styles.count}>{item._count.exercises} exercises</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No routines yet. Create your first one!</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  addBtn: { backgroundColor: '#6C63FF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a',
  },
  name: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  desc: { color: '#888', fontSize: 14, marginBottom: 6 },
  count: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
