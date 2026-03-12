import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

interface AlternativeExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
}

interface Props {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  onSelect: (exercise: { exerciseId: string; exerciseName: string }) => void;
  onClose: () => void;
}

export function ExerciseSubstitutionSheet({
  visible,
  exerciseId,
  exerciseName,
  onSelect,
  onClose,
}: Props) {
  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !exerciseId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setAlternatives([]);

    api
      .get<{ alternatives: AlternativeExercise[] }>(
        `/api/ai/exercise-substitutions?exerciseId=${encodeURIComponent(exerciseId)}`,
      )
      .then(({ data }) => {
        if (!cancelled) setAlternatives(data.alternatives ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load alternatives. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [visible, exerciseId]);

  const handleSelect = (alt: AlternativeExercise) => {
    onSelect({ exerciseId: alt.id, exerciseName: alt.name });
    onClose();
  };

  const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Swap Exercise</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Replacing: {exerciseName}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#6C63FF" size="large" />
            <Text style={styles.loadingText}>Finding alternatives…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={36} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : alternatives.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="swap-horizontal-outline" size={36} color="#444" />
            <Text style={styles.emptyText}>No alternatives found</Text>
            <Text style={styles.emptySubtext}>
              Try adding a different exercise manually
            </Text>
          </View>
        ) : (
          <FlatList
            data={alternatives}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{formatLabel(item.primaryMuscle)}</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeEquipment]}>
                      <Text style={styles.badgeText}>{formatLabel(item.equipment)}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectBtnText}>Use this</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerLeft: { flex: 1, marginRight: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: { color: '#666', fontSize: 14, marginTop: 8 },
  errorText: { color: '#ff4444', fontSize: 14, textAlign: 'center' },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#555', fontSize: 13, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeEquipment: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a50' },
  badgeText: { color: '#aaa', fontSize: 11, fontWeight: '500' },
  selectBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  selectBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
