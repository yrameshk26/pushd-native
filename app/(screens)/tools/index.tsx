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
            <View style={styles.iconBox}><Ionicons name={t.icon as never} size={22} color="#3B82F6" /></View>
            <View style={styles.text}>
              <Text style={styles.label}>{t.label}</Text>
              <Text style={styles.sub}>{t.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4A6080" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    fontFamily: 'BarlowCondensed-ExtraBold', color: '#fff', marginBottom: 24 },
  card: { backgroundColor: '#0B1326', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#162540' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#060C1B', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  text: { flex: 1 },
  label: { color: '#fff', fontSize: 16, fontWeight: '600',
    fontFamily: 'DMSans-SemiBold', marginBottom: 2 },
  sub: { color: '#718FAF', fontSize: 13 },
});
