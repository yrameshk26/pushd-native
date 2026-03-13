import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BodyWeightEntry {
  id: string;
  weight: number;
  unit: 'KG' | 'LBS';
  bodyFatPercent?: number | null;
  date: string;
  notes?: string | null;
}

type WeightUnit = 'KG' | 'LBS';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchBodyWeightEntries(): Promise<BodyWeightEntry[]> {
  const { data } = await api.get<{ data: BodyWeightEntry[] }>('/api/bodyweight?limit=365');
  return data?.data ?? [];
}

async function addBodyWeightEntry(payload: {
  weight: number;
  unit: WeightUnit;
  bodyFatPercent?: number;
  date: string;
}): Promise<BodyWeightEntry> {
  const { data } = await api.post<{ data: BodyWeightEntry }>('/api/bodyweight', payload);
  return data.data;
}

async function deleteBodyWeightEntry(id: string): Promise<void> {
  await api.delete(`/api/bodyweight?id=${id}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  return from === 'KG' ? weight * 2.20462 : weight * 0.453592;
}

// ─── Add Entry Modal ──────────────────────────────────────────────────────────

interface AddEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { weight: number; unit: WeightUnit; bodyFatPercent?: number; date: string }) => void;
  isSaving: boolean;
  preferredUnit: WeightUnit;
}

function AddEntryModal({ visible, onClose, onSave, isSaving, preferredUnit }: AddEntryModalProps) {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [unit, setUnit] = useState<WeightUnit>(preferredUnit);
  const [date, setDate] = useState(todayISODate());

  function handleSave() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || w > 700) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight (e.g. 80.5).');
      return;
    }
    const bf = bodyFat.trim() ? parseFloat(bodyFat) : undefined;
    if (bf !== undefined && (isNaN(bf) || bf < 0 || bf > 100)) {
      Alert.alert('Invalid Body Fat', 'Body fat % must be between 0 and 100.');
      return;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Date', 'Enter date in YYYY-MM-DD format.');
      return;
    }
    onSave({ weight: w, unit, bodyFatPercent: bf, date });
  }

  function handleClose() {
    setWeight('');
    setBodyFat('');
    setUnit(preferredUnit);
    setDate(todayISODate());
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modalStyles.container}>
          {/* Modal Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Add Entry</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Weight + Unit */}
          <View style={modalStyles.field}>
            <Text style={modalStyles.fieldLabel}>Weight *</Text>
            <View style={modalStyles.weightRow}>
              <TextInput
                style={[modalStyles.input, { flex: 1 }]}
                placeholder={unit === 'KG' ? 'e.g. 80.5' : 'e.g. 177.5'}
                placeholderTextColor="#4A6080"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
                autoFocus
              />
              {/* KG / LBS Toggle */}
              <View style={modalStyles.unitToggle}>
                {(['KG', 'LBS'] as WeightUnit[]).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[modalStyles.unitBtn, unit === u && modalStyles.unitBtnActive]}
                    onPress={() => {
                      if (unit !== u && weight) {
                        const converted = convertWeight(parseFloat(weight) || 0, unit, u);
                        setWeight(converted > 0 ? converted.toFixed(1) : '');
                      }
                      setUnit(u);
                    }}
                  >
                    <Text style={[modalStyles.unitBtnText, unit === u && modalStyles.unitBtnTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Body Fat */}
          <View style={modalStyles.field}>
            <Text style={modalStyles.fieldLabel}>Body Fat % (optional)</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="e.g. 15.2"
              placeholderTextColor="#4A6080"
              keyboardType="decimal-pad"
              value={bodyFat}
              onChangeText={setBodyFat}
            />
          </View>

          {/* Date */}
          <View style={modalStyles.field}>
            <Text style={modalStyles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="e.g. 2026-03-12"
              placeholderTextColor="#4A6080"
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BodyWeightScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>('KG');
  const [refreshing, setRefreshing] = useState(false);

  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['bodyweights-native'],
    queryFn: fetchBodyWeightEntries,
  });

  const addMutation = useMutation({
    mutationFn: addBodyWeightEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyweights-native'] });
      setShowModal(false);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBodyWeightEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyweights-native'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function confirmDelete(id: string) {
    Alert.alert('Delete Entry', 'Remove this body weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  const latest = entries[0];
  const prev = entries[1];

  // Weight diff: compare in same unit
  const weightDiff =
    latest && prev
      ? latest.unit === prev.unit
        ? latest.weight - prev.weight
        : latest.weight - convertWeight(prev.weight, prev.unit, latest.unit)
      : null;

  const displayUnit = latest?.unit ?? preferredUnit;
  const latestBf = latest?.bodyFatPercent ?? null;
  const prevBf = entries.find((e, i) => i > 0 && e.bodyFatPercent != null)?.bodyFatPercent ?? null;
  const bfDiff = latestBf != null && prevBf != null ? latestBf - prevBf : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Weight</Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#718FAF" />
          <Text style={styles.errorText}>Could not load body weight data.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
        >
          {/* Current Weight Hero */}
          {latest ? (
            <View style={styles.heroCard}>
              {/* KG / LBS display toggle */}
              <View style={styles.unitToggleRow}>
                {(['KG', 'LBS'] as WeightUnit[]).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitToggleBtn, preferredUnit === u && styles.unitToggleBtnActive]}
                    onPress={() => setPreferredUnit(u)}
                  >
                    <Text style={[styles.unitToggleBtnText, preferredUnit === u && styles.unitToggleBtnTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.heroLabel}>Current Weight</Text>
              <Text style={styles.heroValue}>
                {convertWeight(latest.weight, latest.unit, preferredUnit).toFixed(1)}
                <Text style={styles.heroUnit}> {preferredUnit}</Text>
              </Text>
              <Text style={styles.heroDate}>Logged {formatShortDate(latest.date)}</Text>

              {/* Weight change */}
              {weightDiff !== null && (
                <View style={styles.diffRow}>
                  <Ionicons
                    name={weightDiff < 0 ? 'trending-down' : weightDiff > 0 ? 'trending-up' : 'remove'}
                    size={18}
                    color={weightDiff < 0 ? '#10B981' : weightDiff > 0 ? '#EF4444' : '#718FAF'}
                  />
                  <Text
                    style={[
                      styles.diffText,
                      { color: weightDiff < 0 ? '#10B981' : weightDiff > 0 ? '#EF4444' : '#718FAF' },
                    ]}
                  >
                    {weightDiff > 0 ? '+' : ''}
                    {convertWeight(Math.abs(weightDiff), displayUnit, preferredUnit).toFixed(1)} {preferredUnit} from last entry
                  </Text>
                </View>
              )}

              {/* Body fat */}
              {latestBf != null && (
                <View style={styles.bfRow}>
                  <Text style={styles.bfValue}>{latestBf.toFixed(1)}% body fat</Text>
                  {bfDiff !== null && (
                    <Text
                      style={[
                        styles.bfDiff,
                        { color: bfDiff < 0 ? '#10B981' : bfDiff > 0 ? '#EF4444' : '#718FAF' },
                      ]}
                    >
                      {bfDiff > 0 ? '+' : ''}
                      {bfDiff.toFixed(1)}%
                    </Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyHero}>
              <Ionicons name="body-outline" size={48} color="#162540" />
              <Text style={styles.emptyHeroText}>No entries yet</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowModal(true)}>
                <Text style={styles.emptyAddBtnText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* All Entries List */}
          {entries.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>History</Text>
              {entries.map((entry) => {
                const displayWeight = convertWeight(entry.weight, entry.unit, preferredUnit);
                return (
                  <View key={entry.id} style={styles.entryRow}>
                    <View style={styles.entryLeft}>
                      <Text style={styles.entryDate}>{formatDisplayDate(entry.date)}</Text>
                      {entry.bodyFatPercent != null && (
                        <Text style={styles.entryBf}>{entry.bodyFatPercent.toFixed(1)}% BF</Text>
                      )}
                      {entry.notes ? (
                        <Text style={styles.entryNotes} numberOfLines={1}>{entry.notes}</Text>
                      ) : null}
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={styles.entryWeight}>
                        {displayWeight.toFixed(1)} {preferredUnit}
                      </Text>
                      <TouchableOpacity
                        onPress={() => confirmDelete(entry.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#718FAF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB — Add Entry */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddEntryModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={(payload) => {
          setPreferredUnit(payload.unit);
          addMutation.mutate(payload);
        }}
        isSaving={addMutation.isPending}
        preferredUnit={preferredUnit}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0B1326',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'BarlowCondensed-Bold', textAlign: 'center' },
  headerRight: { width: 40 },

  content: { padding: 20, paddingBottom: 100 },

  // Hero card
  heroCard: {
    backgroundColor: '#0B1326',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#162540',
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  unitToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#162540',
  },
  unitToggleBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  unitToggleBtnText: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-SemiBold' },
  unitToggleBtnTextActive: { color: '#fff' },

  heroLabel: {
    color: '#718FAF',
    fontSize: 11,
    fontFamily: 'BarlowCondensed-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroValue: {
    color: '#10B981',
    fontSize: 56,
    fontFamily: 'BarlowCondensed-ExtraBold',
    lineHeight: 64,
  },
  heroUnit: {
    fontSize: 24,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: '#10B981',
  },
  heroDate: { color: '#4A6080', fontSize: 13, marginTop: 4, marginBottom: 12, fontFamily: 'DMSans-Regular' },

  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  diffText: { fontSize: 14, fontFamily: 'DMSans-SemiBold' },

  bfRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  bfValue: { color: '#3B82F6', fontSize: 15, fontFamily: 'DMSans-SemiBold' },
  bfDiff: { fontSize: 13, fontFamily: 'DMSans-SemiBold' },

  // Empty hero
  emptyHero: {
    backgroundColor: '#0B1326',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 12,
  },
  emptyHeroText: { color: '#4A6080', fontSize: 16, fontFamily: 'DMSans-Regular' },
  emptyAddBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 14, fontFamily: 'DMSans-SemiBold' },

  // Section
  sectionTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontFamily: 'BarlowCondensed-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Entry rows
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1326',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#162540',
  },
  entryLeft: { flex: 1 },
  entryDate: { color: '#fff', fontSize: 14, fontFamily: 'DMSans-SemiBold', marginBottom: 2 },
  entryBf: { color: '#3B82F6', fontSize: 12, marginTop: 2, fontFamily: 'DMSans-Regular' },
  entryNotes: { color: '#4A6080', fontSize: 12, marginTop: 2, fontFamily: 'DMSans-Regular' },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryWeight: { color: '#10B981', fontSize: 18, fontFamily: 'DMSans-Bold' },
  deleteBtn: { padding: 4 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Error
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },
  retryBtn: {
    backgroundColor: '#0B1326',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#162540',
  },
  retryText: { color: '#3B82F6', fontFamily: 'DMSans-SemiBold', fontSize: 14 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B', padding: 24, paddingTop: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { color: '#fff', fontSize: 20, fontFamily: 'BarlowCondensed-Bold' },
  field: { marginBottom: 20 },
  fieldLabel: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Medium', marginBottom: 8 },
  weightRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    backgroundColor: '#0B1326',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#162540',
    fontFamily: 'DMSans-Regular',
  },
  unitToggle: { flexDirection: 'row', gap: 6 },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#162540',
    backgroundColor: '#0B1326',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  unitBtnText: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-SemiBold' },
  unitBtnTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans-Bold' },
});
