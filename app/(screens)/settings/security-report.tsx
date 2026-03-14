import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color="#60a5fa" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function CheckItem({ children }: { children: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name="checkmark-circle" size={15} color="#4ade80" style={styles.checkIcon} />
      <Text style={styles.checkText}>{children}</Text>
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{value}</Text>
    </View>
  );
}

export default function SecurityReportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security &amp; Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={32} color="#60a5fa" />
          </View>
          <Text style={styles.heroTitle}>Security &amp; Privacy Report</Text>
          <Text style={styles.heroSub}>
            Your fitness data is personal. Here's exactly how we protect your account and data — with specifics, not marketing language.
          </Text>
          <Text style={styles.heroDate}>Last updated: March 2026</Text>
        </View>

        {/* Callout */}
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            No system is 100% secure. Pushd uses <Text style={styles.calloutBold}>defence-in-depth</Text> — multiple independent layers of protection so that if any single measure were bypassed, others remain in place.
          </Text>
        </View>

        {/* Account Protection */}
        <SectionHeader icon="lock-closed-outline" title="Account Protection" />
        <View style={styles.card}>
          <CheckItem>Two-factor authentication on every login. A one-time code is sent to your email, expires in 10 minutes, and is invalidated after 5 incorrect attempts.</CheckItem>
          <CheckItem>Google Sign-In — we never see or store your Google password.</CheckItem>
          <CheckItem>Passkey &amp; biometric login (WebAuthn). Log in with Face ID or fingerprint. Your biometric data never leaves your device.</CheckItem>
          <CheckItem>Passwords are hashed with bcrypt (cost factor 12) — a one-way fingerprint, not your actual password.</CheckItem>
          <CheckItem>Account lockout after 5 failed login attempts (15-minute lockout).</CheckItem>
          <CheckItem>Email verified before account activation. Unverified accounts cannot log in.</CheckItem>
          <CheckItem>Sessions expire after 30 days. Pre-authentication tokens expire after 2 minutes.</CheckItem>
        </View>

        {/* Data in Transit */}
        <SectionHeader icon="server-outline" title="Data in Transit &amp; at Rest" />
        <View style={styles.card}>
          <CheckItem>All connections use HTTPS/TLS with HTTP Strict Transport Security (HSTS) enforced.</CheckItem>
          <CheckItem>Security headers on every response: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.</CheckItem>
          <CheckItem>Every API endpoint verifies your session before returning any data.</CheckItem>
          <CheckItem>Ownership checks on every operation — you can only access your own data.</CheckItem>
          <CheckItem>Strict input validation (Zod schemas) on all API inputs prevents mass assignment attacks.</CheckItem>
          <CheckItem>PostgreSQL with parameterised queries throughout — SQL injection is not possible.</CheckItem>
        </View>

        {/* Rate Limiting */}
        <SectionHeader icon="shield-outline" title="Rate Limiting &amp; Abuse Prevention" />
        <View style={styles.card}>
          <CheckItem>Sensitive endpoints — login, OTP, password reset, AI features — are rate-limited by IP and per-user account.</CheckItem>
          <CheckItem>OTP sessions are invalidated after 5 incorrect attempts.</CheckItem>
          <CheckItem>Constant-time comparisons used for security-sensitive operations to prevent timing attacks.</CheckItem>
        </View>

        {/* Workout Sharing */}
        <SectionHeader icon="eye-outline" title="Workout Sharing Is Opt-In" />
        <View style={styles.card}>
          <CheckItem>All workouts are private by default. Nothing you log is visible to others unless you explicitly share it.</CheckItem>
          <CheckItem>Social features (likes, comments) only work on workouts you have made public.</CheckItem>
          <CheckItem>You can make a shared workout private again at any time.</CheckItem>
        </View>

        {/* What we collect */}
        <SectionHeader icon="eye-off-outline" title="What We Collect" />
        <View style={styles.tableCard}>
          <DataRow label="Email address" value="Login &amp; transactional emails" />
          <View style={styles.tableSep} />
          <DataRow label="Display name &amp; username" value="Profile identification" />
          <View style={styles.tableSep} />
          <DataRow label="Workout logs" value="Core app functionality" />
          <View style={styles.tableSep} />
          <DataRow label="Body weight" value="Optional progress tracking" />
          <View style={styles.tableSep} />
          <DataRow label="Nutrition &amp; water" value="Optional tracking features" />
          <View style={styles.tableSep} />
          <DataRow label="Profile photo" value="Optional, stored on Cloudinary CDN" />
          <View style={styles.tableSep} />
          <DataRow label="Push notification token" value="Optional, revocable in settings" />
        </View>

        <View style={styles.notCollectedCard}>
          <Text style={styles.notCollectedTitle}>We do not collect:</Text>
          {[
            'Payment information — Pushd has no payment processing',
            'Location data — we do not track where you are',
            'Device fingerprints',
            'Advertising or analytics tracking — no ad SDKs, no data selling',
          ].map((item) => (
            <Text key={item} style={styles.notCollectedItem}>• {item}</Text>
          ))}
        </View>

        {/* Third-party services */}
        <SectionHeader icon="cube-outline" title="Third-Party Services" />
        <View style={styles.tableCard}>
          {[
            ['Resend', 'Transactional email'],
            ['Cloudinary', 'Profile photo storage'],
            ['Google OAuth', 'Optional sign-in'],
            ['PostgreSQL', 'Primary database'],
            ['Redis', 'Session &amp; OTP storage'],
          ].map(([service, purpose], i, arr) => (
            <View key={service}>
              <DataRow label={service} value={purpose} />
              {i < arr.length - 1 && <View style={styles.tableSep} />}
            </View>
          ))}
        </View>
        <Text style={styles.thirdPartyNote}>We do not sell data to any of these providers for advertising purposes.</Text>

        {/* Contact */}
        <View style={styles.contactCard}>
          <Ionicons name="bug-outline" size={20} color="#60a5fa" style={{ marginBottom: 8 }} />
          <Text style={styles.contactTitle}>Found a security issue?</Text>
          <Text style={styles.contactText}>
            Please contact us directly rather than disclosing publicly. This gives us the opportunity to protect users before a vulnerability is widely known.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('https://pushd.fit/contact?subject=security')}
            activeOpacity={0.85}
          >
            <Text style={styles.contactBtnText}>Contact Us</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0B1326',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '700', color: '#fff',
    fontFamily: 'BarlowCondensed-Bold', textAlign: 'center',
  },

  content: { paddingHorizontal: 16, paddingTop: 20 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 20 },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    fontFamily: 'BarlowCondensed-Bold', marginBottom: 8, textAlign: 'center',
  },
  heroSub: {
    fontSize: 13, color: '#718FAF', textAlign: 'center', lineHeight: 20,
    paddingHorizontal: 8, fontFamily: 'DMSans-Regular',
  },
  heroDate: { fontSize: 11, color: '#4A6080', marginTop: 8, fontFamily: 'DMSans-Regular' },

  // Callout
  callout: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 14, marginBottom: 24,
  },
  calloutText: { fontSize: 13, color: '#718FAF', lineHeight: 20, fontFamily: 'DMSans-Regular' },
  calloutBold: { color: '#fff', fontWeight: '700' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 8 },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#fff',
    fontFamily: 'DMSans-Bold',
  },

  // Card with check items
  card: {
    backgroundColor: '#0B1326', borderRadius: 14,
    borderWidth: 1, borderColor: '#162540',
    padding: 14, gap: 10, marginBottom: 20,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkIcon: { marginTop: 1, flexShrink: 0 },
  checkText: { flex: 1, fontSize: 13, color: '#A8BDD4', lineHeight: 19, fontFamily: 'DMSans-Regular' },

  // Table card
  tableCard: {
    backgroundColor: '#0B1326', borderRadius: 14,
    borderWidth: 1, borderColor: '#162540',
    overflow: 'hidden', marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  tableLabel: {
    width: 140, fontSize: 13, color: '#fff',
    fontWeight: '600', fontFamily: 'DMSans-SemiBold',
  },
  tableValue: { flex: 1, fontSize: 13, color: '#718FAF', fontFamily: 'DMSans-Regular', lineHeight: 18 },
  tableSep: { height: 1, backgroundColor: '#162540' },

  // Not collected
  notCollectedCard: {
    backgroundColor: 'rgba(74,222,128,0.05)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.15)',
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  notCollectedTitle: {
    fontSize: 13, fontWeight: '700', color: '#4ade80',
    fontFamily: 'DMSans-Bold', marginBottom: 8,
  },
  notCollectedItem: {
    fontSize: 13, color: '#718FAF', fontFamily: 'DMSans-Regular', lineHeight: 20,
  },

  thirdPartyNote: {
    fontSize: 11, color: '#4A6080', fontFamily: 'DMSans-Regular',
    marginTop: 6, marginBottom: 20, marginLeft: 2,
  },

  // Contact
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 4,
  },
  contactTitle: {
    fontSize: 15, fontWeight: '700', color: '#fff',
    fontFamily: 'DMSans-Bold', marginBottom: 8,
  },
  contactText: {
    fontSize: 13, color: '#718FAF', textAlign: 'center', lineHeight: 20,
    fontFamily: 'DMSans-Regular', marginBottom: 16,
  },
  contactBtn: {
    backgroundColor: '#3B82F6', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  contactBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
