/**
 * WorkoutPhotoUpload
 *
 * NOTE: This component requires expo-image-picker.
 * Install it by running: npx expo install expo-image-picker
 * Then add the following to app.json under "expo.plugins":
 *   ["expo-image-picker", { "photosPermission": "Allow pushd to access your photos." }]
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkoutPhoto {
  id: string;
  url: string;
  createdAt: string;
}

interface PhotosResponse {
  photos: WorkoutPhoto[];
}

interface UploadResponse {
  photo: WorkoutPhoto;
}

interface WorkoutPhotoUploadProps {
  workoutId: string;
  onUploaded?: (url: string) => void;
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkoutPhotoUpload({ workoutId, onUploaded }: WorkoutPhotoUploadProps) {
  const [photos, setPhotos] = useState<WorkoutPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Load existing photos
  // ------------------------------------------------------------------

  const loadPhotos = useCallback(async () => {
    setIsLoadingPhotos(true);
    setFetchError(null);
    try {
      const { data } = await api.get<PhotosResponse>(`/api/workouts/${workoutId}/photos`);
      setPhotos(data.photos ?? []);
    } catch {
      setFetchError('Could not load photos. Tap to retry.');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // ------------------------------------------------------------------
  // Pick image
  // ------------------------------------------------------------------

  const handleAddPhoto = useCallback(() => {
    const ImagePicker = tryRequireImagePicker();

    if (!ImagePicker) {
      Alert.alert(
        'Package Required',
        'Photo upload requires expo-image-picker. Run: npx expo install expo-image-picker',
      );
      return;
    }

    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to take photos.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Photo library access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [workoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Upload
  // ------------------------------------------------------------------

  const uploadPhoto = async (uri: string) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const filename = uri.split('/').pop() ?? 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      // React Native FormData accepts the object shape below
      formData.append('photo', { uri, name: filename, type } as unknown as Blob);

      const { data } = await api.post<UploadResponse>(
        `/api/workouts/${workoutId}/photos`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(pct);
            }
          },
        },
      );

      const newPhoto = data.photo;
      setPhotos((prev) => [...prev, newPhoto]);
      onUploaded?.(newPhoto.url);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------

  const handleDeletePhoto = useCallback(
    (photo: WorkoutPhoto) => {
      Alert.alert('Remove Photo', 'Delete this photo from your workout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(photo.id);
            try {
              await api.delete(`/api/workouts/${workoutId}/photos/${photo.id}`);
              setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            } catch {
              Alert.alert('Error', 'Could not delete photo. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    },
    [workoutId],
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddPhoto}
          disabled={isUploading}
        >
          <Ionicons name="camera-outline" size={16} color="#6C63FF" />
          <Text style={styles.addBtnText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Upload progress */}
      {isUploading && (
        <View style={styles.uploadProgress}>
          <ActivityIndicator size="small" color="#6C63FF" />
          <Text style={styles.uploadProgressText}>
            Uploading{uploadProgress > 0 ? ` ${uploadProgress}%` : '...'}
          </Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Loading state */}
      {isLoadingPhotos && (
        <View style={styles.centeredRow}>
          <ActivityIndicator size="small" color="#6C63FF" />
        </View>
      )}

      {/* Fetch error */}
      {fetchError && !isLoadingPhotos && (
        <TouchableOpacity style={styles.errorRow} onPress={loadPhotos}>
          <Ionicons name="alert-circle-outline" size={16} color="#ff4444" />
          <Text style={styles.errorText}>{fetchError}</Text>
        </TouchableOpacity>
      )}

      {/* Empty state */}
      {!isLoadingPhotos && !fetchError && photos.length === 0 && !isUploading && (
        <TouchableOpacity style={styles.emptyState} onPress={handleAddPhoto}>
          <Ionicons name="images-outline" size={32} color="#444" />
          <Text style={styles.emptyStateText}>Tap to add workout photos</Text>
        </TouchableOpacity>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoWrapper}>
              <Image source={{ uri: photo.url }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity
                style={styles.deleteOverlay}
                onPress={() => handleDeletePhoto(photo)}
                disabled={deletingId === photo.id}
              >
                {deletingId === photo.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a50',
  },
  addBtnText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadProgress: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  uploadProgressText: {
    color: '#888',
    fontSize: 13,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 2,
  },
  centeredRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateText: {
    color: '#555',
    fontSize: 13,
  },
  photoRow: {
    gap: 10,
    paddingTop: 4,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  deleteOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 1,
  },
});
