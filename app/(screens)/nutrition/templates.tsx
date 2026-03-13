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
  fetchTemplates,
  saveTemplate,
  logTemplate,
  deleteTemplate,
} from '../../../src/api/nutrition';
import { MealTemplate } from '../../../src/types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function TemplatesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dateStr = formatDate(new Date());

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['meal-templates'],
    queryFn: fetchTemplates,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (name: string) => saveTemplate({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-templates'] });
      setShowSaveModal(false);
      setTemplateName('');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save template. Please try again.');
    },
  });

  const logTemplateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => logTemplate(id, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', dateStr] });
      Alert.alert('Logged!', 'Template added to today\'s food log.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to log template. Please try again.');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-templates'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete template.');
    },
  });

  const handleSave = useCallback(() => {
    if (!templateName.trim()) {
      Alert.alert('Missing Name', 'Please enter a template name.');
      return;
    }
    saveTemplateMutation.mutate(templateName.trim());
  }, [templateName, saveTemplateMutation]);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert('Delete Template', `Delete "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTemplateMutation.mutate(id),
        },
      ]);
    },
    [deleteTemplateMutation]
  );

  const handleLog = useCallback(
    (template: MealTemplate) => {
      Alert.alert(
        'Log Template',
        `Add "${template.name}" to today's food log?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log',
            onPress: () => logTemplateMutation.mutate({ id: template.id }),
          },
        ]
      );
    },
    [logTemplateMutation]
  );

  const templates = templatesQuery.data?.templates ?? [];
  const isLoading = templatesQuery.isLoading;
  const isError = templatesQuery.isError;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Meal Templates</Text>
        <TouchableOpacity
          style={styles.saveNewBtn}
          onPress={() => setShowSaveModal(true)}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load templates.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => templatesQuery.refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Save Current Meal Banner */}
          <TouchableOpacity
            style={styles.saveBanner}
            onPress={() => setShowSaveModal(true)}
          >
            <Ionicons name="bookmark-outline" size={20} color="#3B82F6" />
            <View style={styles.saveBannerText}>
              <Text style={styles.saveBannerTitle}>Save Current Meal as Template</Text>
              <Text style={styles.saveBannerSub}>
                Quickly re-log a meal you eat regularly
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#718FAF" />
          </TouchableOpacity>

          {/* Templates list */}
          <Text style={styles.sectionTitle}>
            Saved Templates ({templates.length})
          </Text>

          {templates.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bookmark-outline" size={40} color="#162540" />
              <Text style={styles.emptyText}>No templates saved yet</Text>
              <Text style={styles.emptySubText}>
                Save a frequently eaten meal to quickly log it in the future
              </Text>
            </View>
          ) : (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onLog={() => handleLog(template)}
                onDelete={() => handleDelete(template.id, template.name)}
                isLogging={
                  logTemplateMutation.isPending &&
                  logTemplateMutation.variables?.id === template.id
                }
              />
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Save Template Modal */}
      <Modal visible={showSaveModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save as Template</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSaveModal(false);
                  setTemplateName('');
                }}
              >
                <Ionicons name="close" size={24} color="#718FAF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Template Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Post-Workout Meal"
              placeholderTextColor="#718FAF"
              value={templateName}
              onChangeText={setTemplateName}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                saveTemplateMutation.isPending && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Template</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function TemplateCard({
  template,
  onLog,
  onDelete,
  isLogging,
}: {
  template: MealTemplate;
  onLog: () => void;
  onDelete: () => void;
  isLogging: boolean;
}) {
  return (
    <View style={styles.templateCard}>
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{template.name}</Text>
        <View style={styles.templateMacros}>
          <Text style={styles.templateCalories}>
            {Math.round(template.calories)} kcal
          </Text>
          {template.protein != null && (
            <Text style={styles.macroChip}>P {Math.round(template.protein)}g</Text>
          )}
          {template.carbs != null && (
            <Text style={styles.macroChip}>C {Math.round(template.carbs)}g</Text>
          )}
          {template.fat != null && (
            <Text style={styles.macroChip}>F {Math.round(template.fat)}g</Text>
          )}
        </View>
      </View>
      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={onLog}
          disabled={isLogging}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.logBtnText}>Log</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#718FAF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff' ,
    fontFamily: 'BarlowCondensed-Bold'},
  saveNewBtn: { padding: 4 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  saveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#3B82F615',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3B82F644',
    marginBottom: 20,
  },
  saveBannerText: { flex: 1 },
  saveBannerTitle: { color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  saveBannerSub: { color: '#718FAF', fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'BarlowCondensed-SemiBold',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#0B1326',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 10,
  },
  emptyText: { color: '#718FAF', fontSize: 15, fontWeight: '600' },
  emptySubText: {
    color: '#4A6080',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { color: '#718FAF', fontSize: 15 },
  retryBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 12,
  },
  templateInfo: { flex: 1 },
  templateName: { color: '#fff', fontSize: 15, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', marginBottom: 6 },
  templateMacros: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  templateCalories: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  macroChip: { color: '#718FAF', fontSize: 12 },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 64,
    justifyContent: 'center',
  },
  logBtnText: { color: '#fff', fontSize: 13, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  deleteBtn: { padding: 4 },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#0B1326',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold' },
  label: {
    color: '#718FAF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'BarlowCondensed-SemiBold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0B1326',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#162540',
  },
  saveBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
});
