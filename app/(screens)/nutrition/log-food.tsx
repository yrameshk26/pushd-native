import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { logFood, lookupBarcode } from '../../../src/api/nutrition';
import { api } from '../../../src/api/client';
import { MealType } from '../../../src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogMode = 'describe' | 'barcode' | 'manual';

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'DINNER', label: 'Dinner' },
  { key: 'SNACK', label: 'Snack' },
];

const MODES: { key: LogMode; icon: string; label: string }[] = [
  { key: 'describe', icon: 'text-outline', label: 'Describe' },
  { key: 'barcode', icon: 'barcode-outline', label: 'Barcode' },
  { key: 'manual', icon: 'create-outline', label: 'Manual' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LogFoodScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ meal?: string; mealType?: string; date?: string }>();

  const [mode, setMode] = useState<LogMode>('describe');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    ((params.meal ?? params.mealType) as MealType) ?? 'BREAKFAST'
  );
  const date = params.date ?? formatDate(new Date());

  // ── Describe mode state ───────────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // ── Barcode mode state ────────────────────────────────────────────────────
  const [barcode, setBarcode] = useState('');
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);

  // ── Manual / filled form state ────────────────────────────────────────────
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // ── Mutations ─────────────────────────────────────────────────────────────

  const logFoodMutation = useMutation({
    mutationFn: logFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', date] });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to log food. Please try again.');
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const fillForm = useCallback((data: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    setName(data.name);
    setCalories(String(Math.round(data.calories)));
    setProtein(String(Math.round(data.protein)));
    setCarbs(String(Math.round(data.carbs)));
    setFat(String(Math.round(data.fat)));
    setMode('manual');
  }, []);

  const handleAiDescribe = useCallback(async () => {
    if (!description.trim()) return;
    setIsAiLoading(true);
    setAiError('');
    try {
      const { data } = await api.post('/api/nutrition', {
        description: description.trim(),
        mealType: selectedMeal,
        date,
      });
      const entry = data?.data ?? data;
      if (entry?.name) {
        fillForm(entry);
        setDescription('');
      } else {
        setAiError('Could not parse food. Try being more specific.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'AI failed. Try again or enter manually.';
      setAiError(msg);
    } finally {
      setIsAiLoading(false);
    }
  }, [description, selectedMeal, date, fillForm]);

  const handlePhotoLog = useCallback(async () => {
    if (!photoBase64) return;
    setIsAiLoading(true);
    setAiError('');
    try {
      const { data } = await api.post('/api/nutrition', {
        image: photoBase64,
        mimeType: 'image/jpeg',
        mealType: selectedMeal,
        date,
      });
      const entry = data?.data ?? data;
      if (entry?.name) {
        fillForm(entry);
        setPhotoUri(null);
        setPhotoBase64(null);
      } else {
        setAiError('Could not identify food in photo. Try again or enter manually.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'AI failed. Try again or enter manually.';
      setAiError(msg);
    } finally {
      setIsAiLoading(false);
    }
  }, [photoBase64, selectedMeal, date, fillForm]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 ?? null);
    }
  }, []);

  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 ?? null);
    }
  }, []);

  const handleBarcodeSearch = useCallback(async () => {
    if (!barcode.trim()) return;
    setIsBarcodeLoading(true);
    try {
      const result = await lookupBarcode(barcode.trim());
      if (result) {
        fillForm(result);
        setBarcode('');
      } else {
        Alert.alert('Not Found', 'No food found for this barcode. Please enter details manually.');
        setMode('manual');
      }
    } catch {
      Alert.alert('Error', 'Could not look up barcode. Please enter details manually.');
      setMode('manual');
    } finally {
      setIsBarcodeLoading(false);
    }
  }, [barcode, fillForm]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing Info', 'Please enter a food name.');
      return;
    }
    const parsedCalories = parseFloat(calories);
    if (isNaN(parsedCalories) || parsedCalories < 0) {
      Alert.alert('Invalid Calories', 'Please enter a valid calorie amount.');
      return;
    }
    logFoodMutation.mutate({
      name: trimmedName,
      calories: parsedCalories,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      mealType: selectedMeal,
      date,
    });
  }, [name, calories, protein, carbs, fat, selectedMeal, date, logFoodMutation]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heading}>Log Food</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Type Selector */}
          <Text style={styles.label}>Meal</Text>
          <View style={styles.mealRow}>
            {MEAL_TYPES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.mealChip, selectedMeal === key && styles.mealChipActive]}
                onPress={() => setSelectedMeal(key)}
              >
                <Text style={[styles.mealChipText, selectedMeal === key && styles.mealChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mode Tab Switcher */}
          <View style={styles.modeTabs}>
            {MODES.map(({ key, icon, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.modeTab, mode === key && styles.modeTabActive]}
                onPress={() => { setMode(key); setAiError(''); }}
              >
                <Ionicons name={icon as any} size={15} color={mode === key ? '#fff' : '#666'} />
                <Text style={[styles.modeTabText, mode === key && styles.modeTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Describe Tab (AI text) ──────────────────────────────────── */}
          {mode === 'describe' && (
            <View style={styles.section}>
              <Text style={styles.sectionHint}>
                Describe what you ate and AI will estimate the nutrition
              </Text>

              {/* Text input */}
              <View style={styles.describeRow}>
                <TextInput
                  style={styles.describeInput}
                  placeholder="e.g. 2 scrambled eggs with toast, large latte"
                  placeholderTextColor="#555"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  onSubmitEditing={handleAiDescribe}
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                style={[styles.aiBtn, (!description.trim() || isAiLoading) && styles.aiBtnDisabled]}
                onPress={handleAiDescribe}
                disabled={!description.trim() || isAiLoading}
              >
                {isAiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.aiBtnText}>Analyse with AI</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or upload photo</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Photo options */}
              {!photoUri ? (
                <View style={styles.photoGrid}>
                  <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                    <Ionicons name="camera-outline" size={20} color="#888" />
                    <Text style={styles.photoBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                    <Ionicons name="image-outline" size={20} color="#888" />
                    <Text style={styles.photoBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="contain" />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => { setPhotoUri(null); setPhotoBase64(null); }}
                    >
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.aiBtn, { flex: 1 }, isAiLoading && styles.aiBtnDisabled]}
                      onPress={handlePhotoLog}
                      disabled={isAiLoading}
                    >
                      {isAiLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={16} color="#fff" />
                          <Text style={styles.aiBtnText}>Analyse Food</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!!aiError && (
                <Text style={styles.errorText}>{aiError}</Text>
              )}
            </View>
          )}

          {/* ── Barcode Tab ───────────────────────────────────────────────── */}
          {mode === 'barcode' && (
            <View style={styles.section}>
              <Text style={styles.sectionHint}>Enter a product barcode to look up nutrition info</Text>
              <View style={styles.barcodeRow}>
                <View style={styles.barcodeInput}>
                  <Ionicons name="barcode-outline" size={18} color="#555" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.barcodeText}
                    placeholder="Enter barcode number..."
                    placeholderTextColor="#555"
                    value={barcode}
                    onChangeText={setBarcode}
                    keyboardType="number-pad"
                    returnKeyType="search"
                    onSubmitEditing={handleBarcodeSearch}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.barcodeBtn, (isBarcodeLoading || !barcode.trim()) && styles.aiBtnDisabled]}
                  onPress={handleBarcodeSearch}
                  disabled={isBarcodeLoading || !barcode.trim()}
                >
                  {isBarcodeLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.barcodeBtnText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Manual / Filled Form ──────────────────────────────────────── */}
          {mode === 'manual' && (
            <View style={styles.section}>
              <Text style={styles.sectionHint}>Enter nutrition info manually</Text>
            </View>
          )}

          {/* Form always visible when mode === 'manual', or pre-filled after AI/barcode */}
          {mode === 'manual' && (
            <View>
              <Text style={styles.label}>Food Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor="#555"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />

              <Text style={styles.label}>Calories (kcal) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#555"
                value={calories}
                onChangeText={setCalories}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={styles.label}>Macros</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Protein (g)</Text>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    placeholder="0"
                    placeholderTextColor="#555"
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Carbs (g)</Text>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    placeholder="0"
                    placeholderTextColor="#555"
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={styles.macroFieldLabel}>Fat (g)</Text>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    placeholder="0"
                    placeholderTextColor="#555"
                    value={fat}
                    onChangeText={setFat}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>
              </View>

              <View style={styles.dateInfo}>
                <Ionicons name="calendar-outline" size={15} color="#555" />
                <Text style={styles.dateInfoText}>Logging for {date}</Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, logFoodMutation.isPending && styles.aiBtnDisabled]}
                onPress={handleSave}
                disabled={logFoodMutation.isPending}
              >
                {logFoodMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Log Food</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Pre-filled form preview after AI/barcode fill — shows before switching to manual */}
          {mode !== 'manual' && name.length > 0 && (
            <View style={styles.prefillCard}>
              <View style={styles.prefillHeader}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <Text style={styles.prefillTitle}>Found: {name}</Text>
              </View>
              <View style={styles.prefillMacros}>
                <Text style={styles.prefillMacro}>🔥 {calories} kcal</Text>
                <Text style={[styles.prefillMacro, { color: '#3B82F6' }]}>P {protein}g</Text>
                <Text style={[styles.prefillMacro, { color: '#F97316' }]}>C {carbs}g</Text>
                <Text style={[styles.prefillMacro, { color: '#EAB308' }]}>F {fat}g</Text>
              </View>
              <View style={styles.prefillActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setMode('manual')}
                >
                  <Ionicons name="create-outline" size={14} color="#888" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1, marginTop: 0 }, logFoodMutation.isPending && styles.aiBtnDisabled]}
                  onPress={handleSave}
                  disabled={logFoodMutation.isPending}
                >
                  {logFoodMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Log Food</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  content: { paddingHorizontal: 20, paddingTop: 8 },

  label: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },

  mealRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  mealChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  mealChipText: { color: '#888', fontSize: 14, fontWeight: '500' },
  mealChipTextActive: { color: '#fff' },

  // Mode tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  modeTabActive: { backgroundColor: '#0a0a0a' },
  modeTabText: { color: '#666', fontSize: 13, fontWeight: '500' },
  modeTabTextActive: { color: '#fff', fontWeight: '600' },

  section: { marginTop: 16 },
  sectionHint: {
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },

  // AI Describe
  describeRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  describeInput: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 44,
  },

  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
  },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerText: { color: '#555', fontSize: 12 },

  photoGrid: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 20,
  },
  photoBtnText: { color: '#888', fontSize: 13, fontWeight: '500' },

  photoPreviewContainer: { gap: 10 },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  photoActions: { flexDirection: 'row', gap: 10 },
  retakeBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeBtnText: { color: '#888', fontSize: 15 },

  errorText: { color: '#ef4444', fontSize: 13, marginTop: 10 },

  // Barcode
  barcodeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  barcodeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  barcodeText: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  barcodeBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  barcodeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Manual form
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
  macroRow: { flexDirection: 'row', gap: 10 },
  macroField: { flex: 1 },
  macroFieldLabel: { color: '#666', fontSize: 12, marginBottom: 6 },
  macroInput: { paddingHorizontal: 12 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 4 },
  dateInfoText: { color: '#555', fontSize: 13 },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Pre-fill card (shown after AI/barcode fills form)
  prefillCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22C55E44',
    marginTop: 20,
    gap: 12,
  },
  prefillHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefillTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  prefillMacros: { flexDirection: 'row', gap: 12 },
  prefillMacro: { color: '#888', fontSize: 13, fontWeight: '600' },
  prefillActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editBtnText: { color: '#888', fontSize: 14 },
});
