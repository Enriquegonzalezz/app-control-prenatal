import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { chatApi, Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function SkeletonRow({ isDark }: { isDark: boolean }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const bg = isDark ? '#2A2A2A' : '#E5E7EB';
  return (
    <Animated.View style={{ opacity: anim, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: bg, marginRight: 12 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ height: 13, backgroundColor: bg, borderRadius: 6, width: '55%' }} />
        <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '80%' }} />
      </View>
    </Animated.View>
  );
}

function ConversationRow({ conv, isDark }: { conv: Conversation; isDark: boolean }) {
  const initials = conv.other_party.name
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const lastMsg = conv.last_message;
  const hasUnread = conv.unread_count > 0;

  return (
    <Pressable
      onPress={() => router.push({
        pathname: '/chat/[id]',
        params: { id: conv.relationship_id, name: conv.other_party.name },
      })}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#2A2A2A' : '#F3F4F6',
      }}
      accessibilityRole="button"
      accessibilityLabel={`Chat con ${conv.other_party.name}`}
    >
      {/* Avatar */}
      <View style={{
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#E8467C15',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#E8467C' }}>{initials}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{
          fontSize: 15, fontWeight: hasUnread ? '700' : '500',
          color: isDark ? '#F9FAFB' : '#111827',
        }} numberOfLines={1}>
          {conv.other_party.name}
        </Text>
        <Text style={{
          fontSize: 13, marginTop: 2,
          color: hasUnread ? (isDark ? '#E5E7EB' : '#374151') : '#9CA3AF',
          fontWeight: hasUnread ? '500' : '400',
        }} numberOfLines={1}>
          {lastMsg ? lastMsg.content : 'Sin mensajes aún'}
        </Text>
      </View>

      {/* Meta */}
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {lastMsg && (
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
            {formatRelativeTime(lastMsg.created_at)}
          </Text>
        )}
        {hasUnread && (
          <View style={{
            backgroundColor: '#E8467C',
            minWidth: 20, height: 20, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 5,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await chatApi.conversations(token);
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('No se pudieron cargar las conversaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const totalUnread = conversations.reduce((s: number, c: Conversation) => s + c.unread_count, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#141414' : '#FFFFFF' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>
            Mensajes
          </Text>
          {totalUnread > 0 && (
            <View style={{ backgroundColor: '#E8467C', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{totalUnread} sin leer</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
          Conversaciones cifradas con tus médicos
        </Text>
      </View>

      {/* Skeleton */}
      {loading && (
        <View>
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} isDark={isDark} />)}
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 12, marginBottom: 20 }}>{error}</Text>
          <Pressable onPress={() => load()} style={{ backgroundColor: '#E8467C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      {!loading && !error && (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.relationship_id}
          renderItem={({ item }) => <ConversationRow conv={item} isDark={isDark} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor="#E8467C"
            />
          }
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="chatbubbles-outline" size={36} color="#E8467C" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
                Sin conversaciones
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                Cuando un médico confirme tu cita, podrás chatear con él aquí.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
