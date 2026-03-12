import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeloadResult {
  shouldDeload: boolean;
  reason: string;
  recommendation: string;
}

interface DeloadRecommendationCardProps {
  data: DeloadResult;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeloadRecommendationCard({ data }: DeloadRecommendationCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !data.shouldDeload) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Warning icon circle */}
      <View style={styles.iconCircle}>
        <Ionicons name="warning-outline" size={16} color="#fbbf24" />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Deload Week Suggested</Text>
          <TouchableOpacity
            onPress={() => setDismissed(true)}
            style={styles.dismissBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="close" size={14} color="#888" />
          </TouchableOpacity>
        </View>
        <Text style={styles.reason}>{data.reason}</Text>
        <Text style={styles.recommendation}>{data.recommendation}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1c1200',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b4530940',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  dismissBtn: {
    padding: 2,
    flexShrink: 0,
  },
  reason: {
    color: '#888',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  recommendation: {
    color: '#fbbf2480',
    fontSize: 12,
    lineHeight: 17,
  },
});
