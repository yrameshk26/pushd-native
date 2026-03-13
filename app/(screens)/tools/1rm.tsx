import { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

function epley(w: number, r: number) { return r === 1 ? w : w * (1 + r / 30); }
function brzycki(w: number, r: number) { return r === 1 ? w : w * (36 / (37 - r)); }
function lander(w: number, r: number) { return r === 1 ? w : (100 * w) / (101.3 - 2.67123 * r); }
function lombardi(w: number, r: number) { return r === 1 ? w : w * Math.pow(r, 0.1); }

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60];

export default function OneRMCalculator() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const w = parseFloat(weight);
  const r = parseInt(reps);
  const valid = !isNaN(w) && !isNaN(r) && w > 0 && r > 0 && r <= 30;

  const avg = valid ? (epley(w, r) + brzycki(w, r) + lander(w, r) + lombardi(w, r)) / 4 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.heading}>1RM Calculator</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputs}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="100" placeholderTextColor="#4A6080" value={weight} onChangeText={setWeight} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reps</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="5" placeholderTextColor="#4A6080" value={reps} onChangeText={setReps} />
          </View>
        </View>

        {valid && (
          <>
            <View style={styles.result}>
              <Text style={styles.resultLabel}>Estimated 1RM</Text>
              <Text style={styles.resultValue}>{avg.toFixed(1)} kg</Text>
            </View>

            <View style={styles.formulas}>
              {[['Epley', epley(w, r)], ['Brzycki', brzycki(w, r)], ['Lander', lander(w, r)], ['Lombardi', lombardi(w, r)]].map(([name, val]) => (
                <View key={name as string} style={styles.formulaRow}>
                  <Text style={styles.formulaName}>{name as string}</Text>
                  <Text style={styles.formulaVal}>{(val as number).toFixed(1)} kg</Text>
                </View>
              ))}
            </View>

            <Text style={styles.tableHeader}>Training Percentages</Text>
            {PERCENTAGES.map((pct) => (
              <View key={pct} style={styles.tableRow}>
                <Text style={styles.tableLabel}>{pct}%</Text>
                <Text style={styles.tableVal}>{(avg * pct / 100).toFixed(1)} kg</Text>
                <Text style={styles.tableReps}>{pct >= 95 ? '1-2' : pct >= 90 ? '2-3' : pct >= 85 ? '3-5' : pct >= 80 ? '4-6' : pct >= 75 ? '6-8' : pct >= 70 ? '8-10' : pct >= 65 ? '10-12' : '12-15'} reps</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#fff' ,
    fontFamily: 'BarlowCondensed-Bold'},
  content: { padding: 20 },
  inputs: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  inputGroup: { flex: 1 },
  label: { color: '#718FAF', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#0B1326', color: '#fff', borderRadius: 12, padding: 16, fontSize: 20, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold', borderWidth: 1, borderColor: '#162540', textAlign: 'center' },
  result: { backgroundColor: '#0B1326', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#3B82F6' },
  resultLabel: { color: '#718FAF', fontSize: 14, marginBottom: 8 },
  resultValue: { color: '#3B82F6', fontSize: 48, fontWeight: '800' },
  formulas: { backgroundColor: '#0B1326', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#162540' },
  formulaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#162540' },
  formulaName: { color: '#718FAF', fontSize: 14 },
  formulaVal: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tableHeader: { color: '#718FAF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
    fontFamily: 'BarlowCondensed-SemiBold', letterSpacing: 1, marginBottom: 12 },
  tableRow: { flexDirection: 'row', backgroundColor: '#0B1326', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#162540' },
  tableLabel: { color: '#3B82F6', fontWeight: '700', width: 50, fontSize: 14 },
  tableVal: { color: '#fff', fontWeight: '600', flex: 1, fontSize: 14 },
  tableReps: { color: '#718FAF', fontSize: 13 },
});
