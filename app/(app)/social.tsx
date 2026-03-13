import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api/client';

const SECTIONS = [
  {
    label: 'Following Feed',
    sub: 'Workouts from people you follow',
    icon: 'chatbubble-outline' as const,
    route: '/(screens)/social/feed',
    iconColor: '#60a5fa',
    bgColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.2)',
  },
  {
    label: 'Discover',
    sub: 'Explore public workouts',
    icon: 'compass-outline' as const,
    route: '/(screens)/social/discover',
    iconColor: '#c084fc',
    bgColor: 'rgba(168,85,247,0.1)',
    borderColor: 'rgba(168,85,247,0.2)',
  },
  {
    label: 'Leaderboard',
    sub: 'Top lifters this week',
    icon: 'trophy-outline' as const,
    route: '/(screens)/social/leaderboard',
    iconColor: '#fbbf24',
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  {
    label: 'Challenges',
    sub: 'Weekly & custom fitness challenges',
    icon: 'flag-outline' as const,
    route: '/(screens)/social/challenges',
    iconColor: '#4ade80',
    bgColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.2)',
  },
  {
    label: 'Find People',
    sub: 'Search and follow other athletes',
    icon: 'search-outline' as const,
    route: '/(screens)/social/search',
    iconColor: '#fb923c',
    bgColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.2)',
  },
];

export default function SocialScreen() {
  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['user-streak'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/streak');
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const { data: feedPreview } = useQuery<{ data: unknown[] }>({
    queryKey: ['feed-preview'],
    queryFn: async () => {
      const { data } = await api.get('/api/feed', { params: { tab: 'following', limit: 3 } });
      return data;
    },
    staleTime: 60_000,
  });

  const newCount = feedPreview?.data?.length ?? 0;
  const streak = streakData?.streak ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>Social</Text>
            <Text style={styles.subtitle}>Connect, compete, and get inspired</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#fb923c" />
              <Text style={styles.streakText}>{streak}d</Text>
            </View>
          )}
        </View>

        {/* Community stats banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <Ionicons name="flash" size={16} color="#60a5fa" />
            <Text style={styles.bannerLabel}>Community</Text>
          </View>
          <Text style={styles.bannerSub}>
            {newCount > 0
              ? `${newCount} new workout${newCount > 1 ? 's' : ''} from people you follow`
              : 'See what the community is lifting'}
          </Text>
          <TouchableOpacity
            style={styles.bannerLink}
            onPress={() => router.push('/(screens)/social/feed' as never)}
          >
            <Text style={styles.bannerLinkText}>View feed</Text>
            <Ionicons name="chevron-forward" size={12} color="#60a5fa" />
          </TouchableOpacity>
        </View>

        {/* Section cards */}
        {SECTIONS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as never)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}>
              <Ionicons name={item.icon} size={20} color={item.iconColor} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#444" />
          </TouchableOpacity>
        ))}

        {/* Grow your network */}
        <TouchableOpacity
          style={styles.networkCard}
          onPress={() => router.push('/(screens)/social/search' as never)}
          activeOpacity={0.75}
        >
          <Ionicons name="people-outline" size={20} color="#666" />
          <View style={styles.networkText}>
            <Text style={styles.networkLabel}>Grow your network</Text>
            <Text style={styles.networkSub}>Find athletes to follow</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#444" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: '#fb923c' },

  banner: {
    backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  bannerLabel: { fontSize: 13, fontWeight: '600', color: '#60a5fa' },
  bannerSub: { fontSize: 12, color: '#666', marginBottom: 8 },
  bannerLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bannerLinkText: { fontSize: 12, fontWeight: '700', color: '#60a5fa' },

  card: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardText: { flex: 1 },
  cardLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSub: { color: '#666', fontSize: 12 },

  networkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#141414', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2a2a2a', marginTop: 4,
  },
  networkText: { flex: 1 },
  networkLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  networkSub: { color: '#666', fontSize: 12, marginTop: 1 },
});
