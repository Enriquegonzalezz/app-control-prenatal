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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { chatApi, directoryApi, ChatMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';
import { useChatRealtime } from '@/hooks/useChatRealtime';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatDayLabel(iso: string): string {
  const today = startOfDay(new Date());
  const day = startOfDay(new Date(iso));
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Row =
  | { kind: 'sep'; id: string; label: string }
  | { kind: 'msg'; id: string; msg: ChatMessage };

/** Intercala separadores de fecha entre mensajes (orden cronológico ascendente). */
function buildRows(messages: ChatMessage[]): Row[] {
  const rows: Row[] = [];
  let lastDay = '';
  for (const m of messages) {
    const dayKey = new Date(m.created_at).toDateString();
    if (dayKey !== lastDay) {
      rows.push({ kind: 'sep', id: `sep-${dayKey}`, label: formatDayLabel(m.created_at) });
      lastDay = dayKey;
    }
    rows.push({ kind: 'msg', id: m.id, msg: m });
  }
  return rows;
}

function DaySeparator({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View style={{
        backgroundColor: isDark ? '#2A2A2A' : '#E5E7EB',
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#D1D5DB' : '#6B7280' }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({ msg, isMe, isDark }: { msg: ChatMessage; isMe: boolean; isDark: boolean }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      marginHorizontal: 16,
      marginBottom: 6,
    }}>
      <View style={{
        maxWidth: '78%',
        backgroundColor: isMe ? '#E8467C' : (isDark ? '#2A2A2A' : '#F0F0F0'),
        borderRadius: 18,
        borderBottomRightRadius: isMe ? 4 : 18,
        borderBottomLeftRadius: isMe ? 18 : 4,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}>
        <Text style={{ fontSize: 14, color: isMe ? '#FFFFFF' : (isDark ? '#F3F4F6' : '#111827'), lineHeight: 20 }}>
          {msg.content}
        </Text>
        <Text style={{ fontSize: 10, color: isMe ? '#FFD6E7' : '#9CA3AF', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
          {formatTime(msg.created_at)}
          {isMe && msg.read_at ? ' ✓✓' : isMe ? ' ✓' : ''}
        </Text>
      </View>
    </View>
  );
}

/** Burbuja "escribiendo…" estilo tres puntos. */
function TypingBubble({ isDark }: { isDark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginHorizontal: 16, marginBottom: 6 }}>
      <View style={{
        backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0',
        borderRadius: 18, borderBottomLeftRadius: 4,
        paddingHorizontal: 16, paddingVertical: 11,
      }}>
        <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>escribiendo…</Text>
      </View>
    </View>
  );
}

export default function ChatRoomScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const { id, name, doctorProfileId, doctorUserId, specialtyName, clinicName, consultationFee } =
    useLocalSearchParams<{
      id: string;
      name: string;
      doctorProfileId?: string;
      doctorUserId?: string;
      specialtyName?: string;
      clinicName?: string;
      consultationFee?: string;
    }>();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const userRole = useAuthStore((s) => s.user?.role);
  const isPatient = userRole === 'patient';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingDoctor, setFetchingDoctor] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

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

  // Red de seguridad: si el socket estuvo caído, recarga el historial al volver.
  useFocusEffect(useCallback(() => { loadMessages(); }, [loadMessages]));

  // ── Realtime ──────────────────────────────────────────────
  const handleNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    // El otro nos escribió → marcar como leído (dispara message_read en el backend).
    if (token && id && msg.sender_id !== userId) {
      chatApi.markRead(token, id).catch(() => {});
    }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [token, id, userId]);

  const handleMessageRead = useCallback((payload: { reader_id: string; read_at: string }) => {
    // El otro leyó MIS mensajes → actualizar ✓✓.
    if (payload.reader_id === userId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.sender_id === userId && !m.read_at ? { ...m, read_at: payload.read_at } : m,
      ),
    );
  }, [userId]);

  const { isOtherOnline, otherTyping, sendTyping } = useChatRealtime({
    relationshipId: id,
    myUserId: userId,
    onNewMessage: handleNewMessage,
    onMessageRead: handleMessageRead,
  });

  const handleChangeText = (value: string) => {
    setText(value);
    if (value.trim()) sendTyping();
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !token || !id || sending) return;
    setSending(true);
    setText('');
    inputRef.current?.clear();
    try {
      const res = await chatApi.send(token, id, content);
      setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!isPatient) return;
    if (doctorProfileId) {
      router.push({
        pathname: '/book-appointment',
        params: {
          doctorProfileId,
          doctorUserId: doctorUserId ?? '',
          doctorName: name ?? '',
          specialtyName: specialtyName ?? '',
          clinicName: clinicName ?? '',
          consultationFee: consultationFee ?? '',
        },
      });
      return;
    }
    if (!doctorUserId) return;
    setFetchingDoctor(true);
    try {
      const res = await directoryApi.getByUserId(doctorUserId);
      const doctor = res.data?.doctors?.[0];
      if (doctor) {
        router.push({
          pathname: '/book-appointment',
          params: {
            doctorProfileId: doctor.doctor_profile_id,
            doctorUserId: doctor.user_id,
            doctorName: doctor.full_name,
            specialtyName: doctor.specialty?.name ?? '',
            clinicName: doctor.clinic?.name ?? '',
            consultationFee: String(doctor.consultation_fee ?? ''),
          },
        });
      }
    } catch { /* silent */ }
    finally { setFetchingDoctor(false); }
  };

  const bg        = isDark ? '#141414' : '#EFEFEF';
  const headerBg  = isDark ? '#1E1E1E' : '#FFFFFF';
  const inputText = isDark ? '#F9FAFB' : '#111827';

  const statusLabel = otherTyping ? 'escribiendo…' : isOtherOnline ? 'En línea' : 'Desconectado';
  const statusColor = otherTyping ? '#E8467C' : isOtherOnline ? '#10B981' : '#9CA3AF';

  const rows = buildRows(messages);

  return (
    // KAV envuelve TODO (incluyendo header) — patrón WhatsApp
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Status bar safe area */}
      <View style={{ height: insets.top, backgroundColor: headerBg }} />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: headerBg,
        borderBottomWidth: 1, borderBottomColor: isDark ? '#2D2D2D' : '#F0F0F0',
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          accessibilityRole="button" accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <Pressable
          onPress={isPatient && (doctorProfileId || doctorUserId) ? handleBookAppointment : undefined}
          disabled={fetchingDoctor}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          accessibilityRole={isPatient && (doctorProfileId || doctorUserId) ? 'button' : undefined}
          accessibilityLabel={isPatient && (doctorProfileId || doctorUserId) ? `Ver perfil de ${name}` : undefined}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8467C15', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#E8467C' }}>
              {(name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
                {name ?? 'Conversación'}
              </Text>
              {isPatient && (doctorProfileId || doctorUserId) && (
                <Ionicons
                  name={fetchingDoctor ? 'time-outline' : 'calendar-outline'}
                  size={13}
                  color="#E8467C"
                />
              )}
            </View>
            <Text style={{ fontSize: 11, color: statusColor }}>{statusLabel}</Text>
          </View>
        </Pressable>
      </View>

      {/* Mensajes — flex: 1 para ocupar todo el espacio disponible */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Cargando mensajes...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.kind === 'sep' ? (
              <DaySeparator label={item.label} isDark={isDark} />
            ) : (
              <MessageBubble msg={item.msg} isMe={item.msg.sender_id === userId} isDark={isDark} />
            )
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={otherTyping ? <TypingBubble isDark={isDark} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="chatbubbles-outline" size={48} color="#E8467C" />
              <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                No hay mensajes aún.{'\n'}¡Sé el primero en escribir!
              </Text>
            </View>
          }
        />
      )}

      {/* Barra de input — pegada al teclado */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        backgroundColor: headerBg,
        borderTopWidth: 1,
        borderTopColor: isDark ? '#2D2D2D' : '#E5E7EB',
      }}>
        <View style={{
          flex: 1,
          backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
          borderRadius: 26,
          borderWidth: 1,
          borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
          paddingHorizontal: 18,
          paddingVertical: 10,
          minHeight: 46,
          justifyContent: 'center',
        }}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleChangeText}
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
            width: 46, height: 46, borderRadius: 23,
            backgroundColor: text.trim() && !sending ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'),
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#E8467C',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: text.trim() && !sending ? 0.4 : 0,
            shadowRadius: 6,
            elevation: text.trim() && !sending ? 4 : 0,
          }}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
        >
          <Ionicons
            name="send"
            size={18}
            color={text.trim() && !sending ? '#FFFFFF' : '#9CA3AF'}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
