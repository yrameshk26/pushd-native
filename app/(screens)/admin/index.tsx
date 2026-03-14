import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tier = 'FREE' | 'PRO' | 'ELITE';
type Tab = 'overview' | 'users' | 'promos';

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  username: string;
  subscriptionTier: Tier;
  isAdmin: boolean;
}

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  tier: Tier;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  FREE:  { bg: '#1e293b', text: '#94a3b8' },
  PRO:   { bg: '#1e3a5f', text: '#60a5fa' },
  ELITE: { bg: '#3b1f0a', text: '#f59e0b' },
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const [usersRes] = await Promise.all([
        api.get('/api/admin/users?q='),
      ]);
      const users: AdminUser[] = usersRes.data?.users ?? [];
      const counts: Record<string, number> = { FREE: 0, PRO: 0, ELITE: 0 };
      users.forEach((u) => { counts[u.subscriptionTier] = (counts[u.subscriptionTier] ?? 0) + 1; });
      return { total: users.length, counts };
    },
  });

  if (isLoading) return <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />;

  const stats = [
    { label: 'Total Users', value: data?.total ?? 0, color: '#60a5fa' },
    { label: 'Free', value: data?.counts.FREE ?? 0, color: '#94a3b8' },
    { label: 'Pro', value: data?.counts.PRO ?? 0, color: '#60a5fa' },
    { label: 'Elite', value: data?.counts.ELITE ?? 0, color: '#f59e0b' },
  ];

  return (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/users?q=${encodeURIComponent(q)}`);
      setUsers(data?.users ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const setTier = async (userId: string, tier: Tier) => {
    setUpdatingId(userId);
    try {
      await api.patch('/api/admin/users', { userId, tier });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, subscriptionTier: tier } : u));
    } catch {
      Alert.alert('Error', 'Failed to update tier.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or name…"
          placeholderTextColor="#4A6080"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => search(query)} disabled={loading}>
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#162540' }]} onPress={() => search('')} disabled={loading}>
          <Ionicons name="list" size={18} color="#718FAF" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />}

      {users.map((user) => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user.displayName ?? user.username}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          </View>
          <View style={styles.tierBtns}>
            {(['FREE', 'PRO', 'ELITE'] as Tier[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tierBtn,
                  user.subscriptionTier === t && { backgroundColor: TIER_COLORS[t].bg, borderColor: TIER_COLORS[t].text },
                ]}
                onPress={() => setTier(user.id, t)}
                disabled={updatingId === user.id || user.subscriptionTier === t}
              >
                {updatingId === user.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.tierBtnText, user.subscriptionTier === t && { color: TIER_COLORS[t].text }]}>{t}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Promo Codes Tab ──────────────────────────────────────────────────────────

function PromosTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [tier, setTierState] = useState<Tier>('PRO');
  const [maxUses, setMaxUses] = useState('1');
  const [description, setDescription] = useState('');

  const { data: promos, isLoading } = useQuery<PromoCode[]>({
    queryKey: ['admin-promos'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/promo-codes');
      return data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/admin/promo-codes', {
        code: code.trim().toUpperCase(),
        tier,
        maxUses: parseInt(maxUses, 10) || 1,
        description: description.trim() || null,
        discountPercent: 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promos'] });
      setCode(''); setDescription(''); setMaxUses('1'); setShowForm(false);
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.error ?? 'Failed to create promo code.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/api/admin/promo-codes/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-promos'] }),
    onError: () => Alert.alert('Error', 'Failed to delete promo code.'),
  });

  function handleDelete(id: string, promoCode: string) {
    Alert.alert('Delete Promo Code', `Delete "${promoCode}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  return (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm((v) => !v)}>
        <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#fff" />
        <Text style={styles.addBtnText}>{showForm ? 'Cancel' : 'New Promo Code'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <TextInput
            style={styles.formInput}
            placeholder="Code (e.g. PUSHD-FREE)"
            placeholderTextColor="#4A6080"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TextInput
            style={styles.formInput}
            placeholder="Description (optional)"
            placeholderTextColor="#4A6080"
            value={description}
            onChangeText={setDescription}
          />
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Tier</Text>
            <View style={styles.tierToggle}>
              {(['FREE', 'PRO', 'ELITE'] as Tier[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierToggleBtn, tier === t && { backgroundColor: TIER_COLORS[t].bg, borderColor: TIER_COLORS[t].text }]}
                  onPress={() => setTierState(t)}
                >
                  <Text style={[styles.tierToggleBtnText, tier === t && { color: TIER_COLORS[t].text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Max Uses</Text>
            <TextInput
              style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#4A6080"
            />
          </View>
          <TouchableOpacity
            style={[styles.createBtn, createMutation.isPending && { opacity: 0.6 }]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending || !code.trim()}
          >
            {createMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.createBtnText}>Create Code</Text>}
          </TouchableOpacity>
        </View>
      )}

      {isLoading && <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />}

      {(promos ?? []).map((p) => (
        <View key={p.id} style={styles.promoCard}>
          <View style={styles.promoTop}>
            <Text style={styles.promoCode}>{p.code}</Text>
            <View style={[styles.tierPill, { backgroundColor: TIER_COLORS[p.tier].bg }]}>
              <Text style={[styles.tierPillText, { color: TIER_COLORS[p.tier].text }]}>{p.tier}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(p.id, p.code)} disabled={deleteMutation.isPending}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
          {p.description && <Text style={styles.promoDesc}>{p.description}</Text>}
          <Text style={styles.promoBadge}>{p.usedCount}/{p.maxUses} uses</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'users',    label: 'Users',    icon: 'people-outline' },
  { id: 'promos',   label: 'Promos',   icon: 'pricetag-outline' },
];

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.id ? '#F59E0B' : '#718FAF'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users'    && <UsersTab />}
        {activeTab === 'promos'   && <PromosTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0B1326',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700',
    color: '#F59E0B', fontFamily: 'BarlowCondensed-Bold',
  },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0B1326',
    backgroundColor: '#060C1B',
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#F59E0B' },
  tabLabel: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Medium' },
  tabLabelActive: { color: '#F59E0B', fontWeight: '700' },

  tabContent: { padding: 16, gap: 12 },

  // Overview
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#0B1326',
    borderRadius: 14, borderWidth: 1, borderColor: '#162540',
    padding: 16, alignItems: 'center',
  },
  statValue: { fontSize: 36, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold' },
  statLabel: { color: '#718FAF', fontSize: 12, marginTop: 4, fontFamily: 'DMSans-Regular' },

  // Users
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  searchInput: {
    flex: 1, backgroundColor: '#0B1326', borderRadius: 12,
    borderWidth: 1, borderColor: '#162540', paddingHorizontal: 14,
    paddingVertical: 11, color: '#fff', fontSize: 14,
  },
  searchBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
  },
  userCard: {
    backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', padding: 14, gap: 10,
  },
  userInfo: { gap: 2 },
  userName: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  userEmail: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular' },
  tierBtns: { flexDirection: 'row', gap: 8 },
  tierBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#162540', backgroundColor: '#162540',
  },
  tierBtnText: { color: '#718FAF', fontSize: 12, fontWeight: '700', fontFamily: 'DMSans-Bold' },

  // Promos
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 12,
  },
  addBtnText: { color: '#000', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  formCard: {
    backgroundColor: '#0B1326', borderRadius: 14, borderWidth: 1,
    borderColor: '#162540', padding: 14, gap: 10,
  },
  formInput: {
    backgroundColor: '#060C1B', borderRadius: 10, borderWidth: 1,
    borderColor: '#162540', paddingHorizontal: 14, paddingVertical: 11,
    color: '#fff', fontSize: 14, marginBottom: 0,
  },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formLabel: { color: '#718FAF', fontSize: 13, fontFamily: 'DMSans-Regular', width: 60 },
  tierToggle: { flex: 1, flexDirection: 'row', gap: 6 },
  tierToggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#162540', backgroundColor: '#162540',
  },
  tierToggleBtnText: { color: '#718FAF', fontSize: 12, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  createBtn: {
    backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  promoCard: {
    backgroundColor: '#0B1326', borderRadius: 12, borderWidth: 1,
    borderColor: '#162540', padding: 14, gap: 6,
  },
  promoTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoCode: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  promoDesc: { color: '#718FAF', fontSize: 12, fontFamily: 'DMSans-Regular' },
  promoBadge: { color: '#4A6080', fontSize: 11 },
  tierPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierPillText: { fontSize: 10, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
