import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNutritionGoals,
  fetchWaterLogs,
  logWater,
  deleteWater,
} from '../../../src/api/nutrition';
import { WaterLog } from '../../../src/types';

const QUICK_AMOUNTS = [250, 500, 750, 1000];
const CUP_ML = 250;

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function WaterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const todayStr = formatDate(new Date());

  const goalsQuery = useQuery({
    queryKey: ['nutrition-goals'],
    queryFn: fetchNutritionGoals,
  });

  const waterQuery = useQuery({
    queryKey: ['water-logs', todayStr],
    queryFn: () => fetchWaterLogs(todayStr),
  });

  const logMutation = useMutation({
    mutationFn: (amountMl: number) => logWater(amountMl, todayStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs', todayStr] });
    },
    onError: () => {
      Alert.alert('Error', 'Could not log water. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWater,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs', todayStr] });
    },
    onError: () => {
      Alert.alert('Error', 'Could not remove entry.');
    },
  });

  const handleDelete = useCallback(
    (log: WaterLog) => {
      Alert.alert('Remove Entry', `Remove ${log.amountMl}ml logged at ${formatTime(log.loggedAt)}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(log.id),
        },
      ]);
    },
    [deleteMutation]
  );

  const goalMl = goalsQuery.data?.water ?? 2500;
  const totalMl = waterQuery.data?.totalMl ?? 0;
  const logs = waterQuery.data?.logs ?? [];
  const totalCups = Math.floor(totalMl / CUP_ML);
  const goalCups = Math.ceil(goalMl / CUP_ML);
  const pct = Math.min(totalMl / goalMl, 1);
  const isLoading = goalsQuery.isLoading || waterQuery.isLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Water Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Today's Total */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Ionicons name="water" size={32} color="#3B82F6" />
              <View style={styles.summaryNumbers}>
                <Text style={styles.totalMl}>
                  <Text style={styles.totalMlValue}>{totalMl}</Text>
                  <Text style={styles.totalMlUnit}> ml</Text>
                </Text>
                <Text style={styles.goalText}>/ {goalMl} ml goal</Text>
              </View>
              <View style={styles.cupsDisplay}>
                <Text style={styles.cupsValue}>{totalCups}</Text>
                <Text style={styles.cupsLabel}>cups</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {pct >= 1
                ? 'Goal reached!'
                : `${goalMl - totalMl} ml remaining`}
            </Text>
          </View>

          {/* Visual Cups */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cups Today</Text>
            <View style={styles.cupsGrid}>
              {Array.from({ length: goalCups }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.cup, i < totalCups && styles.cupFilled]}
                >
                  <Ionicons
                    name="water"
                    size={20}
                    color={i < totalCups ? '#3B82F6' : '#2a2a2a'}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.cupsSubtext}>
              {totalCups} / {goalCups} cups ({CUP_ML}ml each)
            </Text>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((ml) => (
                <TouchableOpacity
                  key={ml}
                  style={styles.quickBtn}
                  onPress={() => logMutation.mutate(ml)}
                  disabled={logMutation.isPending}
                >
                  <Ionicons name="add-circle" size={22} color="#3B82F6" />
                  <Text style={styles.quickBtnText}>{ml}ml</Text>
                  {ml >= 1000 && <Text style={styles.quickBtnSub}>1L</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log Entries */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No water logged yet today</Text>
            ) : (
              logs.map((log) => (
                <WaterLogRow key={log.id} log={log} onDelete={() => handleDelete(log)} />
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function WaterLogRow({ log, onDelete }: { log: WaterLog; onDelete: () => void }) {
  return (
    <View style={styles.logRow}>
      <Ionicons name="water" size={16} color="#3B82F6" />
      <Text style={styles.logAmount}>{log.amountMl} ml</Text>
      <Text style={styles.logTime}>{formatTime(log.loggedAt)}</Text>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle-outline" size={20} color="#444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  summaryNumbers: { flex: 1 },
  totalMl: {},
  totalMlValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  totalMlUnit: { color: '#888', fontSize: 18 },
  goalText: { color: '#555', fontSize: 14, marginTop: 2 },
  cupsDisplay: { alignItems: 'center' },
  cupsValue: { color: '#3B82F6', fontSize: 28, fontWeight: '800' },
  cupsLabel: { color: '#555', fontSize: 12 },
  progressTrack: {
    height: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  progressLabel: { color: '#888', fontSize: 13 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  cupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  cup: {
    width: 40,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cupFilled: {
    backgroundColor: '#3B82F615',
    borderColor: '#3B82F644',
  },
  cupsSubtext: { color: '#555', fontSize: 12 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
  },
  quickBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  quickBtnSub: { color: '#555', fontSize: 11 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  logAmount: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  logTime: { color: '#666', fontSize: 13 },
  emptyText: { color: '#444', fontSize: 13, fontStyle: 'italic' },
});
