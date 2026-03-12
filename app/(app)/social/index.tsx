import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ITEMS = [
  { label: 'Following Feed', sub: 'Workouts from people you follow', icon: 'people-outline', route: '/(app)/social/feed' },
  { label: 'Discover', sub: 'Browse public workouts', icon: 'compass-outline', route: '/(app)/social/discover' },
  { label: 'Leaderboard', sub: 'Top lifters this week', icon: 'trophy-outline', route: '/(app)/social/leaderboard' },
  { label: 'Challenges', sub: 'Weekly and custom challenges', icon: 'flash-outline', route: '/(app)/social/challenges' },
  { label: 'Find People', sub: 'Search for other users', icon: 'search-outline', route: '/(app)/social/search' },
];

export default function SocialScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Community</Text>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.route} style={styles.card} onPress={() => router.push(item.route as never)}>
            <View style={styles.iconBox}>
              <Ionicons name={item.icon as never} size={22} color="#6C63FF" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#0d0d1f',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardText: { flex: 1 },
  cardLabel: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardSub: { color: '#666', fontSize: 13 },
});
