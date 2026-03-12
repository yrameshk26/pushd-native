import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WeeklyReview {
  summary: string;
  highlights: string[];
  improvements: string[];
}

interface WeeklyReviewCardProps {
  review: WeeklyReview;
}

export function WeeklyReviewCard({ review }: WeeklyReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {/* Purple gradient header (simulated via layered views) */}
      <View style={styles.header}>
        <View style={styles.headerAccent} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={16} color="#a78bfa" />
            <Text style={styles.headerTitle}>Weekly AI Review</Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.expandButton} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#888"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary always visible */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryText} numberOfLines={expanded ? undefined : 2}>
          {review.summary}
        </Text>
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {review.highlights.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="thumbs-up-outline" size={13} color="#10B981" />
                <Text style={styles.sectionTitle}>Highlights</Text>
              </View>
              {review.highlights.map((item, i) => (
                <View key={i} style={styles.listRow}>
                  <View style={[styles.bullet, styles.bulletGreen]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {review.improvements.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up-outline" size={13} color="#6C63FF" />
                <Text style={styles.sectionTitle}>Improvements</Text>
              </View>
              {review.improvements.map((item, i) => (
                <View key={i} style={styles.listRow}>
                  <View style={[styles.bullet, styles.bulletPurple]} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {!expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)} style={styles.readMore}>
          <Text style={styles.readMoreText}>Read full review</Text>
          <Ionicons name="arrow-forward" size={12} color="#6C63FF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  header: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
    opacity: 0.12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: '700',
  },
  expandButton: {
    padding: 2,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  summaryText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 19,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  bulletGreen: {
    backgroundColor: '#10B981',
  },
  bulletPurple: {
    backgroundColor: '#6C63FF',
  },
  listText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  readMoreText: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '600',
  },
});
