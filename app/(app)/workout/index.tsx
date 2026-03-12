import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Workout</Text>
        <Text style={styles.sub}>Ready to train?</Text>

        <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/(app)/workout/active')}>
          <Text style={styles.startText}>Start Empty Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.routineBtn} onPress={() => router.push('/(app)/routines')}>
          <Text style={styles.routineText}>Start from Routine</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  sub: { color: '#888', fontSize: 16, marginBottom: 48 },
  startBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
  },
  startText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  routineBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14, borderWidth: 1,
    borderColor: '#2a2a2a', paddingVertical: 18, alignItems: 'center',
  },
  routineText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
