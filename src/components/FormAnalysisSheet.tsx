/**
 * FormAnalysisSheet
 *
 * AI-powered exercise form analysis bottom sheet.
 *
 * NOTE: This component requires expo-image-picker.
 * Install it by running: npx expo install expo-image-picker
 * Then add to app.json under "expo.plugins":
 *   ["expo-image-picker", { "photosPermission": "Allow pushd to access your photos." }]
 *
 * If expo-image-picker is unavailable, a URL paste fallback is shown instead.
 */

import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Alert, TextInput, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedbackPoint {
  type: 'good' | 'warning' | 'error';
  text: string;
}

interface FormAnalysisResult {
  score: number;
  summary: string;
  feedback: FeedbackPoint[];
  cues: string[];
}

interface AnalysisApiResponse {
  data: FormAnalysisResult;
}

interface FormAnalysisSheetProps {
  visible: boolean;
  exerciseName: string;
  onClose: () => void;
}

type SheetStep = 'pick' | 'analyzing' | 'result' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tryRequireImagePicker() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as typeof import('expo-image-picker');
  } catch {
    return null;
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function feedbackIcon(type: FeedbackPoint['type']): { name: string; color: string } {
  switch (type) {
    case 'good':    return { name: 'checkmark-circle',    color: '#22c55e' };
    case 'warning': return { name: 'warning',             color: '#f59e0b' };
    case 'error':   return { name: 'close-circle',        color: '#ef4444' };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <View style={[scoreRingStyles.ring, { borderColor: color }]}>
      <Text style={[scoreRingStyles.number, { color }]}>{score}</Text>
      <Text style={scoreRingStyles.label}>/ 100</Text>
    </View>
  );
}

const scoreRingStyles = StyleSheet.create({
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  number: { fontSize: 32, fontWeight: '800' },
  label: { color: '#666', fontSize: 12, fontWeight: '600' },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FormAnalysisSheet({ visible, exerciseName, onClose }: FormAnalysisSheetProps) {
  const [step, setStep] = useState<SheetStep>('pick');
  const [result, setResult] = useState<FormAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  const hasImagePicker = tryRequireImagePicker() !== null;

  // ------------------------------------------------------------------
  // Reset when sheet closes / reopens
  // ------------------------------------------------------------------

  const handleClose = useCallback(() => {
    setStep('pick');
    setResult(null);
    setErrorMessage('');
    setUrlInput('');
    setShowUrlFallback(false);
    onClose();
  }, [onClose]);

  // ------------------------------------------------------------------
  // Pick media via expo-image-picker
  // ------------------------------------------------------------------

  const handlePickMedia = useCallback(async () => {
    const ImagePicker = tryRequireImagePicker();

    if (!ImagePicker) {
      setShowUrlFallback(true);
      return;
    }

    Alert.alert('Analyze Form', 'Choose media', [
      {
        text: 'Take Photo / Video',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required.');
            return;
          }
          const picked = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.7,
            allowsEditing: false,
            videoMaxDuration: 30,
          });
          if (!picked.canceled && picked.assets[0]) {
            await runAnalysis(picked.assets[0].uri, 'uri');
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Library access is required.');
            return;
          }
          const picked = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.7,
            allowsEditing: false,
          });
          if (!picked.canceled && picked.assets[0]) {
            await runAnalysis(picked.assets[0].uri, 'uri');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [exerciseName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Paste URL fallback
  // ------------------------------------------------------------------

  const handleUrlSubmit = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      Alert.alert('No URL', 'Please paste a valid media URL.');
      return;
    }
    await runAnalysis(trimmed, 'url');
  }, [urlInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Core: call AI API
  // ------------------------------------------------------------------

  const runAnalysis = async (mediaValue: string, mode: 'uri' | 'url') => {
    setStep('analyzing');
    setResult(null);
    setErrorMessage('');

    try {
      const payload =
        mode === 'url'
          ? { exerciseName, mediaUrl: mediaValue }
          : { exerciseName, base64: mediaValue };

      const { data } = await api.post<AnalysisApiResponse>('/api/ai/form-analysis', payload);
      setResult(data.data);
      setStep('result');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setErrorMessage(message);
      setStep('error');
    }
  };

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  const renderPickStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.subtitle}>
        Upload a photo or short video of your form to get instant AI coaching feedback.
      </Text>

      {!showUrlFallback ? (
        <>
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePickMedia}>
            <Ionicons name="videocam-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {hasImagePicker ? 'Select Photo / Video' : 'Select Media'}
            </Text>
          </TouchableOpacity>

          {!hasImagePicker && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowUrlFallback(true)}
            >
              <Ionicons name="link-outline" size={18} color="#6C63FF" />
              <Text style={styles.secondaryBtnText}>Paste Media URL instead</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.urlFallback}>
          <Text style={styles.urlFallbackLabel}>Paste a video or image URL</Text>
          <TextInput
            style={styles.urlInput}
            placeholder="https://..."
            placeholderTextColor="#555"
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="done"
          />
          <View style={styles.urlActions}>
            <TouchableOpacity
              style={styles.urlCancelBtn}
              onPress={() => { setShowUrlFallback(false); setUrlInput(''); }}
            >
              <Text style={styles.urlCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.urlSubmitBtn]}
              onPress={handleUrlSubmit}
            >
              <Ionicons name="sparkles-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.tip}>
        Best results: side-angle view showing full body range of motion.
      </Text>
    </View>
  );

  const renderAnalyzingStep = () => (
    <View style={[styles.stepContainer, styles.centeredStep]}>
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text style={styles.analyzingText}>Analyzing your form...</Text>
      <Text style={styles.analyzingSubtext}>This usually takes 5-10 seconds</Text>
    </View>
  );

  const renderResultStep = () => {
    if (!result) return null;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultScroll}>
        {/* Score */}
        <View style={styles.scoreRow}>
          <ScoreRing score={result.score} />
          <View style={styles.scoreMeta}>
            <Text style={styles.scoreLabel}>Form Score</Text>
            <Text style={[styles.scoreGrade, { color: scoreColor(result.score) }]}>
              {result.score >= 80 ? 'Excellent' : result.score >= 60 ? 'Good' : 'Needs Work'}
            </Text>
            <Text style={styles.scoreSummary}>{result.summary}</Text>
          </View>
        </View>

        {/* Feedback points */}
        {result.feedback.length > 0 && (
          <View style={styles.feedbackCard}>
            <Text style={styles.cardTitle}>Feedback</Text>
            {result.feedback.map((point, idx) => {
              const icon = feedbackIcon(point.type);
              return (
                <View key={idx} style={styles.feedbackRow}>
                  <Ionicons
                    name={icon.name as 'checkmark-circle' | 'warning' | 'close-circle'}
                    size={18}
                    color={icon.color}
                  />
                  <Text style={styles.feedbackText}>{point.text}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Coaching cues */}
        {result.cues.length > 0 && (
          <View style={styles.cuesCard}>
            <Text style={styles.cardTitle}>Coaching Cues</Text>
            {result.cues.map((cue, idx) => (
              <View key={idx} style={styles.cueRow}>
                <Ionicons name="bulb-outline" size={16} color="#6C63FF" />
                <Text style={styles.cueText}>{cue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Try again */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => { setStep('pick'); setResult(null); setShowUrlFallback(false); }}
        >
          <Ionicons name="refresh-outline" size={18} color="#6C63FF" />
          <Text style={styles.secondaryBtnText}>Analyze Another</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderErrorStep = () => (
    <View style={[styles.stepContainer, styles.centeredStep]}>
      <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
      <Text style={styles.errorTitle}>Analysis Failed</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => { setStep('pick'); setErrorMessage(''); }}
      >
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Form Analysis</Text>
            <Text style={styles.sheetSubtitle}>{exerciseName}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.sheetBody}>
          {step === 'pick'      && renderPickStep()}
          {step === 'analyzing' && renderAnalyzingStep()}
          {step === 'result'    && renderResultStep()}
          {step === 'error'     && renderErrorStep()}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    gap: 16,
  },
  centeredStep: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#2a2a50',
    backgroundColor: '#1a1a2e',
  },
  secondaryBtnText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  tip: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  urlFallback: {
    gap: 12,
  },
  urlFallbackLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  urlInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  urlActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  urlCancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  urlCancelText: {
    color: '#888',
    fontSize: 14,
  },
  urlSubmitBtn: {
    flex: 1,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  analyzingSubtext: {
    color: '#555',
    fontSize: 13,
  },
  resultScroll: {
    gap: 16,
    paddingBottom: 40,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  scoreMeta: {
    flex: 1,
    gap: 4,
  },
  scoreLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreGrade: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreSummary: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cuesCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  cardTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  feedbackText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cueText: {
    flex: 1,
    color: '#aac',
    fontSize: 14,
    lineHeight: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  errorMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
