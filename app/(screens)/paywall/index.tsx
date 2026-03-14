import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscriptionStore, isPro, isElite } from '../../../src/store/subscription';

type Plan = 'PRO' | 'ELITE';

const PLANS: {
  id: Plan;
  name: string;
  price: string;
  yearlyPrice: string;
  color: string;
  badge?: string;
  features: string[];
}[] = [
  {
    id: 'PRO',
    name: 'Pro',
    price: '$7.99',
    yearlyPrice: '$59.99',
    color: '#3B82F6',
    features: [
      'Unlimited routines',
      'Full workout history (all time)',
      'Nutrition tracking (unlimited)',
      'AI Meal Plan generation',
      'Muscle heatmap & strength standards',
      'Full progress charts',
      'Water & supplement tracking',
    ],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: '$14.99',
    yearlyPrice: '$99.99',
    color: '#F59E0B',
    badge: 'BEST VALUE',
    features: [
      'Everything in Pro',
      'AI Workout Planner (unlimited)',
      'AI Coach (unlimited chat)',
      'Unlimited AI Meal Plan generation',
      'Unlimited exercise substitutions',
      'Priority AI response speed',
      'Early access to new features',
    ],
  },
];

const FREE_FEATURES = [
  'Unlimited workout logging',
  'Up to 3 routines',
  'Last 30 days history',
  'Full exercise library',
  'Social feed & sharing',
  'Achievements',
];

