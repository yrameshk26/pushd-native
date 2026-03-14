import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../src/api/client';
import { useWorkoutPrefsStore } from '../../../src/store/workout-prefs';
import { useAuthStore } from '../../../src/store/auth';
import NotificationSettings from '../../../src/components/NotificationSettings';
import { storage } from '../../../src/utils/storage';
import { TOKEN_STORAGE_KEY, API_BASE_URL } from '../../../src/constants/config';

interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  email: string;
  weightUnit: 'KG' | 'LBS';
  avatarUrl?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.toggleLabelGroup}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleSub}>{description}</Text> : null}
      </View>
      <View style={[styles.togglePill, value && styles.togglePillOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// Web-only hidden file input for avatar upload
function WebAvatarInput({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  if (Platform.OS !== 'web') return null;

  // Render a real <input> using React DOM via the ref trick
  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) onFile(f);
      input.value = '';
    };
    document.body.appendChild(input);
    inputRef.current = input;
    return () => { document.body.removeChild(input); };
  }, [onFile]);

  return null;
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const {
    hydrate,
    restTimerEnabled, toggleRestTimer,
    smartRestEnabled, toggleSmartRest,
    soundEnabled, toggleSound,
    hapticsEnabled, toggleHaptics,
  } = useWorkoutPrefsStore();

  useEffect(() => { hydrate(); }, []);

  const { data, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: res } = await api.get('/api/users/me');
      return res?.data ?? res;
    },
  });

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LBS'>('KG');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (data && !initialized) {
      setDisplayName(data.displayName ?? '');
      setUsername(data.username ?? '');
      setBio(data.bio ?? '');
      setWeightUnit(data.weightUnit ?? 'KG');
      setAvatarUrl(data.avatarUrl ?? null);
      setInitialized(true);
    }
  }, [data, initialized]);

  // ── Avatar upload ──────────────────────────────────────────────────────────

  async function uploadAvatarFile(uri: string, type: string, name: string) {
    setAvatarUploading(true);
    try {
      const token = await storage.getItemAsync(TOKEN_STORAGE_KEY);
      const formData = new FormData();
      if (Platform.OS === 'web') {
        // uri is a blob URL on web
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('avatar', blob, name);
      } else {
        formData.append('avatar', { uri, type, name } as any);
      }
      const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      const newUrl = json.data?.avatarUrl ?? json.avatarUrl;
      if (newUrl) {
        setAvatarUrl(newUrl);
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message ?? 'Could not upload photo. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleWebFile(file: File) {
    const uri = URL.createObjectURL(file);
    await uploadAvatarFile(uri, file.type, file.name);
    URL.revokeObjectURL(uri);
  }

  async function handleChangePhoto() {
    if (Platform.OS === 'web') {
      // Trigger hidden file input
      if (webFileInputRef.current) {
        webFileInputRef.current.click();
      } else {
        // Create and click inline
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const f = input.files?.[0];
          if (f) await handleWebFile(f);
        };
        input.click();
      }
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow photo library access to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const type = asset.mimeType ?? 'image/jpeg';
    const name = asset.fileName ?? `avatar.${type.split('/')[1] ?? 'jpg'}`;
    await uploadAvatarFile(asset.uri, type, name);
  }

  // ── Save profile ───────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await api.put('/api/users/me', {
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        weightUnit,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); router.back(); }, 800);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to save changes.';
      Alert.alert('Error', message);
    },
  });

  const logout = useAuthStore((s) => s.logout);

  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm.');
      return;
    }
    setDeleteError('');
    setDeleting(true);
    try {
      await api.delete('/api/users/me');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'Could not delete account. Please try again.';
      setDeleteError(msg);
      setDeleting(false);
      return;
    }
    try { await logout(); } catch { /* ignore */ }
    setDeleting(false);
    setShowDeleteModal(false);
    router.replace('/(auth)/login' as never);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const initials = getInitials(displayName || data?.username || '?');
  const saveBtnLabel = saveMutation.isPending ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (saveMutation.isPending || saveSuccess) && styles.saveBtnActive]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || saveSuccess}
        >
          <Text style={styles.saveBtnText}>{saveBtnLabel}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handleChangePhoto} activeOpacity={0.8} disabled={avatarUploading}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarCameraOverlay}>
              {avatarUploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="camera" size={18} color="#fff" />}
            </View>
          </View>
          <Text style={styles.changePhotoText}>
            {avatarUploading ? 'Uploading…' : 'Tap to change photo'}
          </Text>
        </TouchableOpacity>

        {/* Display Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display Name</Text>
          <TextInput style={styles.fieldInput} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor="#718FAF" maxLength={50} />
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.fieldInput, styles.bioInput]}
            value={bio} onChangeText={setBio}
            placeholder="Tell others about your fitness journey..."
            placeholderTextColor="#718FAF" maxLength={200} multiline numberOfLines={3} textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* Weight Unit */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Weight Unit</Text>
          <View style={styles.segmentRow}>
            {(['KG', 'LBS'] as const).map((unit) => (
              <TouchableOpacity key={unit} style={[styles.segmentBtn, weightUnit === unit && styles.segmentBtnActive]} onPress={() => setWeightUnit(unit)}>
                <Text style={[styles.segmentText, weightUnit === unit && styles.segmentTextActive]}>{unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Workout Preferences */}
        <Text style={styles.sectionLabel}>Workout</Text>
        <View style={styles.card}>
          <ToggleRow label="Auto Rest Timer" description="Starts a countdown after each completed set" value={restTimerEnabled} onToggle={toggleRestTimer} />
          <View style={styles.sep} />
          <ToggleRow label="Smart Rest Timer" description="Adjusts rest duration based on how hard your set was" value={smartRestEnabled} onToggle={toggleSmartRest} />
          <View style={styles.sep} />
          <ToggleRow label="Workout Sounds" description="Audio beeps when sets complete and rest timer ends" value={soundEnabled} onToggle={toggleSound} />
          {Platform.OS !== 'web' && (
            <>
              <View style={styles.sep} />
              <ToggleRow label="Workout Vibration" description="Vibrate on set completion and rest timer alerts" value={hapticsEnabled} onToggle={toggleHaptics} />
            </>
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <NotificationSettings />
        </View>

        {/* Security */}
        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(screens)/settings/security' as never)}>
            <Ionicons name="finger-print-outline" size={20} color="#60a5fa" style={styles.linkIcon} />
            <View style={styles.linkTextGroup}>
              <Text style={styles.linkLabel}>Passkeys &amp; Biometrics</Text>
              <Text style={styles.linkSub}>Set up Face ID or fingerprint login</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4A6080" />
          </TouchableOpacity>
          <View style={styles.sep} />
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(auth)/reset-password' as never)}>
            <Ionicons name="lock-closed-outline" size={20} color="#60a5fa" style={styles.linkIcon} />
            <View style={styles.linkTextGroup}>
              <Text style={styles.linkLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4A6080" />
          </TouchableOpacity>
          <View style={styles.sep} />
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(screens)/settings/security-report' as never)}>
            <Ionicons name="shield-outline" size={20} color="#60a5fa" style={styles.linkIcon} />
            <View style={styles.linkTextGroup}>
              <Text style={styles.linkLabel}>Security &amp; Privacy Report</Text>
              <Text style={styles.linkSub}>How we protect your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4A6080" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/(screens)/profile/contact' as never)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#60a5fa" style={styles.linkIcon} />
            <View style={styles.linkTextGroup}>
              <Text style={styles.linkLabel}>Contact Us</Text>
              <Text style={styles.linkSub}>Feedback, questions or bug reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4A6080" />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          {data?.email ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{data.email}</Text>
              </View>
              <View style={styles.sep} />
            </>
          ) : null}
          <TouchableOpacity style={styles.linkRow} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" style={styles.linkIcon} />
            <Text style={styles.dangerLabel}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={16} color="#4A6080" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete account confirmation modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This permanently deletes all your workouts, routines, progress, and personal data.{'\n\n'}
              Type <Text style={{ color: '#fff', fontWeight: '700' }}>DELETE</Text> to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={(t) => { setDeleteConfirmText(t); setDeleteError(''); }}
              placeholder="Type DELETE"
              placeholderTextColor="#718FAF"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {deleteError ? (
              <Text style={styles.modalError}>{deleteError}</Text>
            ) : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowDeleteModal(false); setDeleteError(''); }}
                disabled={deleting}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDelete, deleting && styles.modalBtnDisabled]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnDeleteText}>Delete Forever</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0B1326',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' ,
    fontFamily: 'BarlowCondensed-Bold'},
  saveBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, minWidth: 68, alignItems: 'center' },
  saveBtnActive: { opacity: 0.75 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  avatarWrap: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#60a5fa', fontSize: 30, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    fontFamily: 'BarlowCondensed-ExtraBold' },
  avatarCameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#060C1B',
  },
  changePhotoText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  fieldInput: { backgroundColor: '#0B1326', borderRadius: 10, borderWidth: 1, borderColor: '#162540', paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15 },
  bioInput: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#718FAF', textAlign: 'right', marginTop: 4 },

  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#162540', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#718FAF' },
  segmentTextActive: { color: '#fff' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#718FAF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 24, marginLeft: 2 },

  card: { backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1, borderColor: '#162540', overflow: 'hidden' },
  sep: { height: 1, backgroundColor: '#162540', marginLeft: 16 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  toggleLabelGroup: { flex: 1 },
  toggleLabel: { fontSize: 15, color: '#fff' },
  toggleSub: { fontSize: 12, color: '#718FAF', marginTop: 2 },
  togglePill: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#162540', justifyContent: 'center', paddingHorizontal: 2 },
  togglePillOn: { backgroundColor: '#3B82F6' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },

  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  linkIcon: { marginRight: 12 },
  linkTextGroup: { flex: 1 },
  linkLabel: { fontSize: 15, color: '#fff' },
  linkSub: { fontSize: 12, color: '#718FAF', marginTop: 1 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { flex: 1, fontSize: 15, color: '#fff' },
  infoValue: { fontSize: 15, color: '#718FAF', maxWidth: '60%', textAlign: 'right' },

  dangerLabel: { flex: 1, fontSize: 15, color: '#ef4444' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#0B1326', borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: '#162540' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff',
    fontFamily: 'BarlowCondensed-Bold', marginBottom: 10 },
  modalBody: { fontSize: 14, color: '#718FAF', lineHeight: 20, marginBottom: 16 },
  modalInput: { backgroundColor: '#060C1B', borderRadius: 10, borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 16, letterSpacing: 2, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: '#162540' },
  modalBtnCancelText: { color: '#fff', fontSize: 15, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold' },
  modalBtnDelete: { backgroundColor: '#ef4444' },
  modalBtnDeleteText: { color: '#fff', fontSize: 15, fontWeight: '700',
    fontFamily: 'DMSans-Bold' },
  modalBtnDisabled: { opacity: 0.4 },
  modalError: { color: '#ef4444', fontSize: 13, marginBottom: 12, fontFamily: 'DMSans-Regular' },
});
