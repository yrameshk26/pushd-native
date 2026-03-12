import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchBodyWeights, addBodyWeight, BodyWeightEntry } from '../../../src/api/progress';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getTrend(entries: BodyWeightEntry[]): { delta: number; isUp: boolean } | null {
  if (entries.length < 2) return null;
  const latest = entries[0].weight;
  const prev = entries[1].weight;
  return { delta: Math.abs(latest - prev), isUp: latest > prev };
}

interface AddWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (weight: number, bodyFat?: number) => void;
  isSaving: boolean;
}

function AddWeightModal({ visible, onClose, onSave, isSaving }: AddWeightModalProps) {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  function handleSave() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || w > 500) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
      return;
    }
    const bf = bodyFat.trim() ? parseFloat(bodyFat) : undefined;
    if (bf !== undefined && (isNaN(bf) || bf < 0 || bf > 100)) {
      Alert.alert('Invalid Body Fat', 'Body fat percentage must be between 0 and 100.');
      return;
    }
    onSave(w, bf);
  }

  function handleClose() {
    setWeight('');
    setBodyFat('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add Body Weight</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.field}>
            <Text style={modalStyles.fieldLabel}>Weight (kg) *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="e.g. 80.5"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              autoFocus
            />
          </View>

          <View style={modalStyles.field}>
            <Text style={modalStyles.fieldLabel}>Body Fat % (optional)</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="e.g. 15.2"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={bodyFat}
              onChangeText={setBodyFat}
            />
          </View>

          <TouchableOpacity
            style={[modalStyles.saveBtn, isSaving && modalStyles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={modalStyles.saveBtnText}>Save Entry</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function BodyWeightScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bodyweights'],
    queryFn: fetchBodyWeights,
  });

  const mutation = useMutation({
    mutationFn: ({ weight, bodyFat }: { weight: number; bodyFat?: number }) =>
      addBodyWeight(weight, bodyFat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyweights'] });
      setShowModal(false);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    },
  });

  const entries = data?.entries ?? [];
  const latest = entries[0];
  const trend = getTrend(entries);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Weight</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#888" />
          <Text style={styles.errorText}>Could not load body weight data.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Weight Hero */}
          {latest ? (
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Current Weight</Text>
              <Text style={styles.heroValue}>{latest.weight}kg</Text>
              {latest.bodyFat !== undefined && (
                <Text style={styles.heroBodyFat}>{latest.bodyFat}% body fat</Text>
              )}
              {trend && (
                <View style={styles.trendRow}>
                  <Ionicons
                    name={trend.isUp ? 'trending-up' : 'trending-down'}
                    size={18}
                    color={trend.isUp ? '#EF4444' : '#10B981'}
                  />
                  <Text style={[styles.trendText, { color: trend.isUp ? '#EF4444' : '#10B981' }]}>
                    {trend.isUp ? '+' : '-'}{trend.delta.toFixed(1)}kg from last entry
                  </Text>
                </View>
              )}
              <Text style={styles.heroDate}>Recorded {formatDate(latest.recordedAt)}</Text>
            </View>
          ) : (
            <View style={styles.emptyHero}>
              <Ionicons name="body-outline" size={48} color="#333" />
              <Text style={styles.emptyHeroText}>No entries yet</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowModal(true)}>
                <Text style={styles.emptyAddBtnText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Entry History */}
          {entries.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>History</Text>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View>
                    <Text style={styles.entryDate}>{formatDate(entry.recordedAt)}</Text>
                    {entry.bodyFat !== undefined && (
                      <Text style={styles.entryBodyFat}>{entry.bodyFat}% BF</Text>
                    )}
                  </View>
                  <Text style={styles.entryWeight}>{entry.weight}kg</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <AddWeightModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={(weight, bodyFat) => mutation.mutate({ weight, bodyFat })}
        isSaving={mutation.isPending}
      />
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 20, paddingBottom: 40 },

  heroCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  heroLabel: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heroValue: { color: '#10B981', fontSize: 52, fontWeight: '800', marginBottom: 4 },
  heroBodyFat: { color: '#6C63FF', fontSize: 16, fontWeight: '500', marginBottom: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  trendText: { fontSize: 14, fontWeight: '600' },
  heroDate: { color: '#555', fontSize: 13 },

  emptyHero: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 12,
  },
  emptyHeroText: { color: '#555', fontSize: 16 },
  emptyAddBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  entryRow: {
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
  entryDate: { color: '#fff', fontSize: 14, fontWeight: '600' },
  entryBodyFat: { color: '#6C63FF', fontSize: 12, marginTop: 2 },
  entryWeight: { color: '#10B981', fontSize: 18, fontWeight: '700' },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#888', fontSize: 15 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  field: { marginBottom: 20 },
  fieldLabel: { color: '#888', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