export default function PaywallScreen() {
  const { tier, applyPromo } = useSubscriptionStore();
  const [selected, setSelected] = useState<Plan>('ELITE');
  const [yearly, setYearly] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const result = await applyPromo(promoCode.trim());
      Alert.alert('Success!', result.message, [{ text: 'Continue', onPress: () => router.back() }]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Invalid promo code';
      setPromoError(msg);
    } finally {
      setPromoLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#718FAF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={18} color="#F59E0B" />
          <Text style={styles.headerTitle}>Upgrade Pushd</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current tier badge */}
        {tier !== 'FREE' && (
          <View style={styles.currentBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={styles.currentBadgeText}>
              You're on the {tier === 'PRO' ? 'Pro' : 'Elite'} plan
            </Text>
          </View>
        )}

        {/* Billing toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, !yearly && styles.toggleBtnActive]}
            onPress={() => setYearly(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, !yearly && styles.toggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, yearly && styles.toggleBtnActive]}
            onPress={() => setYearly(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, yearly && styles.toggleTextActive]}>Yearly</Text>
            <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save 37%</Text></View>
          </TouchableOpacity>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          const isActive = (plan.id === 'PRO' && isPro(tier)) || (plan.id === 'ELITE' && isElite(tier));
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, isSelected && { borderColor: plan.color, borderWidth: 2 }]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.8}
            >
              <View style={styles.planCardTop}>
                <View style={[styles.planIconWrap, { backgroundColor: `${plan.color}20` }]}>
                  <Ionicons
                    name={plan.id === 'ELITE' ? 'diamond' : 'star'}
                    size={18}
                    color={plan.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.badge && (
                      <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planPrice, { color: plan.color }]}>
                    {yearly ? plan.yearlyPrice : plan.price}
                    <Text style={styles.planPricePer}>{yearly ? '/yr' : '/mo'}</Text>
                  </Text>
                </View>
                <View style={[styles.radio, isSelected && { borderColor: plan.color }]}>
                  {isSelected && <View style={[styles.radioDot, { backgroundColor: plan.color }]} />}
                </View>
              </View>

              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={14} color={plan.color} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Free tier reference */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>Free — Always</Text>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#4A6080" />
              <Text style={[styles.featureText, { color: '#4A6080' }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Promo code */}
        <View style={styles.promoSection}>
          <Text style={styles.promoLabel}>Have a promo code?</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[styles.promoInput, promoError ? styles.promoInputError : null]}
              value={promoCode}
              onChangeText={(t) => { setPromoCode(t); setPromoError(''); }}
              placeholder="Enter code"
              placeholderTextColor="#4A6080"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.promoBtn, promoLoading && { opacity: 0.6 }]}
              onPress={handleApplyPromo}
              disabled={promoLoading || !promoCode.trim()}
              activeOpacity={0.8}
            >
              {promoLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.promoBtnText}>Apply</Text>
              }
            </TouchableOpacity>
          </View>
          {promoError ? <Text style={styles.promoErrorText}>{promoError}</Text> : null}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.subscribeBtn, { backgroundColor: PLANS.find(p => p.id === selected)?.color ?? '#3B82F6' }]}
          onPress={() => Alert.alert('Coming Soon', 'In-app purchases are in sandbox mode. Use a promo code to unlock your tier.')}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.subscribeBtnText}>
            Subscribe to {PLANS.find(p => p.id === selected)?.name} — {yearly ? PLANS.find(p => p.id === selected)?.yearlyPrice : PLANS.find(p => p.id === selected)?.price}{yearly ? '/yr' : '/mo'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.continueFreeTxt}>Continue with Free</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>
          Cancel anytime. By subscribing you agree to our Terms of Service. Payments processed by App Store / Google Play.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0B1326',
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'BarlowCondensed-Bold' },

  content: { paddingHorizontal: 16, paddingTop: 20 },

  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
  },
  currentBadgeText: { color: '#22c55e', fontSize: 13, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },

  toggleRow: {
    flexDirection: 'row', backgroundColor: '#0B1326', borderRadius: 12,
    padding: 4, marginBottom: 20,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  toggleBtnActive: { backgroundColor: '#162540' },
  toggleText: { color: '#4A6080', fontSize: 14, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  toggleTextActive: { color: '#fff' },
  saveBadge: { backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  planCard: {
    backgroundColor: '#0B1326', borderRadius: 16, borderWidth: 1,
    borderColor: '#162540', padding: 16, marginBottom: 12,
  },
  planCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  planIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  planName: { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold' },
  planPrice: { fontSize: 22, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold', marginTop: 2 },
  planPricePer: { fontSize: 14, color: '#718FAF', fontWeight: '400' },
  planBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  planBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  activeBadge: { backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activeBadgeText: { color: '#22c55e', fontSize: 9, fontWeight: '800' },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#4A6080', justifyContent: 'center', alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: '#A8BDD4', fontSize: 13, fontFamily: 'DMSans-Regular', flex: 1 },

  freeCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: '#162540',
    borderRadius: 16, padding: 16, marginBottom: 20, gap: 8,
  },
  freeTitle: { color: '#4A6080', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold', marginBottom: 4 },

  promoSection: { marginBottom: 20 },
  promoLabel: { color: '#718FAF', fontSize: 13, fontWeight: '600', fontFamily: 'DMSans-SemiBold', marginBottom: 8 },
  promoRow: { flexDirection: 'row', gap: 8 },
  promoInput: {
    flex: 1, backgroundColor: '#0B1326', borderWidth: 1, borderColor: '#162540',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14, fontFamily: 'DMSans-Regular',
  },
  promoInputError: { borderColor: '#ef4444' },
  promoBtn: {
    backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  promoBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  promoErrorText: { color: '#ef4444', fontSize: 12, marginTop: 6, fontFamily: 'DMSans-Regular' },

  footer: {
    padding: 16, paddingBottom: 8, borderTopWidth: 1,
    borderTopColor: '#0B1326', backgroundColor: '#060C1B', gap: 10,
  },
  subscribeBtn: {
    borderRadius: 14, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  subscribeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  continueFreeTxt: {
    textAlign: 'center', color: '#718FAF', fontSize: 13,
    fontFamily: 'DMSans-Regular', textDecorationLine: 'underline',
  },
  terms: { color: '#4A6080', fontSize: 10, textAlign: 'center', fontFamily: 'DMSans-Regular', lineHeight: 14 },
});
