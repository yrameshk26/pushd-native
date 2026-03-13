import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── Types ─────────────────────────────────────────────────────────────────

type ProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type LevelFilter = ProgramLevel | 'all';
type CategoryFilter =
  | 'all'
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full_body'
  | 'chest_back'
  | 'arms'
  | 'bodyweight';

interface ProgramListItem {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  level: ProgramLevel;
  estimatedMinutes?: number;
  equipment: string[];
  exercises: { name: string }[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'lower', label: 'Lower Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'chest_back', label: 'Chest & Back' },
  { value: 'arms', label: 'Arms' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

const LEVEL_BADGE: Record<ProgramLevel, { bg: string; text: string; label: string }> = {
  BEGINNER: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', label: 'Beginner' },
  INTERMEDIATE: { bg: 'rgba(234,179,8,0.12)', text: '#eab308', label: 'Intermediate' },
  ADVANCED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'Advanced' },
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: 'Barbell',
  DUMBBELL: 'Dumbbell',
  CABLE: 'Cable',
  MACHINE: 'Machine',
  BODYWEIGHT: 'Bodyweight',
  KETTLEBELL: 'Kettlebell',
  RESISTANCE_BAND: 'Bands',
};

// ─── Hook ──────────────────────────────────────────────────────────────────

function usePrograms(level: LevelFilter, category: CategoryFilter) {
  return useQuery<ProgramListItem[]>({
    queryKey: ['programs', level, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (level !== 'all') params.set('level', level);
      if (category !== 'all') params.set('category', category);
      const { data } = await api.get(`/api/programs?${params.toString()}`);
      return data?.data ?? data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── AI Banner ────────────────────────────────────────────────────────────

function AiBanner() {
  return (
    <TouchableOpacity
      style={bannerStyles.container}
      onPress={() => router.push('/(screens)/ai-planner' as any)}
      activeOpacity={0.8}
    >
      <View style={bannerStyles.left}>
        <Ionicons name="sparkles" size={20} color="#6C63FF" />
        <View style={bannerStyles.textWrap}>
          <Text style={bannerStyles.title}>Build a custom program</Text>
          <Text style={bannerStyles.sub}>
            Let AI design the perfect program for your goals
          </Text>
        </View>
      </View>
      <View style={bannerStyles.cta}>
        <Text style={bannerStyles.ctaText}>Build with AI</Text>
        <Ionicons name="arrow-forward" size={14} color="#6C63FF" />
      </View>
    </TouchableOpacity>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.08)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sub: { color: '#888', fontSize: 12, marginTop: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaText: { color: '#6C63FF', fontSize: 13, fontWeight: '700' },
});

// ─── Program card ─────────────────────────────────────────────────────────

function ProgramCard({ item }: { item: ProgramListItem }) {
  const badge = LEVEL_BADGE[item.level];
  return (
    <TouchableOpacity
      style={cardStyles.container}
      onPress={() => router.push(`/(screens)/programs/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.name} numberOfLines={1}>{item.name}</Text>
        <View style={[cardStyles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[cardStyles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={cardStyles.desc} numberOfLines={2}>{item.description}</Text>

      <View style={cardStyles.metaRow}>
        <View style={cardStyles.metaItem}>
          <Ionicons name="barbell-outline" size={13} color="#666" />
          <Text style={cardStyles.metaText}>{item.exercises.length} exercises</Text>
        </View>
        {item.estimatedMinutes ? (
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={13} color="#666" />
            <Text style={cardStyles.metaText}>~{item.estimatedMinutes} min</Text>
          </View>
        ) : null}
        <View style={cardStyles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color="#666" />
          <Text style={cardStyles.metaText}>{item.daysPerWeek}x / week</Text>
        </View>
        {item.durationWeeks ? (
          <View style={cardStyles.metaItem}>
            <Ionicons name="layers-outline" size={13} color="#666" />
            <Text style={cardStyles.metaText}>{item.durationWeeks}w</Text>
          </View>
        ) : null}
      </View>

      {item.equipment.length > 0 && (
        <View style={cardStyles.equipRow}>
          {item.equipment.map((eq) => (
            <View key={eq} style={cardStyles.equipChip}>
              <Text style={cardStyles.equipText}>{EQUIPMENT_LABELS[eq] ?? eq}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  desc: { color: '#888', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#666', fontSize: 12 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  equipChip: { backgroundColor: '#2a2a2a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  equipText: { color: '#888', fontSize: 11 },
});

// ─── Main screen ──────────────────────────────────────────────────────────

export default function ProgramsScreen() {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const { data: programs, isLoading, isError, refetch } = usePrograms(levelFilter, categoryFilter);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Programs</Text>
          <Text style={styles.subheading}>Pre-built routines you can add in one tap</Text>
        </View>
      </View>

      {/* AI Banner */}
      <AiBanner />

      {/* Level filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {LEVEL_FILTERS.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.filterChip, levelFilter === value && styles.filterChipActive]}
            onPress={() => setLevelFilter(value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, levelFilter === value && styles.filterTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category (focus area) filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORY_FILTERS.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.filterChip, categoryFilter === value && styles.filterChipActive]}
            onPress={() => setCategoryFilter(value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, categoryFilter === value && styles.filterTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 48 }} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color="#444" />
          <Text style={styles.emptyText}>Failed to load programs</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (programs ?? []).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={40} color="#333" />
          <Text style={styles.emptyText}>No programs match your filters</Text>
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProgramCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerText: { flex: 1 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subheading: { color: '#666', fontSize: 12, marginTop: 2 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#2a2a2a', backgroundColor: '#1a1a1a',
  },
  filterChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  emptyText: { color: '#555', fontSize: 15 },
  retryBtn: { marginTop: 4 },
  retryText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
});
