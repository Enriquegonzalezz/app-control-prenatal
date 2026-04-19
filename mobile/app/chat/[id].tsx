import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { chatApi, ChatMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({
  msg, isMe, isDark,
}: {
  msg: ChatMessage; isMe: boolean; isDark: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      marginHorizontal: 16,
      marginBottom: 6,
    }}>
      <View style={{
        maxWidth: '78%',
        backgroundColor: isMe ? '#E8467C' : (isDark ? '#2A2A2A' : '#F3F4F6'),
        borderRadius: 18,
        borderBottomRightRadius: isMe ? 4 : 18,
        borderBottomLeftRadius: isMe ? 18 : 4,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}>
        <Text style={{
          fontSize: 14,
          color: isMe ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#111827'),
          lineHeight: 20,
        }}>
          {msg.content}
        </Text>
        <Text style={{
          fontSize: 10,
          color: isMe ? '#FFD6E7' : '#9CA3AF',
          marginTop: 3,
          textAlign: isMe ? 'right' : 'left',
        }}>
          {formatTime(msg.created_at)}
          {isMe && msg.read_at ? ' ✓✓' : isMe ? ' ✓' : ''}
        </Text>
      </View>
    </View>
  );
}

export default function ChatRoomScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await chatApi.messages(token, id);
      setMessages(Array.isArray(res.data) ? res.data : []);
      await chatApi.markRead(token, id);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !token || !id || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await chatApi.send(token, id, content);
      setMessages((prev) => [...prev, res.data]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const bg = isDark ? '#141414' : '#F5F5F5';
  const inputBg = isDark ? '#2A2A2A' : '#FFFFFF';
  const inputText = isDark ? '#F9FAFB' : '#111827';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: isDark ? '#2D2D2D' : '#F3F4F6',
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          accessibilityRole="button" accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <View style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: '#E8467C15', alignItems: 'center', justifyContent: 'center', marginRight: 10,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#E8467C' }}>
            {(name ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
            {name ?? 'Conversación'}
          </Text>
          <Text style={{ fontSize: 11, color: '#10B981' }}>Activo</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Cargando mensajes...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble msg={item} isMe={item.sender_id === userId} isDark={isDark} />
            )}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                <Ionicons name="chatbubbles-outline" size={48} color="#E8467C" />
                <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                  No hay mensajes aún.{'\n'}¡Sé el primero en escribir!
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderTopWidth: 1, borderTopColor: isDark ? '#2D2D2D' : '#F0F0F0',
          gap: 10,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
            borderRadius: 26,
            borderWidth: 1,
            borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
            paddingHorizontal: 18,
            paddingVertical: 12,
            minHeight: 48,
            justifyContent: 'center',
          }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9CA3AF"
              style={{ fontSize: 15, color: inputText, maxHeight: 120, lineHeight: 20 }}
              multiline
              returnKeyType="default"
              accessibilityLabel="Campo de mensaje"
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: text.trim() && !sending ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'),
              alignItems: 'center', justifyContent: 'center',
              shadowColor: text.trim() && !sending ? '#E8467C' : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: text.trim() && !sending ? 4 : 0,
            }}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
          >
            <Ionicons
              name="send"
              size={19}
              color={text.trim() && !sending ? '#FFFFFF' : '#9CA3AF'}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
