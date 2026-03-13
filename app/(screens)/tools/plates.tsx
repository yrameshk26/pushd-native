import { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS: Record<number, string> = { 25: '#EF4444', 20: '#3B82F6', 15: '#FACC15', 10: '#22C55E', 5: '#FFFFFF', 2.5: '#F97316', 1.25: '#A855F7' };
const BAR_WEIGHT = 20;

function calculatePlates(target: number) {
  const perSide = (target - BAR_WEIGHT) / 2;
  if (perSide < 0) return [];
  const result: { weight: number; count: number }[] = [];
  let remaining = perSide;
  for (const plate of PLATE_SIZES) {
    const count = Math.floor(remaining / plate);
    if (count > 0) { result.push({ weight: plate, count }); remaining = Math.round((remaining - count * plate) * 100) / 100; }
  }
  return result;
}

export default function PlateCalculator() {
  const [target, setTarget] = useState('');
  const t = parseFloat(target);
  const valid = !isNaN(t) && t >= BAR_WEIGHT;
  const plates = valid ? calculatePlates(t) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.heading}>Plate Calculator</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Target Weight (kg)</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="100" placeholderTextColor="#444" value={target} onChangeText={setTarget} />
        <Text style={styles.barNote}>Barbell: {BAR_WEIGHT}kg</Text>

        {valid && plates.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Plates per side</Text>
            {plates.map(({ weight, count }) => (
              <View key={weight} style={styles.plateRow}>
                <View style={[styles.plateColor, { backgroundColor: PLATE_COLORS[weight] ?? '#888' }]} />
                <Text style={styles.plateWeight}>{weight}kg</Text>
                <Text style={styles.plateCount}>× {count}</Text>
                <Text style={styles.plateTotal}>{(weight * count).toFixed(2)}kg</Text>
              </View>
            ))}

            {/* Visual bar */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Visual</Text>
            <View style={styles.barVisual}>
              <View style={styles.barEnd} />
              <View style={styles.barShaft} />
              {[...plates].reverse().map(({ weight, count }) =>
                Array.from({ length: count }).map((_, i) => (
                  <View key={`${weight}-${i}`} style={[styles.plateVisual, { backgroundColor: PLATE_COLORS[weight] ?? '#888', height: 20 + weight * 1.5 }]} />
                ))
              )}
              <View style={styles.barCenter}><Text style={styles.barCenterText}>{target}kg</Text></View>
              {plates.map(({ weight, count }) =>
                Array.from({ length: count }).map((_, i) => (
                  <View key={`${weight}-${i}-r`} style={[styles.plateVisual, { backgroundColor: PLATE_COLORS[weight] ?? '#888', height: 20 + weight * 1.5 }]} />
                ))
              )}
              <View style={styles.barShaft} />
              <View style={styles.barEnd} />
            </View>
          </>
        )}
        {valid && plates.length === 0 && <Text style={styles.empty}>Just the bar ({BAR_WEIGHT}kg)</Text>}
        {!valid && target.length > 0 && <Text style={styles.error}>Minimum weight is {BAR_WEIGHT}kg (bar only)</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 20 },
  label: { color: '#888', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12, padding: 16, fontSize: 28, fontWeight: '700', borderWidth: 1, borderColor: '#2a2a2a', textAlign: 'center', marginBottom: 8 },
  barNote: { color: '#666', fontSize: 12, textAlign: 'center', marginBottom: 24 },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  plateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a', gap: 12 },
  plateColor: { width: 12, height: 32, borderRadius: 4 },
  plateWeight: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1 },
  plateCount: { color: '#888', fontSize: 15 },
  plateTotal: { color: '#6C63FF', fontWeight: '600', fontSize: 14 },
  barVisual: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, overflow: 'hidden' },
  barEnd: { width: 12, height: 40, backgroundColor: '#666', borderRadius: 4 },
  barShaft: { width: 30, height: 8, backgroundColor: '#444' },
  plateVisual: { width: 14, borderRadius: 3, marginHorizontal: 1 },
  barCenter: { flex: 1, alignItems: 'center' },
  barCenterText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 15 },
  error: { color: '#ef4444', textAlign: 'center', marginTop: 20 },
});
