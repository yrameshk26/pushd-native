import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MuscleRecovery {
  muscle: string;
  label: string;
  hoursRested: number | null;
  recoveryPct: number;
  status: 'fresh' | 'recovering' | 'fatigued';
}

export interface RecoveryData {
  score: number;
  label: string;
  insight: string;
  weekWorkouts: number;
  weekVolume: number;
  trainedMuscles: MuscleRecovery[];
  freshMuscles: string[];
}

interface RecoveryWidgetProps {
  data: RecoveryData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#4ade80'; // green-400
  if (score >= 60) return '#facc15'; // yellow-400
  return '#fb923c'; // orange-400
}

function scoreBgColor(score: number): string {
  if (score >= 80) return '#022c0f'; // deep green bg
  if (score >= 60) return '#1c1200'; // deep yellow/amber bg
  return '#1c0a00'; // deep orange bg
}

function scoreBorderColor(score: number): string {
  if (score >= 80) return '#16a34a40'; // green border
  if (score >= 60) return '#d9770040'; // amber border
  return '#ea580c40'; // orange border
}

function muscleBarColor(status: MuscleRecovery['status']): string {
  if (status === 'fresh') return '#22c55e'; // green-500
  if (status === 'recovering') return '#eab308'; // yellow-500
  return '#f97316'; // orange-500
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecoveryWidget({ data }: RecoveryWidgetProps) {
  const color = scoreColor(data.score);
  const bgColor = scoreBgColor(data.score);
  const borderColor = scoreBorderColor(data.score);

  const volumeLabel =
    data.weekVolume > 0
      ? ` · ${(data.weekVolume / 1000).toFixed(1)}t volume`
      : '';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse-outline" size={16} color={color} />
          <Text style={styles.recoveryLabel}>RECOVERY</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(screens)/coach')}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.coachLink}
        >
          <Text style={styles.coachLinkText}>Ask Coach ›</Text>
        </TouchableOpacity>
      </View>

      {/* Score + label row */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color }]}>{data.score}</Text>
        <View style={styles.scoreMeta}>
          <Text style={styles.scoreLabel}>{data.label}</Text>
          <Text style={styles.scoreSub}>
            {data.weekWorkouts} workout{data.weekWorkouts !== 1 ? 's' : ''} this week{volumeLabel}
          </Text>
        </View>
      </View>

      {/* Insight */}
      <Text style={styles.insight}>{data.insight}</Text>

      {/* Muscle recovery bars */}
      {data.trainedMuscles.length > 0 && (
        <View style={styles.muscleList}>
          {data.trainedMuscles.slice(0, 4).map((m) => (
            <View key={m.muscle} style={styles.muscleRow}>
              <Text style={styles.muscleLabel} numberOfLines={1}>
                {m.label}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${m.recoveryPct}%` as unknown as number,
                      backgroundColor: muscleBarColor(m.status),
                    },
                  ]}
                />
              </View>
              <Text style={styles.musclePct}>{m.recoveryPct}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Fresh muscles */}
      {data.freshMuscles.length > 0 && (
        <Text style={styles.freshLine}>
          ✓ Fresh: {data.freshMuscles.slice(0, 3).join(', ')}
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recoveryLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coachLink: {},
  coachLinkText: {
    color: '#888',
    fontSize: 12,
  },

  // Score row
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 10,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  scoreMeta: {
    marginBottom: 4,
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  scoreSub: {
    color: '#888',
    fontSize: 11,
  },

  // Insight
  insight: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },

  // Muscle bars
  muscleList: {
    gap: 6,
    marginBottom: 8,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleLabel: {
    color: '#888',
    fontSize: 11,
    width: 72,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#ffffff15',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  musclePct: {
    color: '#888',
    fontSize: 11,
    width: 32,
    textAlign: 'right',
    flexShrink: 0,
  },

  // Fresh muscles
  freshLine: {
    color: '#86efac', // green-300
    fontSize: 11,
    marginTop: 4,
  },
});
