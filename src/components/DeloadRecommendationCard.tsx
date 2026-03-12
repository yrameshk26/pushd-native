import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeloadRecommendation {
  shouldDeload: boolean;
  reason: string;
  suggestedWeek?: string;
}

interface DeloadRecommendationCardProps {
  recommendation: DeloadRecommendation;
  onDismiss?: () => void;
}

export function DeloadRecommendationCard({ recommendation, onDismiss }: DeloadRecommendationCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !recommendation.shouldDeload) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={20} color="#F59E0B" />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Deload Week Suggested</Text>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={16} color="#888" />
          </TouchableOpacity>
        </View>

        <Text style={styles.reason}>{recommendation.reason}</Text>

        {recommendation.suggestedWeek ? (
          <View style={styles.weekTag}>
            <Ionicons name="calendar-outline" size={12} color="#F59E0B" />
            <Text style={styles.weekText}>Suggested: {recommendation.suggestedWeek}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1200',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3d2e00',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  dismissButton: {
    padding: 2,
  },
  reason: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  weekTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weekText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
});
