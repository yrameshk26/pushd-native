import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchUserStats, Achievement } from '../../../src/api/progress';

type Tier = Achievement['tier'];

const TIER_COLORS: Record<Tier, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#F59E0B',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#9BD5FF',
};

const TIER_LABELS: Record<Tier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
};

const TIER_ORDER: Tier[] = ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];

const DEFAULT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  first_workout: 'barbell-outline',
  streak: 'flame-outline',
  volume: 'layers-outline',
  pr: 'trophy-outline',
  consistency: 'calendar-outline',
  social: 'people-outline',
};

function getIcon(achievement: Achievement): keyof typeof Ionicons.glyphMap {
  if (achievement.icon && achievement.icon in Ionicons.glyphMap) {
    return achievement.icon as keyof typeof Ionicons.glyphMap;
  }
  for (const [key, icon] of Object.entries(DEFAULT_ICON_MAP)) {
    if (achievement.key.toLowerCase().includes(key)) return icon;
  }
  return 'ribbon-outline';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const tierColor = TIER_COLORS[achievement.tier];
  const icon = getIcon(achievement);
  const isEarned = achievement.isEarned;

  return (
    <View style={[styles.achCard, !isEarned && styles.achCardLocked]}>
      <View style={[styles.iconCircle, { backgroundColor: isEarned ? tierColor + '22' : '#111D36' }]}>
        <Ionicons name={icon} size={24} color={isEarned ? tierColor : '#162540'} />
      </View>
      <View style={[styles.tierPill, { backgroundColor: isEarned ? tierColor + '33' : '#111D36' }]}>
        <Text style={[styles.tierLabel, { color: isEarned ? tierColor : '#162540' }]}>
          {TIER_LABELS[achievement.tier]}
        </Text>
      </View>
      <Text style={[styles.achName, !isEarned && styles.achNameLocked]} numberOfLines={2}>
        {achievement.name}
      </Text>
      <Text style={[styles.achDesc, !isEarned && styles.achDescLocked]} numberOfLines={3}>
        {achievement.description}
      </Text>
      {isEarned && achievement.earnedAt && (
        <Text style={styles.earnedDate}>{formatDate(achievement.earnedAt)}</Text>
      )}
      {!isEarned && (
        <View style={styles.lockRow}>
          <Ionicons name="lock-closed-outline" size={12} color="#4A6080" />
          <Text style={styles.lockText}>Locked</Text>
        </View>
      )}
    </View>
  );
}

export default function AchievementsScreen() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
  });

  const achievements = data?.achievements ?? [];
  const earnedCount = data?.earnedAchievementCount ?? 0;
  const totalCount = data?.totalAchievementCount ?? achievements.length;

  // Group by tier
  const grouped = TIER_ORDER.reduce<Record<Tier, Achievement[]>>(
    (acc, tier) => {
      acc[tier] = achievements.filter((a) => a.tier === tier);
      return acc;
    },
    { DIAMOND: [], PLATINUM: [], GOLD: [], SILVER: [], BRONZE: [] },
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#718FAF" />
          <Text style={styles.errorText}>Could not load achievements.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress Banner */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Ionicons name="medal-outline" size={28} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.progressTitle}>
                  {earnedCount} / {totalCount} Earned
                </Text>
                <Text style={styles.progressSub}>
                  {totalCount - earnedCount} more to unlock
                </Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: totalCount > 0 ? `${(earnedCount / totalCount) * 100}%` : '0%' },
                ]}
              />
            </View>
          </View>

          {/* Grouped by Tier */}
          {TIER_ORDER.map((tier) => {
            const tierAchs = grouped[tier];
            if (tierAchs.length === 0) return null;
            return (
              <View key={tier} style={styles.tierSection}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[tier] }]} />
                  <Text style={[styles.tierTitle, { color: TIER_COLORS[tier] }]}>
                    {TIER_LABELS[tier]}
                  </Text>
                  <Text style={styles.tierCount}>
                    {tierAchs.filter((a) => a.isEarned).length}/{tierAchs.length}
                  </Text>
                </View>
                <View style={styles.grid}>
                  {tierAchs.map((ach) => (
                    <AchievementCard key={ach.id} achievement={ach} />
                  ))}
                </View>
              </View>
            );
          })}

          {achievements.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="ribbon-outline" size={52} color="#162540" />
              <Text style={styles.emptyText}>No achievements yet. Start training!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0B1326',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'BarlowCondensed-Bold', textAlign: 'center' },

  content: { padding: 20, paddingBottom: 40 },

  progressCard: {
    backgroundColor: '#0B1326',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 14,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressTitle: { color: '#fff', fontSize: 18, fontFamily: 'BarlowCondensed-Bold' },
  progressSub: { color: '#718FAF', fontSize: 13, marginTop: 2, fontFamily: 'DMSans-Regular' },
  progressBarBg: {
    height: 6,
    backgroundColor: '#162540',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },

  tierSection: { marginBottom: 24 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierTitle: { fontSize: 14, fontFamily: 'DMSans-Bold', flex: 1 },
  tierCount: { color: '#4A6080', fontSize: 13, fontFamily: 'DMSans-Regular' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  achCard: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '48%',
    backgroundColor: '#0B1326',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 6,
  },
  achCardLocked: { opacity: 0.5 },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  tierPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  tierLabel: { fontSize: 10, fontFamily: 'DMSans-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  achName: { color: '#fff', fontSize: 13, fontFamily: 'DMSans-Bold', lineHeight: 18 },
  achNameLocked: { color: '#4A6080' },
  achDesc: { color: '#718FAF', fontSize: 11, lineHeight: 16, fontFamily: 'DMSans-Regular' },
  achDescLocked: { color: '#162540' },
  earnedDate: { color: '#4A6080', fontSize: 10, marginTop: 4, fontFamily: 'DMSans-Regular' },

  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lockText: { color: '#4A6080', fontSize: 10, fontFamily: 'DMSans-Regular' },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#718FAF', fontSize: 15, fontFamily: 'DMSans-Regular' },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#4A6080', fontSize: 15, textAlign: 'center', fontFamily: 'DMSans-Regular' },
});
