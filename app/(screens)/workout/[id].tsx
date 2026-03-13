import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkout, likeWorkout, fetchComments,
  addComment, deleteWorkout, saveAsTemplate,
} from '../../../src/api/workouts';
import { SavedWorkoutSet, Comment } from '../../../src/types';
import { WorkoutPhotoUpload } from '../../../src/components/WorkoutPhotoUpload';
import { PRBadge } from '../../../src/components/PRBadge';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

function getMuscleColor(muscle: string): string {
  const map: Record<string, string> = {
    chest: '#ef4444',
    back: '#3b82f6',
    shoulders: '#a855f7',
    biceps: '#22c55e',
    triceps: '#f97316',
    legs: '#eab308',
    quads: '#eab308',
    hamstrings: '#eab308',
    glutes: '#eab308',
    calves: '#84cc16',
    abs: '#06b6d4',
    core: '#06b6d4',
    forearms: '#10b981',
    traps: '#8b5cf6',
    lats: '#3b82f6',
  };
  const key = muscle.toLowerCase().split(' ')[0];
  return map[key] ?? '#6C63FF';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SetTypeBadge({ type }: { type: string }) {
  if (type === 'NORMAL') return null;
  const config: Record<string, { label: string; color: string; bg: string }> = {
    WARMUP: { label: 'W', color: '#aaa', bg: '#2a2a2a' },
    DROP:   { label: 'D', color: '#f97316', bg: '#2a1400' },
    FAILURE: { label: 'F', color: '#ef4444', bg: '#2a0000' },
  };
  const c = config[type];
  if (!c) return null;
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.typeBadgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

function SetRow({ set, index }: { set: SavedWorkoutSet; index: number }) {
  return (
    <View style={[styles.setRow, !set.isCompleted && styles.setRowSkipped]}>
      {/* Set number / type */}
      <View style={styles.setNumCell}>
        {set.type !== 'NORMAL' ? (
          <SetTypeBadge type={set.type} />
        ) : (
          <Text style={styles.setNum}>{index + 1}</Text>
        )}
      </View>

      {/* Weight × Reps */}
      <Text style={styles.setWeight}>{set.weight != null ? set.weight : '—'} kg</Text>
      <Text style={styles.setX}>×</Text>
      <Text style={styles.setReps}>{set.reps != null ? set.reps : '—'}</Text>

      {/* Completed check */}
      {set.isCompleted && (
        <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={styles.checkIcon} />
      )}

      {/* PR badge */}
      {set.isPR && <PRBadge size="sm" />}
    </View>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const initial = comment.user.displayName.charAt(0).toUpperCase();
  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{initial}</Text>
      </View>
      <View style={styles.commentBody}>
        <Text style={styles.commentUser}>{comment.user.displayName}</Text>
        <Text style={styles.commentContent}>{comment.content}</Text>
        <Text style={styles.commentDate}>
          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => fetchWorkout(id),
    enabled: !!id,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['workout-comments', id],
    queryFn: () => fetchComments(id),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => likeWorkout(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout', id] }),
    onError: () => Alert.alert('Error', 'Could not update like. Please try again.'),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id, content),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['workout-comments', id] });
    },
    onError: () => Alert.alert('Error', 'Could not post comment. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not delete workout.'),
  });

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Workout', 'This cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }, [deleteMutation]);

  const handleShare = useCallback(async () => {
    if (!workout) return;
    try {
      await Share.share({
        title: workout.title,
        message: `Check out my workout "${workout.title}" on Pushd!`,
      });
    } catch {
      // User cancelled or share not supported — silently ignore
    }
  }, [workout]);

  const handleSaveAsTemplate = useCallback(() => {
    const defaultName = workout?.title ?? 'My Routine';
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Save as Routine',
        'Enter a name for this routine:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (name: string | undefined) => {
              const trimmed = (name ?? defaultName).trim() || defaultName;
              saveAsTemplate(id, trimmed)
                .then(() => Alert.alert('Saved!', `"${trimmed}" saved as a routine.`))
                .catch(() => Alert.alert('Error', 'Failed to save routine.'));
            },
          },
        ],
        'plain-text',
        defaultName,
      );
    } else {
      Alert.alert('Save as Routine', `Save "${defaultName}" as a routine?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            saveAsTemplate(id, defaultName)
              .then(() => Alert.alert('Saved!', `"${defaultName}" saved as a routine.`))
              .catch(() => Alert.alert('Error', 'Failed to save routine.'));
          },
        },
      ]);
    }
  }, [id, workout?.title]);

  const handleSubmitComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    commentMutation.mutate(trimmed);
  }, [commentText, commentMutation]);

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (isLoading || !workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // ─── Derived data ───────────────────────────────────────────────────────────

  const totalSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length,
    0,
  );

  const prSets = workout.exercises.flatMap((ex) =>
    ex.sets.filter((s) => s.isPR).map((s) => ({ ...s, exerciseName: ex.exercise.name })),
  );

  const comments = commentsData?.comments ?? [];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>{workout.title}</Text>

          <View style={styles.headerActions}>
            {/* Share */}
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#6C63FF" />
            </TouchableOpacity>

            {/* Save as template / bookmark */}
            <TouchableOpacity style={styles.iconBtn} onPress={handleSaveAsTemplate}>
              <Ionicons name="bookmark-outline" size={18} color="#6C63FF" />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity style={styles.iconBtnDanger} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <Text style={styles.workoutDate}>{formatDate(workout.completedAt)}</Text>

          {/* PR Banner */}
          {prSets.length > 0 && (
            <View style={styles.prBanner}>
              <Ionicons name="trophy" size={22} color="#FFD700" />
              <View style={styles.prBannerText}>
                <Text style={styles.prBannerTitle}>
                  {prSets.length} new PR{prSets.length > 1 ? 's' : ''}!
                </Text>
                <Text style={styles.prBannerSub} numberOfLines={2}>
                  {prSets.map((s) => s.exerciseName).join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* WorkoutTag badge */}
          {workout.workoutTag ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{workout.workoutTag}</Text>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={20} color="#6C63FF" />
              <Text style={styles.statValue}>{formatDuration(workout.duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="barbell-outline" size={20} color="#6C63FF" />
              <Text style={styles.statValue}>{formatVolume(workout.volume)}</Text>
              <Text style={styles.statLabel}>Volume</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="layers-outline" size={20} color="#6C63FF" />
              <Text style={styles.statValue}>{totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>

            {prSets.length > 0 && (
              <View style={[styles.statCard, styles.statCardPR]}>
                <Ionicons name="trophy-outline" size={20} color="#FFD700" />
                <Text style={[styles.statValue, styles.statValuePR]}>{prSets.length}</Text>
                <Text style={[styles.statLabel, styles.statLabelPR]}>PRs</Text>
              </View>
            )}
          </View>

          {/* Notes */}
          {workout.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </View>
          ) : null}

          {/* Exercise breakdown */}
          <Text style={styles.sectionTitle}>Exercises</Text>

          {workout.exercises.map((ex) => {
            const muscleColor = getMuscleColor(ex.exercise.primaryMuscle);
            const hasPR = ex.sets.some((s) => s.isPR);
            return (
              <View key={ex.id} style={styles.exerciseCard}>
                {/* Exercise name row */}
                <View style={styles.exerciseNameRow}>
                  <View style={[styles.muscleTag, { backgroundColor: muscleColor }]} />
                  <Text style={styles.exerciseName} numberOfLines={1}>{ex.exercise.name}</Text>
                  {hasPR && <PRBadge size="sm" />}
                </View>

                {ex.notes ? (
                  <Text style={styles.exerciseNotes}>{ex.notes}</Text>
                ) : null}

                {/* Set headers */}
                <View style={styles.setHeaders}>
                  <Text style={[styles.setHeaderText, styles.setNumCell]}>SET</Text>
                  <Text style={[styles.setHeaderText, styles.setWeightHeader]}>WEIGHT</Text>
                  <Text style={[styles.setHeaderText, styles.setRepsHeader]}>REPS</Text>
                </View>

                {/* Sets */}
                {ex.sets.map((set, i) => (
                  <SetRow key={set.id} set={set} index={i} />
                ))}
              </View>
            );
          })}

          {/* Like button */}
          <TouchableOpacity
            style={styles.likeBtn}
            onPress={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            activeOpacity={0.75}
          >
            <Ionicons
              name={workout.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={workout.isLiked ? '#ef4444' : '#888'}
            />
            <Text style={[styles.likeBtnText, workout.isLiked && styles.likeBtnTextActive]}>
              {workout.likesCount} {workout.likesCount === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>

          {/* Photos */}
          <WorkoutPhotoUpload workoutId={workout.id} />

          {/* Comments */}
          <Text style={styles.sectionTitle}>Comments</Text>

          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            comments.map((c) => <CommentItem key={c.id} comment={c} />)
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Comment input bar */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#555"
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  flex: {
    flex: 1,
  },

  // Header
  loadingHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a6e',
  },
  iconBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#331111',
  },

  // Content
  content: {
    padding: 16,
    paddingBottom: 8,
  },
  workoutDate: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },

  // PR Banner
  prBanner: {
    backgroundColor: '#2a1e00',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5a3d00',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  prBannerText: {
    flex: 1,
  },
  prBannerTitle: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  prBannerSub: {
    color: '#a89030',
    fontSize: 13,
  },

  // Workout tag badge
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  tagBadgeText: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
  },
  statCardPR: {
    borderColor: '#4a3a00',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  statValuePR: {
    color: '#FFD700',
  },
  statLabel: {
    color: '#666',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statLabelPR: {
    color: '#a89030',
  },

  // Notes
  notesCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  notesLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },

  // Section title
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  muscleTag: {
    width: 10,
    height: 10,
    borderRadius: 3,
    flexShrink: 0,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  exerciseNotes: {
    color: '#666',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 2,
  },

  // Set table
  setHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 8,
  },
  setHeaderText: {
    color: '#444',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  setWeightHeader: {
    flex: 1,
  },
  setRepsHeader: {
    flex: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 4,
  },
  setRowSkipped: {
    opacity: 0.4,
  },
  setNumCell: {
    width: 28,
    alignItems: 'flex-start',
  },
  setNum: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  setWeight: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  setX: {
    color: '#444',
    fontSize: 14,
    marginHorizontal: 4,
  },
  setReps: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 4,
  },

  // Like button
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  likeBtnText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  likeBtnTextActive: {
    color: '#ef4444',
  },

  // Comments
  noComments: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  commentBody: {
    flex: 1,
  },
  commentUser: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  commentContent: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  commentDate: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
  },

  // Bottom padding
  bottomSpacer: {
    height: 80,
  },

  // Comment input bar
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#2a2a2a',
  },
});
