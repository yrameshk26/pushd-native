import { useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyChallenge {
  id: string;
  type: string;
  title: string;
  desc: string;
  target: number;
  progress: number;
  unit: string;
  icon: string;
  completed: boolean;
  participantCount: number;
}

interface ChallengesResponse {
  weekNumber: number;
  challenges: WeeklyChallenge[];
}

interface CustomChallenge {
  id: string;
  title: string;
  description: string;
  metric: string;
  targetValue: number;
  unit: string;
  endsAt: string;
  isPublic: boolean;
  creatorName: string;
  participantCount: number;
  isJoined: boolean;
  isCreator: boolean;
  progress: number;
  progressPct: number;
}

interface CustomChallengesResponse {
  challenges: CustomChallenge[];
}

type MetricKey = 'volume' | 'workouts' | 'sets' | 'duration';

interface MetricOption {
  value: MetricKey;
  label: string;
  unit: string;
  placeholder: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METRICS: MetricOption[] = [
  { value: 'volume', label: 'Volume lifted', unit: 'kg', placeholder: '10000' },
  { value: 'workouts', label: 'Workouts completed', unit: 'workouts', placeholder: '5' },
  { value: 'sets', label: 'Total sets', unit: 'sets', placeholder: '100' },
  { value: 'duration', label: 'Active minutes', unit: 'minutes', placeholder: '300' },
];

function formatProgressText(progress: number, target: number, unit: string): string {
  if (unit === 'kg') return `${progress.toLocaleString()} / ${target.toLocaleString()} kg`;
  if (unit === 'workouts') return `${progress} / ${target} workouts`;
  if (unit === 'sets') return `${progress} / ${target} sets`;
  if (unit === 'minutes') return `${progress} / ${target} minutes`;
  return `${progress} / ${target} ${unit}`;
}

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return 'Ending soon';
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  progress,
  target,
  completed,
  pct,
}: {
  progress: number;
  target: number;
  completed?: boolean;
  pct?: number;
}) {
  const width = pct != null ? pct : Math.min(100, Math.round((progress / target) * 100));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${width}%` },
          completed && styles.progressFillComplete,
        ]}
      />
    </View>
  );
}

// ─── Weekly Challenge Card ─────────────────────────────────────────────────────

function WeeklyChallengeCard({ challenge }: { challenge: WeeklyChallenge }) {
  return (
    <View
      style={[
        styles.card,
        challenge.completed && styles.cardCompleted,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.challengeIcon}>{challenge.icon}</Text>
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{challenge.title}</Text>
            {challenge.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Completed!</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDesc}>{challenge.desc}</Text>
        </View>
      </View>

      <ProgressBar
        progress={challenge.progress}
        target={challenge.target}
        completed={challenge.completed}
      />

      <View style={styles.cardFooter}>
        <Text style={styles.progressLabel}>
          {formatProgressText(challenge.progress, challenge.target, challenge.unit)}
        </Text>
        <Text style={styles.metaText}>
          👥 {challenge.participantCount}{' '}
          {challenge.participantCount !== 1 ? 'members' : 'member'}
        </Text>
      </View>
    </View>
  );
}

// ─── Custom Challenge Card ─────────────────────────────────────────────────────

function CustomChallengeCard({
  challenge,
  onToggle,
}: {
  challenge: CustomChallenge;
  onToggle: (id: string, newJoined: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (challenge.isJoined) {
        await api.delete(`/api/social/custom-challenges/${challenge.id}/join`);
      } else {
        await api.post(`/api/social/custom-challenges/${challenge.id}/join`);
      }
      onToggle(challenge.id, !challenge.isJoined);
    } catch {
      Alert.alert('Error', 'Could not update challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardInfo, { flex: 1 }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={2}>
              {challenge.title}
            </Text>
            {challenge.isCreator && (
              <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>Yours</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDesc}>{challenge.description}</Text>
          <Text style={[styles.metaText, { marginTop: 2 }]}>by {challenge.creatorName}</Text>
        </View>

        {!challenge.isCreator && (
          <TouchableOpacity
            style={[
              styles.joinBtn,
              challenge.isJoined && styles.joinBtnLeave,
            ]}
            onPress={handleToggle}
            disabled={loading}
          >
            <Text
              style={[
                styles.joinBtnText,
                challenge.isJoined && styles.joinBtnTextLeave,
              ]}
            >
              {loading ? '...' : challenge.isJoined ? 'Leave' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(challenge.isJoined || challenge.isCreator) && (
        <>
          <ProgressBar progress={challenge.progress} target={challenge.targetValue} pct={challenge.progressPct} />
          <Text style={styles.progressLabel}>
            {formatProgressText(challenge.progress, challenge.targetValue, challenge.unit)}
          </Text>
        </>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={12} color="#666" />
          <Text style={styles.metaText}>
            {challenge.participantCount}{' '}
            {challenge.participantCount !== 1 ? 'participants' : 'participant'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color="#666" />
          <Text style={styles.metaText}>{formatTimeRemaining(challenge.endsAt)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Create Challenge Modal ────────────────────────────────────────────────────

function CreateChallengeModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState<MetricKey>('volume');
  const [targetValue, setTargetValue] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedMetric = METRICS.find((m) => m.value === metric)!;

  function getMinEndDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  function getMaxEndDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  }

  function validate(): string | null {
    if (!title.trim()) return 'Title is required';
    if (title.trim().length > 100) return 'Title must be 100 characters or less';
    if (!description.trim()) return 'Description is required';
    const target = Number(targetValue);
    if (!targetValue || !Number.isInteger(target) || target <= 0)
      return 'Target must be a positive whole number';
    return null;
  }

  const handleSubmit = async () => {
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    // Set endsAt to 2 weeks from now by default
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 14);

    setLoading(true);
    try {
      await api.post('/api/social/custom-challenges', {
        title: title.trim(),
        description: description.trim(),
        metric,
        targetValue: Number(targetValue),
        unit: selectedMetric.unit,
        endsAt: endsAt.toISOString(),
        isPublic,
      });
      // Reset
      setTitle('');
      setDescription('');
      setMetric('volume');
      setTargetValue('');
      setIsPublic(true);
      setError('');
      onCreated();
      onClose();
    } catch {
      setError('Failed to create challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Challenge</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {/* Title */}
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="30-day strength challenge"
              placeholderTextColor="#555"
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's the challenge about?"
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Metric */}
            <Text style={styles.fieldLabel}>Metric *</Text>
            <View style={styles.metricGrid}>
              {METRICS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.metricOption,
                    metric === m.value && styles.metricOptionActive,
                  ]}
                  onPress={() => { setMetric(m.value); setTargetValue(''); }}
                >
                  <Text
                    style={[
                      styles.metricLabel,
                      metric === m.value && styles.metricLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text style={styles.metricUnit}>in {m.unit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target */}
            <Text style={styles.fieldLabel}>Target *</Text>
            <View style={styles.targetRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder={selectedMetric.placeholder}
                placeholderTextColor="#555"
                keyboardType="number-pad"
              />
              <Text style={styles.unitLabel}>{selectedMetric.unit}</Text>
            </View>

            {/* Public toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Public challenge</Text>
                <Text style={styles.toggleSub}>Anyone can find and join</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, isPublic && styles.toggleOn]}
                onPress={() => setIsPublic((v) => !v)}
              >
                <View style={[styles.toggleThumb, isPublic && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Challenge</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ChallengesScreen() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: weeklyData, isLoading: wLoading } = useQuery<ChallengesResponse>({
    queryKey: ['weekly-challenges'],
    queryFn: async () => {
      const { data } = await api.get('/api/social/challenges');
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const { data: customData, isLoading: cLoading } =
    useQuery<CustomChallengesResponse>({
      queryKey: ['custom-challenges'],
      queryFn: async () => {
        const { data } = await api.get('/api/social/custom-challenges');
        return data;
      },
      staleTime: 2 * 60_000,
    });

  const weeklyChallenges = weeklyData?.challenges ?? [];
  const customChallenges = customData?.challenges ?? [];

  function handleJoinToggle(id: string, newIsJoined: boolean) {
    qc.setQueryData<CustomChallengesResponse>(['custom-challenges'], (old) => {
      if (!old) return old;
      return {
        challenges: old.challenges.map((c) =>
          c.id === id
            ? {
                ...c,
                isJoined: newIsJoined,
                participantCount: c.participantCount + (newIsJoined ? 1 : -1),
              }
            : c,
        ),
      };
    });
  }

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ['custom-challenges'] });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Challenges</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Challenges Section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy-outline" size={18} color="#6C63FF" />
          <Text style={styles.sectionTitle}>Weekly Challenges</Text>
          {weeklyData?.weekNumber != null && (
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>Week {weeklyData.weekNumber}</Text>
            </View>
          )}
        </View>

        {wLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginVertical: 20 }} />
        ) : weeklyChallenges.length === 0 ? (
          <Text style={styles.emptyText}>No weekly challenges right now</Text>
        ) : (
          weeklyChallenges.map((c) => (
            <WeeklyChallengeCard key={c.id} challenge={c} />
          ))
        )}

        {/* Custom Challenges Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Ionicons name="add-circle-outline" size={18} color="#6C63FF" />
          <Text style={styles.sectionTitle}>Custom Challenges</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateOpen(true)}
          >
            <Ionicons name="add" size={14} color="#6C63FF" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {cLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginVertical: 20 }} />
        ) : customChallenges.length === 0 ? (
          <Text style={styles.emptyText}>
            No active custom challenges. Be the first to create one!
          </Text>
        ) : (
          customChallenges.map((c) => (
            <CustomChallengeCard
              key={c.id}
              challenge={c}
              onToggle={handleJoinToggle}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <CreateChallengeModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },

  weekBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  weekBadgeText: { color: '#666', fontSize: 11, fontWeight: '600' },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#6C63FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  createBtnText: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  cardCompleted: {
    backgroundColor: 'rgba(34,197,94,0.05)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  challengeIcon: { fontSize: 24, lineHeight: 28 },
  cardInfo: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardDesc: { color: '#888', fontSize: 13, lineHeight: 18 },

  completedBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedBadgeText: { color: '#22c55e', fontSize: 11, fontWeight: '600' },

  creatorBadge: {
    backgroundColor: 'rgba(108,99,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  creatorBadgeText: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },

  progressTrack: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 3,
  },
  progressFillComplete: { backgroundColor: '#22c55e' },

  progressLabel: { color: '#fff', fontSize: 13, fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#666', fontSize: 12 },

  joinBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  joinBtnLeave: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2a2a2a' },
  joinBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  joinBtnTextLeave: { color: '#888' },

  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 13,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  fieldLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top', lineHeight: 22 },
  charCount: { color: '#555', fontSize: 11, textAlign: 'right', marginTop: -12, marginBottom: 12 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metricOption: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 12,
  },
  metricOptionActive: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.12)',
  },
  metricLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  metricLabelActive: { color: '#6C63FF' },
  metricUnit: { color: '#555', fontSize: 11, marginTop: 3 },

  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  unitLabel: { color: '#888', fontSize: 14, fontWeight: '500', minWidth: 60 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    marginBottom: 16,
    gap: 12,
  },
  toggleTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleSub: { color: '#666', fontSize: 12, marginTop: 2 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#6C63FF' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#ef4444', fontSize: 13 },

  submitBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
