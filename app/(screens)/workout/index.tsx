import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../../src/store/workout';

export default function WorkoutScreen() {
  const active = useWorkoutStore((s) => s.active);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  // If a session is already active, go straight to it — mirrors PWA behaviour
  useEffect(() => {
    if (active) {
      router.replace('/(screens)/workout/active');
    }
  }, [active]);

  function handleStartEmpty() {
    startWorkout('My Workout');
    router.push('/(screens)/workout/active');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Start Workout</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={handleStartEmpty}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="add" size={20} color="#60a5fa" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Empty Workout</Text>
            <Text style={styles.cardSub}>Add exercises as you go</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: 12,
    padding: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59,130,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    gap: 2,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardSub: {
    color: '#888',
    fontSize: 12,
  },
});
