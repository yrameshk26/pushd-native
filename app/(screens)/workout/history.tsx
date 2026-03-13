import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchWorkouts } from '../../../src/api/workouts';
import { WorkoutCard } from '../../../src/components/WorkoutCard';
import { WorkoutListItem } from '../../../src/types';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutHistoryScreen() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['workouts'],
    queryFn: ({ pageParam }) => fetchWorkouts(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const allWorkouts: WorkoutListItem[] = data?.pages.flatMap((p) => p.workouts) ?? [];

  // Aggregate totals for header stats
  const totalWorkouts = allWorkouts.length;
  const totalVolume = allWorkouts.reduce((sum, w) => sum + (w.volume ?? 0), 0);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderHeader = useCallback(() => {
    if (totalWorkouts === 0) return null;
    return (
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {totalVolume >= 1000
              ? `${(totalVolume / 1000).toFixed(1)}t`
              : `${Math.round(totalVolume)}kg`}
          </Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </View>
      </View>
    );
  }, [totalWorkouts, totalVolume]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return <ActivityIndicator color="#3B82F6" style={styles.footerSpinner} />;
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="barbell-outline" size={56} color="#162540" />
        <Text style={styles.emptyTitle}>No workouts yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete your first workout to see your history here.
        </Text>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/(screens)/workout')}
        >
          <Text style={styles.startBtnText}>Start your first workout</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heading}>Workout History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3B82F6" style={styles.loadingSpinner} />
      ) : (
        <FlatList
          data={allWorkouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => router.push(`/(screens)/workout/${item.id}`)}
            />
          )}
          ListEmptyComponent={renderEmpty()}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#3B82F6"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060C1B',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0B1326',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0B1326',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#162540',
  },
  heading: {
    fontSize: 20,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 38,
  },

  // Loading
  loadingSpinner: {
    marginTop: 60,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1326',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#162540',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'BarlowCondensed-ExtraBold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#718FAF',
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#162540',
    marginHorizontal: 16,
  },

  // List
  listContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Footer spinner
  footerSpinner: {
    paddingVertical: 20,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'BarlowCondensed-Bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#718FAF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontFamily: 'DMSans-Regular',
  },
  startBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
});
