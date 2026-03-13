import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api/client';

// ─── API types (matches actual backend response) ─────────────────────────────

interface GroceryCategory {
  name: string;
  items: string[];
}

interface GroceryListResponse {
  categories: GroceryCategory[];
  totalItems: number;
  planName: string;
  days: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Proteins: 'fish-outline',
  Produce: 'leaf-outline',
  Grains: 'ellipse-outline',
  Dairy: 'water-outline',
  Pantry: 'flask-outline',
  Other: 'cube-outline',
};

async function fetchGroceryList(planId: string): Promise<GroceryListResponse> {
  const { data } = await api.get(`/api/meal-plans/${planId}/grocery-list`);
  const raw = data?.data ?? data;
  return {
    categories: raw?.categories ?? [],
    totalItems: raw?.totalItems ?? 0,
    planName: raw?.planName ?? '',
    days: raw?.days ?? 0,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroceryListScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();

  // checked items stored as "CategoryName:ItemName"
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const listQuery = useQuery({
    queryKey: ['grocery-list', planId],
    queryFn: () => fetchGroceryList(planId),
    enabled: Boolean(planId),
  });

  const toggleItem = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const totalItems = listQuery.data?.totalItems ?? 0;
  const checkedCount = checked.size;

  const buildShareText = useCallback((): string => {
    if (!listQuery.data) return '';
    let text = `Grocery List — ${listQuery.data.planName}\n\n`;
    for (const cat of listQuery.data.categories) {
      const unchecked = cat.items.filter((i) => !checked.has(`${cat.name}:${i}`));
      if (unchecked.length > 0) {
        text += `${cat.name}:\n${unchecked.map((i) => `• ${i}`).join('\n')}\n\n`;
      }
    }
    return text.trim();
  }, [listQuery.data, checked]);

  const handleShare = useCallback(async () => {
    const text = buildShareText();
    if (!text) return;
    try {
      await Share.share({ message: text, title: 'Grocery List' });
    } catch {
      Alert.alert('Error', 'Failed to open share sheet.');
    }
  }, [buildShareText]);

  const handleCopy = useCallback(async () => {
    const text = buildShareText();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Grocery list copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard.');
    }
  }, [buildShareText]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.heading}>Grocery List</Text>
          {listQuery.data?.planName ? (
            <Text style={styles.subheading} numberOfLines={1}>{listQuery.data.planName}</Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleCopy} disabled={!listQuery.data}>
            <Ionicons name="copy-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleShare} disabled={!listQuery.data}>
            <Ionicons name="share-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      {listQuery.isLoading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} />
      ) : listQuery.isError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={40} color="#555" />
          <Text style={styles.errorText}>Failed to load grocery list.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => listQuery.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : totalItems === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="cart-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>No ingredients in this meal plan</Text>
        </View>
      ) : (
        <>
          {/* Progress */}
          <View style={styles.progressWrap}>
            <Text style={styles.progressText}>{checkedCount} / {totalItems} items checked</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round((checkedCount / totalItems) * 100)}%` as any }]} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {(listQuery.data?.categories ?? []).map((cat) => {
              const unchecked = cat.items.filter((i) => !checked.has(`${cat.name}:${i}`));
              const checkedItems = cat.items.filter((i) => checked.has(`${cat.name}:${i}`));
              if (cat.items.length === 0) return null;
              return (
                <View key={cat.name} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <Ionicons
                      name={(CATEGORY_ICONS[cat.name] ?? 'cube-outline') as any}
                      size={14} color="#888"
                    />
                    <Text style={styles.categoryLabel}>{cat.name}</Text>
                    <Text style={styles.categoryCount}>{unchecked.length}/{cat.items.length}</Text>
                  </View>
                  {unchecked.map((item) => (
                    <ItemRow
                      key={item}
                      name={item}
                      checked={false}
                      onToggle={() => toggleItem(`${cat.name}:${item}`)}
                    />
                  ))}
                  {checkedItems.map((item) => (
                    <ItemRow
                      key={item}
                      name={item}
                      checked
                      onToggle={() => toggleItem(`${cat.name}:${item}`)}
                    />
                  ))}
                </View>
              );
            })}
            <View style={{ height: 60 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function ItemRow({ name, checked, onToggle }: { name: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.itemRow, checked && styles.itemRowChecked]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={[styles.itemName, checked && styles.itemNameChecked]} numberOfLines={2}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700' },
  subheading: { color: '#666', fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { padding: 8 },

  progressWrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  progressText: { color: '#666', fontSize: 12 },
  progressTrack: { height: 4, backgroundColor: '#2a2a2a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 2 },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  errorText: { color: '#888', fontSize: 15, textAlign: 'center' },
  retryBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#555', fontSize: 15, textAlign: 'center' },

  categorySection: { marginBottom: 20 },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, paddingHorizontal: 4,
  },
  categoryLabel: {
    flex: 1, color: '#888', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  categoryCount: { color: '#555', fontSize: 11, fontWeight: '600' },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 6, borderWidth: 1, borderColor: '#2a2a2a', gap: 12,
  },
  itemRowChecked: { opacity: 0.45, backgroundColor: '#141414' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#3a3a3a',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  itemName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#555' },
});
