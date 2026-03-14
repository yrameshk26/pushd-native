import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptionStore, isPro, isElite, SubscriptionTier } from '../src/store/subscription';

interface ProGateProps {
  required: 'pro' | 'elite';
  children: React.ReactNode;
  /** Optional custom locked UI. Defaults to a lock card. */
  fallback?: React.ReactNode;
}

function LockedCard({ required }: { required: 'pro' | 'elite' }) {
  const tierName = required === 'elite' ? 'Elite' : 'Pro';
  const color = required === 'elite' ? '#F59E0B' : '#3B82F6';
  const icon = required === 'elite' ? 'diamond' : 'star';

  return (
    <View style={styles.lockedCard}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name="lock-closed" size={28} color={color} />
      </View>
      <Text style={styles.lockedTitle}>{tierName} Feature</Text>
      <Text style={styles.lockedDesc}>
        Upgrade to {tierName} to unlock this feature and more.
      </Text>
      <TouchableOpacity
        style={[styles.upgradeBtn, { backgroundColor: color }]}
        onPress={() => router.push('/(screens)/paywall' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name={icon as any} size={16} color="#fff" />
        <Text style={styles.upgradeBtnText}>Upgrade to {tierName}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ProGate({ required, children, fallback }: ProGateProps) {
  const { tier } = useSubscriptionStore();

  const hasAccess =
    required === 'pro' ? isPro(tier) : isElite(tier);

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : <LockedCard required={required} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  lockedCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, margin: 20,
    backgroundColor: '#0B1326', borderRadius: 20,
    borderWidth: 1, borderColor: '#162540',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  lockedTitle: {
    color: '#fff', fontSize: 20, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold', marginBottom: 8,
  },
  lockedDesc: {
    color: '#718FAF', fontSize: 14, textAlign: 'center',
    lineHeight: 20, fontFamily: 'DMSans-Regular', marginBottom: 24,
  },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
