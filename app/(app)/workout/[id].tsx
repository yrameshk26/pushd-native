import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWorkout, likeWorkout, fetchComments, addComment, deleteWorkout } from '../../../src/api/workouts';
import { SavedWorkoutSet, Comment } from '../../../src/types';

function formatDuration(seconds: number): string {
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

function SetRow({ set, index }: { set: SavedWorkoutSet; index: number }) {
  const typeLabel: Record<string, string> = {
    WARMUP: 'W', DROP: 'D', FAILURE: 'F', NORMAL: `${index + 1}`,
  };
  return (
    <View style={[styles.setRow, !set.isCompleted && styles.setRowSkipped]}>
      <Text style={[styles.setNum, set.type !== 'NORMAL' && styles.setNumSpecial]}>
        {typeLabel[set.type]}
      </Text>
      <Text style={styles.setWeight}>{set.weight ?? '—'} kg</Text>
      <Text style={styles.setX}>×</Text>
      <Text style={styles.setReps}>{set.reps ?? '—'}</Text>
      {set.isPR && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
        </View>
      )}
      {!set.isCompleted && <Text style={styles.skippedLabel}>skipped</Text>}
    </View>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>
          {comment.user.displayName.charAt(0).toUpperCase()}
        </Text>
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

  const handleSubmitComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    commentMutation.mutate(trimmed);
  }, [commentText, commentMutation]);

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

  const totalSets = workout.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.isCompleted).length, 0);
  const comments = commentsData?.comments ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{workout.title}</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Workout meta */}
          <Text style={styles.workoutDate}>{formatDate(workout.completedAt)}</Text>

          {/* Stats cards */}
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
            {workout.prCount > 0 && (
              <View style={[styles.statCard, styles.statCardPR]}>
                <Ionicons name="trophy-outline" size={20} color="#FFD700" />
                <Text style={[styles.statValue, { color: '#FFD700' }]}>{workout.prCount}</Text>
                <Text style={[styles.statLabel, { color: '#a89030' }]}>PRs</Text>
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

          {/* Exercises */}
          <Text style={styles.sectionTitle}>Exercises</Text>
          {workout.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              {exercise.notes ? (
                <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
              ) : null}
              <View style={styles.setHeaders}>
                <Text style={[styles.setHeaderText, { width: 24 }]}>SET</Text>
                <Text style={styles.setHeaderText}>WEIGHT</Text>
                <Text style={[styles.setHeaderText, { marginHorizontal: 8 }]}></Text>
                <Text style={styles.setHeaderText}>REPS</Text>
              </View>
              {exercise.sets.map((set, i) => (
                <SetRow key={set.id} set={set} index={i} />
              ))}
            </View>
          ))}

          {/* Like button */}
          <TouchableOpacity
            style={styles.likeBtn}
            onPress={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Ionicons
              name={workout.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={workout.isLiked ? '#ff4757' : '#888'}
            />
            <Text style={[styles.likeBtnText, workout.isLiked && { color: '#ff4757' }]}>
              {workout.likesCount} {workout.likesCount === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>

          {/* Comments */}
          <Text style={styles.sectionTitle}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            comments.map((c) => <CommentItem key={c.id} comment={c} />)
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Comment input */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#555"
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#331111',
  },
  content: { padding: 16 },
  workoutDate: { color: '#888', fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a', gap: 4,
  },
  statCardPR: { borderColor: '#4a3a00' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#2a2a2a',
  },
  notesLabel: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  notesText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    color: '#888', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a',
  },
  exerciseName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  exerciseNotes: { color: '#666', fontSize: 13, marginBottom: 10 },
  setHeaders: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 8 },
  setHeaderText: { color: '#444', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, flex: 1 },
  setRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#222',
  },
  setRowSkipped: { opacity: 0.4 },
  setNum: { width: 24, color: '#888', fontSize: 13, fontWeight: '600' },
  setNumSpecial: { color: '#6C63FF' },
  setWeight: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  setX: { color: '#444', fontSize: 14, marginHorizontal: 8 },
  setReps: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  prBadge: {
    backgroundColor: '#2a1a6e', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#6C63FF', marginLeft: 8,
  },
  prText: { color: '#6C63FF', fontSize: 10, fontWeight: '700' },
  skippedLabel: { color: '#555', fontSize: 11, marginLeft: 8 },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginVertical: 8,
    backgroundColor: '#1a1a1a', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  likeBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  noComments: { color: '#555', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  commentItem: {
    flexDirection: 'row', gap: 12, marginBottom: 16,
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center',
  },
  commentAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  commentBody: { flex: 1 },
  commentUser: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  commentContent: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  commentDate: { color: '#555', fontSize: 12, marginTop: 4 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1a1a1a',
    backgroundColor: '#0a0a0a', gap: 10,
  },
  commentInput: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, color: '#fff',
    fontSize: 15, borderWidth: 1, borderColor: '#2a2a2a',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2a2a2a' },
});
