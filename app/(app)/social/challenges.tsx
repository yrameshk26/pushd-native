import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchChallenges, fetchCustomChallenges, joinChallenge } from '../../../src/api/social';

export default function ChallengesScreen() {
  const qc = useQueryClient();
  const { data: weekly, isLoading: wLoading } = useQuery({ queryKey: ['challenges'], queryFn: fetchChallenges });
  const { data: custom, isLoading: cLoading } = useQuery({ queryKey: ['custom-challenges'], queryFn: fetchCustomChallenges });
  const joinMutation = useMutation({ mutationFn: joinChallenge, onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-challenges'] }) });

  const weeklyChallenges: any[] = weekly?.challenges ?? [];
  const customChallenges: any[] = custom?.challenges ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.heading}>Challenges</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Text style={styles.section}>Weekly Challenges</Text>
            {wLoading ? <ActivityIndicator color="#6C63FF" /> : weeklyChallenges.length === 0
              ? <Text style={styles.empty}>No weekly challenges right now</Text>
              : weeklyChallenges.map((c) => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.cardDesc}>{c.description}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min((c.userProgress / c.target) * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{c.userProgress ?? 0} / {c.target} {c.metric}</Text>
                </View>
              ))
            }

            <Text style={[styles.section, { marginTop: 24 }]}>Community Challenges</Text>
            {cLoading ? <ActivityIndicator color="#6C63FF" /> : customChallenges.length === 0
              ? <Text style={styles.empty}>No community challenges yet</Text>
              : customChallenges.map((c) => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{c.name}</Text>
                    {!c.isJoined && (
                      <TouchableOpacity style={styles.joinBtn} onPress={() => joinMutation.mutate(c.id)}>
                        <Text style={styles.joinText}>Join</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.cardDesc}>{c.description}</Text>
                  <Text style={styles.meta}>{c._count?.participants ?? 0} participants · ends {new Date(c.endDate).toLocaleDateString()}</Text>
                </View>
              ))
            }
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  section: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: '#888', fontSize: 13, marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 3 },
  progressText: { color: '#666', fontSize: 12 },
  meta: { color: '#666', fontSize: 12 },
  joinBtn: { backgroundColor: '#6C63FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  joinText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { color: '#555', textAlign: 'center', marginVertical: 20 },
});
