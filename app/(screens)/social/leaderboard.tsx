import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api/client';

type LeaderboardType = 'volume' | 'workouts' | 'streak';
type LeaderboardScope = 'followers' | 'global';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  value: number;
  unit: string;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  currentUserRank: number | null;
  currentUserEntry?: LeaderboardEntry;
  weekLabel?: string;
}

const TYPE_TABS: { key: LeaderboardType; label: string }[] = [
  { key: 'volume', label: 'Volume' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'streak', label: 'Streak' },
];

const SCOPE_TABS: { key: LeaderboardScope; label: string }[] = [
  { key: 'followers', label: 'Followers' },
  { key: 'global', label: 'Global' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatValue(value: number, unit: string): string {
  if (unit === 'kg') return `${value.toLocaleString()} kg`;
  if (unit === 'workouts') return `${value} workout${value !== 1 ? 's' : ''}`;
  if (unit === 'days') return `${value} day${value !== 1 ? 's' : ''}`;
  return `${value} ${unit}`;
}

function getMedalOrRank(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function SkeletonRow() {
  return (
    <View style={[styles.row, { opacity: 0.4 }]}>
      <View style={styles.rankCell}>
        <View style={styles.skeletonRank} />
      </View>
      <View style={styles.skeletonAvatar} />
      <View style={styles.entryInfo}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonUsername} />
      </View>
      <View style={styles.skeletonValue} />
    </View>
  );
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const isMedal = entry.rank <= 3;
  return (
    <View style={[styles.row, entry.isCurrentUser && styles.rowCurrentUser]}>
      <View style={styles.rankCell}>
        <Text style={[styles.rankText, isMedal && styles.rankMedal]}>
          {getMedalOrRank(entry.rank)}
        </Text>
      </View>

      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {getInitials(entry.displayName || entry.username || '?')}
        </Text>
      </View>

      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>
          {entry.displayName}
          {entry.isCurrentUser ? ' (you)' : ''}
        </Text>
        {entry.username ? (
          <Text style={styles.entryUsername} numberOfLines={1}>
            @{entry.username}
          </Text>
        ) : null}
      </View>

      <Text style={styles.entryValue}>{formatValue(entry.value, entry.unit)}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [type, setType] = useState<LeaderboardType>('volume');
  const [scope, setScope] = useState<LeaderboardScope>('followers');

  const { data, isLoading, refetch, isRefetching } =
    useQuery<LeaderboardResponse>({
      queryKey: ['leaderboard', type, scope],
      queryFn: async () => {
        const { data: res } = await api.get('/api/social/leaderboard', {
          params: { type, scope, period: 'weekly' },
        });
        return res;
      },
      staleTime: 60_000,
    });

  const entries = data?.data ?? [];
  const currentUserRank = data?.currentUserRank;
  const currentUserEntry = data?.currentUserEntry;
  const isUserOutsideTop = currentUserRank != null && currentUserRank > 10;

  // Get current week date range label
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.heading}>Leaderboard</Text>
          <Text style={styles.weekLabel}>This Week · {weekLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}>
          <Ionicons
            name="refresh-outline"
            size={22}
            color={isRefetching ? '#4A6080' : '#718FAF'}
          />
        </TouchableOpacity>
      </View>

      {/* Type tab switcher */}
      <View style={styles.tabRow}>
        {TYPE_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabPill, type === key && styles.tabPillActive]}
            onPress={() => setType(key)}
          >
            <Text style={[styles.tabText, type === key && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scope switcher */}
      <View style={styles.scopeRow}>
        {SCOPE_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.scopePill, scope === key && styles.scopePillActive]}
            onPress={() => setScope(key)}
          >
            <Text style={[styles.scopeText, scope === key && styles.scopeTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Your position banner (if outside top 10) */}
      {isUserOutsideTop && currentUserEntry && (
        <View style={styles.yourPositionBanner}>
          <Text style={styles.yourPositionLabel}>Your position</Text>
          <EntryRow entry={currentUserEntry} />
        </View>
      )}

      {isLoading ? (
        <View style={styles.skeletonList}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.userId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <EntryRow entry={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No activity this week yet. Start a workout!</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#162540',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' ,
    fontFamily: 'BarlowCondensed-Bold'},
  weekLabel: { color: '#718FAF', fontSize: 11, marginTop: 2 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#0B1326',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabPill: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabPillActive: { backgroundColor: '#060C1B' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#718FAF' },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    gap: 8,
    alignItems: 'center',
  },
  scopePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#0B1326',
    borderWidth: 1,
    borderColor: '#162540',
  },
  scopePillActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246,0.12)' },
  scopeText: { fontSize: 12, fontWeight: '600', color: '#718FAF' },
  scopeTextActive: { color: '#3B82F6' },

  yourPositionBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#0B1326',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  yourPositionLabel: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'BarlowCondensed-SemiBold',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#162540',
    gap: 10,
  },
  rowCurrentUser: { borderColor: '#3B82F6' },

  rankCell: { width: 32, alignItems: 'center' },
  rankText: { fontSize: 14, fontWeight: '700', color: '#718FAF' },
  rankMedal: { fontSize: 20 },

  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  entryInfo: { flex: 1, minWidth: 0 },
  entryName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  entryUsername: { color: '#718FAF', fontSize: 12, marginTop: 1 },
  entryValue: { color: '#3B82F6', fontWeight: '700', fontSize: 14, flexShrink: 0 },

  skeletonList: { padding: 16, gap: 8 },
  skeletonRank: { width: 24, height: 14, backgroundColor: '#162540', borderRadius: 4 },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#162540',
    flexShrink: 0,
  },
  skeletonName: { width: 110, height: 14, backgroundColor: '#162540', borderRadius: 4 },
  skeletonUsername: {
    width: 70,
    height: 11,
    backgroundColor: '#162540',
    borderRadius: 4,
    marginTop: 5,
  },
  skeletonValue: { width: 56, height: 14, backgroundColor: '#162540', borderRadius: 4 },

  empty: { color: '#718FAF', textAlign: 'center', marginTop: 48, fontSize: 14 },
});
