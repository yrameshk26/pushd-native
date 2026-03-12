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
import { fetchGroceryList } from '../../../src/api/nutrition';
import { GroceryItem } from '../../../src/types';

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCE: 'Produce',
  PROTEINS: 'Proteins',
  DAIRY: 'Dairy',
  GRAINS: 'Grains',
  OTHER: 'Other',
};

const CATEGORY_ICONS: Record<string, string> = {
  PRODUCE: 'leaf-outline',
  PROTEINS: 'fish-outline',
  DAIRY: 'water-outline',
  GRAINS: 'ellipse-outline',
  OTHER: 'cube-outline',
};

const CATEGORY_ORDER = ['PRODUCE', 'PROTEINS', 'DAIRY', 'GRAINS', 'OTHER'];

export default function GroceryListScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const listQuery = useQuery({
    queryKey: ['grocery-list', planId],
    queryFn: () => fetchGroceryList(planId),
    enabled: Boolean(planId),
  });

  const toggleItem = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const buildShareText = useCallback(
    (items: GroceryItem[]): string => {
      const unchecked = items.filter((i) => !checkedIds.has(i.id));
      const checked = items.filter((i) => checkedIds.has(i.id));

      const formatItem = (item: GroceryItem) =>
        `• ${item.quantity} ${item.unit} ${item.name}`;

      const grouped = (list: GroceryItem[]) => {
        const byCategory: Record<string, GroceryItem[]> = {};
        list.forEach((item) => {
          const cat = item.category ?? 'OTHER';
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(item);
        });
        return CATEGORY_ORDER.filter((c) => byCategory[c]?.length)
          .map((c) => `${CATEGORY_LABELS[c] ?? c}:\n${byCategory[c].map(formatItem).join('\n')}`)
          .join('\n\n');
      };

      let text = 'Grocery List\n\n';
      if (unchecked.length > 0) text += grouped(unchecked);
      if (checked.length > 0) {
        text += '\n\n--- Already have ---\n\n' + grouped(checked);
      }
      return text.trim();
    },
    [checkedIds]
  );

  const handleShare = useCallback(async () => {
    if (!listQuery.data) return;
    const text = buildShareText(listQuery.data.items);
    try {
      await Share.share({ message: text, title: 'Grocery List' });
    } catch {
      Alert.alert('Error', 'Failed to open share sheet.');
    }
  }, [listQuery.data, buildShareText]);

  const handleCopy = useCallback(async () => {
    if (!listQuery.data) return;
    const text = buildShareText(listQuery.data.items);
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Grocery list copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard.');
    }
  }, [listQuery.data, buildShareText]);

  const groupedItems = useMemo(() => {
    if (!listQuery.data) return {};
    const byCategory: Record<string, GroceryItem[]> = {};
    listQuery.data.items.forEach((item) => {
      const cat = item.category ?? 'OTHER';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });
    return byCategory;
  }, [listQuery.data]);

  const uncheckedCount = useMemo(() => {
    if (!listQuery.data) return 0;
    return listQuery.data.items.filter((i) => !checkedIds.has(i.id)).length;
  }, [listQuery.data, checkedIds]);

  const totalCount = listQuery.data?.items.length ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Grocery List</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleCopy}
            disabled={!listQuery.data}
          >
            <Ionicons name="copy-outline" size={20} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleShare}
            disabled={!listQuery.data}
          >
            <Ionicons name="share-outline" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </View>

      {listQuery.isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : listQuery.isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#555" />
          <Text style={styles.errorText}>Failed to load grocery list.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => listQuery.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>No items in this grocery list</Text>
        </View>
      ) : (
        <>
          {/* Progress indicator */}
          <View style={styles.progressBar}>
            <Text style={styles.progressText}>
              {totalCount - uncheckedCount} / {totalCount} items checked
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(
                      ((totalCount - uncheckedCount) / totalCount) * 100
                    )}%` as any,
                  },
                ]}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Unchecked items grouped by category */}
            {CATEGORY_ORDER.filter(
              (cat) =>
                groupedItems[cat]?.some((i) => !checkedIds.has(i.id))
            ).map((cat) => {
              const items = groupedItems[cat].filter((i) => !checkedIds.has(i.id));
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={items}
                  checkedIds={checkedIds}
                  onToggle={toggleItem}
                />
              );
            })}

            {/* Checked items at the bottom */}
            {listQuery.data!.items.some((i) => checkedIds.has(i.id)) && (
              <View style={styles.checkedSection}>
                <Text style={styles.checkedSectionLabel}>Already have</Text>
                {CATEGORY_ORDER.flatMap(
                  (cat) =>
                    (groupedItems[cat] ?? []).filter((i) => checkedIds.has(i.id))
                ).map((item) => (
                  <GroceryItemRow
                    key={item.id}
                    item={item}
                    checked
                    onToggle={() => toggleItem(item.id)}
                  />
                ))}
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  checkedIds,
  onToggle,
}: {
  category: string;
  items: GroceryItem[];
  checkedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Ionicons
          name={(CATEGORY_ICONS[category] ?? 'cube-outline') as any}
          size={14}
          color="#888"
        />
        <Text style={styles.categoryLabel}>
          {CATEGORY_LABELS[category] ?? category}
        </Text>
        <Text style={styles.categoryCount}>{items.length}</Text>
      </View>
      {items.map((item) => (
        <GroceryItemRow
          key={item.id}
          item={item}
          checked={checkedIds.has(item.id)}
          onToggle={() => onToggle(item.id)}
        />
      ))}
    </View>
  );
}

function GroceryItemRow({
  item,
  checked,
  onToggle,
}: {
  item: GroceryItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.groceryRow, checked && styles.groceryRowChecked]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={[styles.itemName, checked && styles.itemNameChecked]}>
        {item.name}
      </Text>
      <Text style={[styles.itemQuantity, checked && styles.itemQuantityChecked]}>
        {item.quantity} {item.unit}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', marginLeft: 8 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { padding: 8 },

  // Progress
  progressBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  progressText: { color: '#666', fontSize: 12 },
  progressTrack: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 2,
  },

  content: { paddingHorizontal: 16, paddingTop: 4 },

  // Category
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  categoryLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  categoryCount: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
  },

  // Grocery item row
  groceryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 12,
  },
  groceryRowChecked: {
    opacity: 0.5,
    backgroundColor: '#141414',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  itemName: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#555',
  },
  itemQuantity: {
    color: '#666',
    fontSize: 13,
  },
  itemQuantityChecked: {
    color: '#444',
  },

  // Checked section
  checkedSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  checkedSectionLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Error / empty
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: { color: '#888', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: '#555', fontSize: 15 },
});
