import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TOOLS = [
  { label: '1RM Calculator', sub: 'Estimate your one-rep max', icon: 'calculator-outline', route: '/(screens)/tools/1rm' },
  { label: 'Plate Calculator', sub: 'Figure out your plate setup', icon: 'barbell-outline', route: '/(screens)/tools/plates' },
  { label: 'AI Coach', sub: 'Chat with your fitness coach', icon: 'chatbubble-ellipses-outline', route: '/(screens)/coach' },
  { label: 'AI Planner', sub: 'Generate a personalised program', icon: 'sparkles-outline', route: '/(screens)/ai-planner' },
];

export default function ToolsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Tools & AI</Text>
        {TOOLS.map((t) => (
          <TouchableOpacity key={t.route} style={styles.card} onPress={() => router.push(t.route as never)}>
            <View style={styles.iconBox}><Ionicons name={t.icon as never} size={22} color="#6C63FF" /></View>
            <View style={styles.text}>
              <Text style={styles.label}>{t.label}</Text>
              <Text style={styles.sub}>{t.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0d0d1f', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  text: { flex: 1 },
  label: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  sub: { color: '#666', fontSize: 13 },
});
