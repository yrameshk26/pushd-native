import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptionStore, isElite } from '../../src/store/subscription';

interface UserProfile {
  id: string;
  displayName: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string;
  isAdmin: boolean;
}

interface UserStats {
  totalWorkouts: number;
  workouts?: number; // alias
  followers: number;
  following: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function useMe() {
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/api/users/me');
      return data?.data ?? data;
    },
  });
}

function useUserStats() {
  return useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      // /api/users/me/stats has workout counts; followers/following come from /api/users/me (_count)
      const [statsRes, meRes] = await Promise.all([
        api.get('/api/users/me/stats'),
        api.get('/api/users/me'),
      ]);
      const stats = statsRes.data?.data ?? statsRes.data;
      const me = meRes.data?.data ?? meRes.data;
      return {
        totalWorkouts: stats?.totalWorkouts ?? 0,
        followers: me?._count?.followers ?? 0,
        following: me?._count?.following ?? 0,
      };
    },
  });
}

const QUICK_LINKS = [
  { label: 'Workout History', icon: 'time-outline' as const, route: '/(screens)/workout/history' },
  { label: 'Progress & PRs', icon: 'trending-up-outline' as const, route: '/(screens)/progress' },
  { label: 'Body Weight Tracker', icon: 'body-outline' as const, route: '/(screens)/progress/body' },
  { label: 'Plate Calculator', icon: 'barbell-outline' as const, route: '/(screens)/tools/plates' },
  { label: '1RM Calculator', icon: 'calculator-outline' as const, route: '/(screens)/tools/1rm' },
];

export default function ProfileScreen() {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const logout = useAuthStore((s) => s.logout);
  const { tier } = useSubscriptionStore();

  const displayName = me?.displayName ?? me?.username ?? 'User';
  const initials = getInitials(displayName);

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace('/(auth)/login');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) doLogout();
      return;
    }
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: doLogout },
    ]);
  };

  const handleExport = async () => {
    try {
      await api.get('/api/workouts/export', { responseType: 'blob' });
      Alert.alert('Export', 'Workout data exported successfully.');
    } catch {
      Alert.alert('Error', 'Failed to export workouts.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(screens)/profile/settings' as never)}
            >
              <Ionicons name="settings-outline" size={22} color="#718FAF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#718FAF" />
            </TouchableOpacity>
          </View>
        </View>

        {meLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#3B82F6" />
          </View>
        ) : (
          <>
            {/* Avatar + identity */}
            <View style={styles.profileTop}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{initials}</Text>
              </View>
              <Text style={styles.displayName}>{displayName}</Text>
              {me?.username && <Text style={styles.username}>@{me.username}</Text>}
              {me?.bio ? <Text style={styles.bio}>{me.bio}</Text> : null}
            </View>

            {/* Subscription card */}
            <TouchableOpacity
              style={[
                styles.subCard,
                tier === 'ELITE' && styles.subCardElite,
                tier === 'PRO' && styles.subCardPro,
              ]}
              onPress={() => router.push('/(screens)/paywall' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.subCardLeft}>
                <Ionicons
                  name={tier === 'ELITE' ? 'diamond' : tier === 'PRO' ? 'star' : 'sparkles'}
                  size={18}
                  color={tier === 'ELITE' ? '#F59E0B' : tier === 'PRO' ? '#3B82F6' : '#718FAF'}
                />
                <View>
                  <Text style={styles.subCardTier}>
                    {tier === 'FREE' ? 'Free Plan' : tier === 'PRO' ? 'Pro' : 'Elite'}
                  </Text>
                  {!isElite(tier) && (
                    <Text style={styles.subCardSub}>
                      {tier === 'FREE' ? 'Upgrade to unlock all features' : 'Upgrade to Elite for AI Coach'}
                    </Text>
                  )}
                </View>
              </View>
              {!isElite(tier) && (
                <View style={[styles.subUpgradeBtn, tier === 'PRO' ? styles.subUpgradeBtnElite : styles.subUpgradeBtnPro]}>
                  <Text style={styles.subUpgradeBtnText}>Upgrade</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Stats row — 3 columns matching PWA */}
            {statsLoading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.statsGrid}>
                {[
                  { label: 'Workouts', value: stats?.totalWorkouts ?? stats?.workouts ?? 0 },
                  { label: 'Followers', value: stats?.followers ?? 0 },
                  { label: 'Following', value: stats?.following ?? 0 },
                ].map(({ label, value }, idx) => (
                  <View key={label} style={[styles.statCell, idx < 2 && styles.statCellBorder]}>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Quick links — matching PWA */}
            <View style={styles.linksList}>
              {QUICK_LINKS.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.linkRow}
                  onPress={() => router.push(item.route as never)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={item.icon} size={18} color="#718FAF" style={styles.linkIcon} />
                  <Text style={styles.linkLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#4A6080" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.linkRow}
                onPress={handleExport}
                activeOpacity={0.75}
              >
                <Ionicons name="download-outline" size={18} color="#718FAF" style={styles.linkIcon} />
                <Text style={styles.linkLabel}>Export Workouts (JSON)</Text>
                <Ionicons name="chevron-forward" size={16} color="#4A6080" />
              </TouchableOpacity>

              {me?.isAdmin && (
                <TouchableOpacity
                  style={[styles.linkRow, styles.adminLinkRow]}
                  onPress={() => router.push('/(screens)/admin' as never)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#F59E0B" style={styles.linkIcon} />
                  <Text style={[styles.linkLabel, { color: '#F59E0B' }]}>Admin Panel</Text>
                  <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { alignItems: 'center', paddingTop: 60 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, marginBottom: 24,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: 'BarlowCondensed-Bold' },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },

  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.2)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarLargeText: { color: '#60a5fa', fontSize: 28, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold' },
  displayName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 2, fontFamily: 'BarlowCondensed-Bold' },
  username: { color: '#718FAF', fontSize: 13, marginBottom: 4, fontFamily: 'DMSans-Regular' },
  bio: { color: '#718FAF', fontSize: 13, lineHeight: 18, fontFamily: 'DMSans-Regular' },

  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#0B1326',
    borderRadius: 14, borderWidth: 1, borderColor: '#162540',
    marginBottom: 24, overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statCellBorder: { borderRightWidth: 1, borderRightColor: '#162540' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 3, fontFamily: 'BarlowCondensed-ExtraBold' },
  statLabel: { color: '#718FAF', fontSize: 11, fontFamily: 'DMSans-Regular' },

  linksList: { gap: 8 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540',
    padding: 16,
  },
  linkIcon: { marginRight: 12 },
  linkLabel: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500', fontFamily: 'DMSans-Medium' },

  subCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1, borderColor: '#162540',
    padding: 14, marginBottom: 20,
  },
  subCardPro: { borderColor: 'rgba(59,130,246,0.4)' },
  subCardElite: { borderColor: 'rgba(245,158,11,0.4)' },
  subCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  subCardTier: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  subCardSub: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular', marginTop: 1 },
  subUpgradeBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  subUpgradeBtnPro: { backgroundColor: '#3B82F6' },
  subUpgradeBtnElite: { backgroundColor: '#F59E0B' },
  subUpgradeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
