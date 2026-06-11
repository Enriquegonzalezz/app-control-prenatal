import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { experienceApi, Experience, ExperienceBadge } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';
import { brandColors } from '@/theme/colors';

const ACCENT = brandColors.primary; // #E8467C

// Paleta rosada de marca (coherente con write-experience.tsx y el directorio).
const PINK = {
  tintLight:   '#FDF2F8',
  tintDark:    '#2A0E1A',
  borderLight: '#FBCFE8',
  borderDark:  '#E8467C40',
  textLight:   '#BE185D',
  textDark:    '#F9A8D4',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) { const w = Math.floor(days / 7); return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`; }
  if (days < 365) { const m = Math.floor(days / 30); return `Hace ${m} ${m === 1 ? 'mes' : 'meses'}`; }
  const y = Math.floor(days / 365);
  return `Hace ${y} ${y === 1 ? 'año' : 'años'}`;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

// ── Card de una experiencia ──────────────────────────────────────────────
function ExperienceCard({ exp, isDark }: { exp: Experience; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const cardBg     = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor  = isDark ? '#F9FAFB' : '#111827';
  const subColor   = isDark ? '#9CA3AF' : '#6B7280';
  const borderCol  = isDark ? '#2D2D2D' : '#F3F4F6';
  const chipBg     = isDark ? '#252525' : '#F3F4F6';

  const name = exp.patient?.name ?? 'Paciente anónimo';
  const isAnon = name === 'Paciente anónimo';
  const long = exp.body.length > 160;
  const shown = expanded || !long ? exp.body : exp.body.slice(0, 160).trimEnd() + '…';

  return (
    <Pressable
      onPress={() => long && setExpanded((v) => !v)}
      style={{
        backgroundColor: cardBg,
        borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: borderCol,
      }}
      accessibilityRole={long ? 'button' : undefined}
    >
      {/* Encabezado: avatar + nombre + fecha */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: isDark ? PINK.tintDark : PINK.tintLight,
          alignItems: 'center', justifyContent: 'center', marginRight: 10,
        }}>
          {isAnon ? (
            <Ionicons name="person-outline" size={17} color={ACCENT} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '800', color: ACCENT }}>{initials(name)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? PINK.textDark : PINK.textLight }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ fontSize: 11, color: subColor, marginTop: 1 }}>
            {formatRelative(exp.published_at ?? exp.created_at)}
          </Text>
        </View>
        {long && (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={subColor} />
        )}
      </View>

      {/* Cuerpo */}
      <Text style={{ fontSize: 14, color: textColor, lineHeight: 21 }}>
        {shown}
      </Text>

      {/* Tags */}
      {exp.tags && exp.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {exp.tags.map((tag) => (
            <View key={tag.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: chipBg, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4,
            }}>
              <Ionicons name="pricetag-outline" size={10} color={ACCENT} />
              <Text style={{ fontSize: 11, color: subColor, fontWeight: '600' }}>{tag.name}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default function DoctorExperiencesScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const user = useAuthStore((s) => s.user);

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [badges, setBadges] = useState<ExperienceBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const [expRes, badgeRes] = await Promise.all([
        experienceApi.listForDoctor(user.id, 100),
        experienceApi.badges(user.id),
      ]);
      setExperiences(expRes.data ?? []);
      setBadges(badgeRes.data ?? []);
    } catch {
      setError('No se pudieron cargar tus experiencias.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Solo médicos
  if (user && user.role !== 'doctor') {
    router.replace('/(tabs)/profile');
    return null;
  }

  const total = experiences.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#141414' : '#F5F5F5' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: isDark ? '#2D2D2D' : '#E5E7EB',
        backgroundColor: isDark ? '#141414' : '#F5F5F5',
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>
            Experiencias recibidas
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
            Lo que opinan quienes te visitaron
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ACCENT} />
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Cargando…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 12 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => { setLoading(true); load(); }}
            style={{ backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : total === 0 ? (
        /* Empty state */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: isDark ? PINK.tintDark : PINK.tintLight, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color={ACCENT} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
            Aún no tienes experiencias
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 }}>
            Cuando tus pacientes compartan cómo fue su consulta, sus experiencias aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={experiences}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              {/* Resumen */}
              <View style={{
                backgroundColor: isDark ? PINK.tintDark : PINK.tintLight,
                borderRadius: 16, padding: 18, marginBottom: badges.length > 0 ? 16 : 4,
                borderWidth: 1, borderColor: isDark ? PINK.borderDark : PINK.borderLight,
                flexDirection: 'row', alignItems: 'center', gap: 14,
              }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="heart" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? PINK.textDark : PINK.textLight }}>
                    {total}
                  </Text>
                  <Text style={{ fontSize: 13, color: isDark ? PINK.textDark : PINK.textLight, opacity: 0.85 }}>
                    {total === 1 ? 'experiencia compartida' : 'experiencias compartidas'}
                  </Text>
                </View>
              </View>

              {/* Badges: lo que más destacan */}
              {badges.length > 0 && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                    Lo que más destacan
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {badges.map((badge) => (
                      <View key={badge.id} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
                        borderWidth: 1, borderColor: isDark ? PINK.borderDark : PINK.borderLight,
                      }}>
                        <Ionicons name="pricetag" size={11} color={ACCENT} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? PINK.textDark : PINK.textLight }}>
                          {badge.name}
                        </Text>
                        <View style={{ backgroundColor: ACCENT, borderRadius: 9, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{badge.count}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => <ExperienceCard exp={item} isDark={isDark} />}
        />
      )}
    </SafeAreaView>
  );
}
