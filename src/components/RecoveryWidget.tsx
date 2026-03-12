import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RecoveryWidgetProps {
  score: number; // 0-100
  recommendation: string;
  sleepHours?: number;
  sorenessLevel?: number; // 1-5
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // green
  if (score >= 50) return '#F59E0B'; // yellow/amber
  return '#EF4444'; // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Optimal';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Poor';
  return 'Rest Needed';
}

function getSorenessLabel(level: number): string {
  const labels = ['', 'None', 'Mild', 'Moderate', 'High', 'Severe'];
  return labels[Math.min(level, 5)] ?? 'Unknown';
}

export function RecoveryWidget({ score, recommendation, sleepHours, sorenessLevel }: RecoveryWidgetProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getScoreColor(clampedScore);
  const label = getScoreLabel(clampedScore);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recovery Score</Text>
      </View>

      <View style={styles.body}>
        {/* Circular score display */}
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Text style={[styles.scoreNumber, { color }]}>{clampedScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>

        <View style={styles.rightContent}>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          <Text style={styles.recommendation} numberOfLines={3}>
            {recommendation}
          </Text>

          {/* Indicators row */}
          {(sleepHours !== undefined || sorenessLevel !== undefined) && (
            <View style={styles.indicators}>
              {sleepHours !== undefined && (
                <View style={styles.indicator}>
                  <Text style={styles.indicatorIcon}>😴</Text>
                  <Text style={styles.indicatorText}>{sleepHours}h sleep</Text>
                </View>
              )}
              {sorenessLevel !== undefined && (
                <View style={styles.indicator}>
                  <Text style={styles.indicatorIcon}>💪</Text>
                  <Text style={styles.indicatorText}>
                    {getSorenessLabel(sorenessLevel)} soreness
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Score bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${clampedScore}%` as unknown as number, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: {
    marginBottom: 14,
  },
  title: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    flexShrink: 0,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  scoreMax: {
    color: '#555',
    fontSize: 10,
    fontWeight: '500',
  },
  rightContent: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  recommendation: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  indicators: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorIcon: {
    fontSize: 12,
  },
  indicatorText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
  },
  barTrack: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
