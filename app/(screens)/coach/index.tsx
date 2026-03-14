import { useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/api/client';
import { ProGate } from '../../../components/ProGate';

interface Message { id: string; role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'How do I build more muscle?',
  'What should I eat on rest days?',
  'How often should I train legs?',
  'Tips for improving my squat?',
];

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const allMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/api/ai/coach', { messages: allMessages });
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply ?? data.message };
      setMessages((prev) => [...prev, assistantMsg]);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch (e: any) {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: e?.response?.data?.error ?? 'Something went wrong. Try again.' };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProGate required="pro">
      <View style={styles.header}>
        <Text style={styles.heading}>AI Coach</Text>
        {remaining !== null && <Text style={styles.remaining}>{remaining} messages left today</Text>}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          ListHeaderComponent={messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Your AI Fitness Coach</Text>
              <Text style={styles.emptySub}>Ask anything about training, nutrition, or recovery.</Text>
              <View style={styles.starters}>
                {STARTERS.map((s) => (
                  <TouchableOpacity key={s} style={styles.starter} onPress={() => send(s)}>
                    <Text style={styles.starterText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.content}</Text>
            </View>
          )}
        />

        {loading && (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.typingText}>Coach is thinking...</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask your coach..."
            placeholderTextColor="#718FAF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={!input.trim() || loading}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </ProGate>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060C1B' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  heading: { fontSize: 24, fontWeight: '800', fontFamily: 'BarlowCondensed-ExtraBold', color: '#fff' },
  remaining: { color: '#718FAF', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700',
    fontFamily: 'BarlowCondensed-Bold', marginBottom: 8 },
  emptySub: { color: '#718FAF', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  starters: { width: '100%', gap: 10 },
  starter: { backgroundColor: '#0B1326', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#162540' },
  starterText: { color: '#A8BDD4', fontSize: 14 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 14, marginBottom: 10 },
  userBubble: { backgroundColor: '#3B82F6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#0B1326', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#A8BDD4', fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  typingText: { color: '#718FAF', fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#0B1326' },
  input: { flex: 1, backgroundColor: '#0B1326', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: '#162540' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
