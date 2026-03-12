import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface WeekData {
  week: string;
  volume: number;
}

interface VolumeChartProps {
  data: WeekData[];
}

const CHART_HEIGHT = 120;
const BAR_WIDTH = 32;
const BAR_GAP = 10;

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No volume data yet</Text>
      </View>
    );
  }

  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const maxIndex = data.reduce((best, d, i) => (d.volume > data[best].volume ? i : best), 0);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.chartContainer}>
        {/* Y-axis label */}
        <View style={styles.barsRow}>
          {data.map((item, index) => {
            const heightRatio = maxVolume > 0 ? item.volume / maxVolume : 0;
            const barHeight = Math.max(heightRatio * CHART_HEIGHT, item.volume > 0 ? 4 : 0);
            const isMax = index === maxIndex && item.volume > 0;

            return (
              <View key={`${item.week}-${index}`} style={styles.barColumn}>
                {/* Volume label above tallest bar */}
                {isMax ? (
                  <Text style={styles.maxLabel}>{formatVolume(item.volume)}</Text>
                ) : (
                  <View style={styles.labelPlaceholder} />
                )}

                {/* Bar area */}
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: item.volume > 0 ? '#6C63FF' : '#2a2a2a',
                        opacity: item.volume > 0 ? (index === maxIndex ? 1 : 0.7) : 1,
                      },
                    ]}
                  />
                </View>

                {/* Week label */}
                <Text style={styles.weekLabel} numberOfLines={1}>
                  {item.week}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Baseline */}
        <View style={styles.baseline} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  chartContainer: {
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
    paddingBottom: 0,
  },
  barColumn: {
    width: BAR_WIDTH,
    alignItems: 'center',
  },
  maxLabel: {
    color: '#6C63FF',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  labelPlaceholder: {
    height: 18,
    marginBottom: 4,
  },
  barArea: {
    width: BAR_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 6,
    minHeight: 0,
  },
  weekLabel: {
    color: '#666',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  baseline: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginTop: 0,
  },
});
