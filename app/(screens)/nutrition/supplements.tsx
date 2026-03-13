import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchSupplements,
  addSupplement,
  markSupplementTaken,
  deleteSupplementLog,
} from '../../../src/api/nutrition';
import { SupplementLog } from '../../../src/types';

type SupplementUnit = 'mg' | 'g' | 'mcg' | 'IU' | 'serving';
type SupplementTiming = 'morning' | 'pre-workout' | 'post-workout' | 'evening' | 'night';

const UNITS: SupplementUnit[] = ['mg', 'g', 'mcg', 'IU', 'serving'];
const TIMINGS: { key: SupplementTiming; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'pre-workout', label: 'Pre-Workout' },
  { key: 'post-workout', label: 'Post-Workout' },
  { key: 'evening', label: 'Evening' },
  { key: 'night', label: 'Night' },
];

const QUICK_ADD_SUPPLEMENTS: { name: string; dose: string; unit: SupplementUnit }[] = [
  { name: 'Creatine', dose: '5', unit: 'g' },
  { name: 'Vitamin D', dose: '2000', unit: 'IU' },
  { name: 'Omega-3', dose: '1', unit: 'serving' },
  { name: 'Protein', dose: '30', unit: 'g' },
  { name: 'Caffeine', dose: '200', unit: 'mg' },
  { name: 'Magnesium', dose: '400', unit: 'mg' },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface AddSupplementForm {
  name: string;
  dose: string;
  unit: SupplementUnit;
  timing: SupplementTiming;
}

const DEFAULT_FORM: AddSupplementForm = {
  name: '',
  dose: '',
  unit: 'mg',
  timing: 'morning',
};

export default function SupplementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dateStr = formatDate(new Date());

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddSupplementForm>(DEFAULT_FORM);

  const supplementsQuery = useQuery({
    queryKey: ['supplements', dateStr],
    queryFn: () => fetchSupplements(dateStr),
  });

  const addMutation = useMutation({
    mutationFn: addSupplement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements', dateStr] });
      setShowModal(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add supplement. Please try again.');
    },
  });

  const takenMutation = useMutation({
    mutationFn: markSupplementTaken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements', dateStr] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update supplement status.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplementLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements', dateStr] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to remove supplement.');
    },
  });

  const handleQuickAdd = useCallback(
    (item: (typeof QUICK_ADD_SUPPLEMENTS)[0]) => {
      addMutation.mutate({
        name: item.name,
        dose: item.dose,
        unit: item.unit,
        timing: 'morning',
        date: dateStr,
      });
    },
    [addMutation, dateStr]
  );

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      Alert.alert('Missing Info', 'Please enter a supplement name.');
      return;
    }
    addMutation.mutate({
      name: form.name.trim(),
      dose: form.dose.trim(),
      unit: form.unit,
      timing: form.timing,
      date: dateStr,
    });
  }, [form, addMutation, dateStr]);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert('Remove Supplement', `Remove "${name}" from today's log?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]);
    },
    [deleteMutation]
  );

  const logs = supplementsQuery.data?.logs ?? [];
  const isLoading = supplementsQuery.isLoading;
  const isError = supplementsQuery.isError;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Supplements</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load supplements.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => supplementsQuery.refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Add Row */}
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickGrid}>
            {QUICK_ADD_SUPPLEMENTS.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={styles.quickChip}
                onPress={() => handleQuickAdd(item)}
                disabled={addMutation.isPending}
              >
                <Text style={styles.quickChipName}>{item.name}</Text>
                <Text style={styles.quickChipDose}>
                  {item.dose} {item.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Log */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Today's Log
          </Text>
          {logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="flask-outline" size={40} color="#333" />
              <Text style={styles.emptyText}>No supplements logged today</Text>
              <Text style={styles.emptySubText}>
                Use quick add above or tap + to add a custom supplement
              </Text>
            </View>
          ) : (
            logs.map((log) => (
              <SupplementRow
                key={log.id}
                log={log}
                onToggle={() => takenMutation.mutate(log.id)}
                onDelete={() => handleDelete(log.id, log.name)}
                isToggling={takenMutation.isPending}
              />
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Add Supplement Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Supplement</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm(DEFAULT_FORM); }}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Creatine"
                placeholderTextColor="#555"
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                returnKeyType="next"
                autoFocus
              />

              <Text style={styles.label}>Dose</Text>
              <View style={styles.doseRow}>
                <TextInput
                  style={[styles.input, styles.doseInput]}
                  placeholder="0"
                  placeholderTextColor="#555"
                  value={form.dose}
                  onChangeText={(v) => setForm((p) => ({ ...p, dose: v }))}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <View style={styles.unitPicker}>
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, form.unit === u && styles.unitChipActive]}
                      onPress={() => setForm((p) => ({ ...p, unit: u }))}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          form.unit === u && styles.unitChipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.label}>Timing</Text>
              <View style={styles.timingGrid}>
                {TIMINGS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.timingChip,
                      form.timing === key && styles.timingChipActive,
                    ]}
                    onPress={() => setForm((p) => ({ ...p, timing: key }))}
                  >
                    <Text
                      style={[
                        styles.timingChipText,
                        form.timing === key && styles.timingChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, addMutation.isPending && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Add Supplement</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SupplementRow({
  log,
  onToggle,
  onDelete,
  isToggling,
}: {
  log: SupplementLog;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  return (
    <View style={styles.supRow}>
      <TouchableOpacity
        style={[styles.checkCircle, log.taken && styles.checkCircleActive]}
        onPress={onToggle}
        disabled={isToggling}
      >
        {log.taken && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>
      <View style={styles.supInfo}>
        <Text style={[styles.supName, log.taken && styles.supNameTaken]}>
          {log.name}
        </Text>
        {(log.dosage || log.timing) && (
          <Text style={styles.supDose}>
            {log.dosage ? log.dosage : ''}
            {log.dosage && log.timing ? ' · ' : ''}
            {log.timing ?? ''}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color="#444" />
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
  heading: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addBtn: { padding: 4 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    minWidth: 90,
  },
  quickChipName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  quickChipDose: { color: '#6C63FF', fontSize: 11, marginTop: 2 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  emptyText: { color: '#555', fontSize: 15, fontWeight: '600' },
  emptySubText: { color: '#444', fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { color: '#888', fontSize: 15 },
  retryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  supRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  supInfo: { flex: 1 },
  supName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  supNameTaken: { color: '#555', textDecorationLine: 'line-through' },
  supDose: { color: '#666', fontSize: 12, marginTop: 2 },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  label: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  doseRow: { gap: 10 },
  doseInput: { marginBottom: 8 },
  unitPicker: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  unitChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  unitChipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  unitChipTextActive: { color: '#fff' },
  timingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  timingChipActive: { backgroundColor: '#6C63FF22', borderColor: '#6C63FF' },
  timingChipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  timingChipTextActive: { color: '#6C63FF' },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
