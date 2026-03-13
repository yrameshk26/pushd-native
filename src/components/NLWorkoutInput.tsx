import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export interface ParsedExercise {
  exerciseName: string;
  exerciseId?: string | null;
  sets: number;
  reps: number;
  weight: number;
  thumbnailUrl?: string | null;
  gifUrl?: string | null;
}

interface Props {
  onParsed: (exercises: ParsedExercise[]) => void;
  onClose: () => void;
}

export function NLWorkoutInput({ onParsed, onClose }: Props) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedExercise[] | null>(null);

  const handleParse = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const { data } = await api.post<{ exercises: ParsedExercise[] }>(
        '/api/ai/parse-workout',
        { text: trimmed },
      );
      const exercises = data.exercises ?? [];
      if (exercises.length === 0) {
        setError('Could not parse any exercises. Try a format like "3x8 bench press 80kg".');
      } else {
        setPreview(exercises);
      }
    } catch {
      setError('Failed to parse workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!preview || preview.length === 0) return;
    onParsed(preview);
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setPreview(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AI Parse</Text>
            <Text style={styles.subtitle}>Describe your workout in plain text</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Text input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder={'e.g. 3x8 bench press 80kg, 4x10 squats 100kg'}
              placeholderTextColor="#4A6080"
              value={text}
              onChangeText={(v) => {
                setText(v);
                setPreview(null);
                setError(null);
              }}
              multiline
              autoFocus
              returnKeyType="done"
            />
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Parse button */}
          {!preview && (
            <TouchableOpacity
              style={[styles.parseBtn, (!text.trim() || isLoading) && styles.parseBtnDisabled]}
              onPress={handleParse}
              disabled={!text.trim() || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  <Text style={styles.parseBtnText}>Parse Workout</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Parsed preview</Text>
              <FlatList
                data={preview}
                keyExtractor={(_, i) => String(i)}
                scrollEnabled={false}
                contentContainerStyle={styles.previewList}
                renderItem={({ item }) => (
                  <View style={styles.previewRow}>
                    <View style={styles.previewIcon}>
                      <Ionicons name="barbell-outline" size={15} color="#3B82F6" />
                    </View>
                    <View style={styles.previewInfo}>
                      <Text style={styles.previewName}>{item.exerciseName}</Text>
                      <Text style={styles.previewMeta}>
                        {item.sets} sets × {item.reps} reps
                        {item.weight > 0 ? ` @ ${item.weight}kg` : ''}
                      </Text>
                    </View>
                  </View>
                )}
              />

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => setPreview(null)}
                >
                  <Text style={styles.retryBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.confirmBtnText}>Add to Workout</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },
  subtitle: { fontSize: 13, color: '#718FAF', marginTop: 3, fontFamily: 'DMSans-Regular' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0B1326',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1, padding: 16, gap: 14 },
  inputWrapper: {
    backgroundColor: '#0B1326',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#162540',
    padding: 14,
    minHeight: 100,
  },
  textInput: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'DMSans-Regular',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1a0a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorText: { color: '#ff6666', fontSize: 13, flex: 1, fontFamily: 'DMSans-Regular' },
  parseBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  parseBtnDisabled: { opacity: 0.5 },
  parseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: 'DMSans-Bold' },
  previewSection: { gap: 12 },
  previewLabel: { color: '#718FAF', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'BarlowCondensed-SemiBold' },
  previewList: { gap: 8 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B1326',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#162540',
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#111D36',
    borderWidth: 1,
    borderColor: '#111D36',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: { flex: 1 },
  previewName: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  previewMeta: { color: '#718FAF', fontSize: 12, marginTop: 2, fontFamily: 'DMSans-Regular' },
  previewActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderWidth: 1,
    borderColor: '#162540',
  },
  retryBtnText: { color: '#A8BDD4', fontWeight: '600', fontSize: 14, fontFamily: 'DMSans-SemiBold' },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'DMSans-Bold' },
});
