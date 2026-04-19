import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { directoryApi, chatApi, NearbyDoctor } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.78);

function formatDistance(meters: number | null): string | null {
  if (meters === null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatFee(fee: number | null): string {
  if (!fee) return 'Consultar';
  return `$${fee.toFixed(0)}`;
}

function SkeletonCard({ isDark }: { isDark: boolean }) {
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
    <Animated.View style={{ opacity: anim, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: bg, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <View style={{ height: 14, backgroundColor: bg, borderRadius: 7, width: '70%', marginBottom: 8 }} />
          <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '45%' }} />
        </View>
      </View>
      <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '55%', marginBottom: 10 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ height: 26, backgroundColor: bg, borderRadius: 13, width: 64 }} />
        <View style={{ height: 26, backgroundColor: bg, borderRadius: 13, width: 56 }} />
      </View>
    </Animated.View>
  );
}

// ── Doctor Profile Bottom Sheet ──────────────────────────────────────────────

function DoctorProfileSheet({
  doctor, visible, onClose, isDark,
}: {
  doctor: NearbyDoctor | null;
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const token = useAuthStore((s) => s.token);
  const userRole = useAuthStore((s) => s.user?.role);
  const [chattingNow, setChattingNow] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const sheetBg   = isDark ? '#1A1A1A' : '#FFFFFF';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const textColor  = isDark ? '#F9FAFB' : '#111827';
  const statBg     = isDark ? '#252525' : '#F9FAFB';
  const statBorder = isDark ? '#333333' : '#F3F4F6';
  const divider    = isDark ? '#2A2A2A' : '#F3F4F6';

  useEffect(() => {
    if (!visible) setChatError(null);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200, mass: 0.9 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100 || g.vy > 0.6) {
        onClose();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
      }
    },
  }), [translateY, onClose]);

  const handleOpenChat = async () => {
    if (!token || !doctor) return;
    setChatError(null);
    setChattingNow(true);
    try {
      const res = await chatApi.startConversation(token, doctor.user_id);
      const name = res.data.other_party?.name ?? doctor.full_name;
      onClose();
      router.push({ pathname: '/chat/[id]', params: { id: res.data.relationship_id, name } });
    } catch {
      setChatError('No se pudo iniciar la conversación. Intenta de nuevo.');
    } finally {
      setChattingNow(false);
    }
  };

  if (!doctor) return null;

  const initials = doctor.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const dist = formatDistance(doctor.distance_m);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Scrim */}
      <Animated.View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOpacity }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar perfil" />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: SHEET_HEIGHT,
          backgroundColor: sheetBg,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          transform: [{ translateY }],
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 24,
        }}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#3D3D3D' : '#D1D5DB' }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          bounces={false}
        >
          {/* ── Header ───────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              {/* Avatar */}
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#E8467C18', alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 2, borderColor: '#E8467C30' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#E8467C' }}>{initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, flexShrink: 1 }} numberOfLines={2}>
                    {doctor.full_name}
                  </Text>
                  {doctor.is_verified && (
                    <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="shield-checkmark" size={11} color="#2563EB" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>Verificado</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: '#E8467C', fontWeight: '600', marginBottom: 6 }}>
                  {doctor.specialty.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: doctor.is_available ? '#10B981' : '#D1D5DB' }} />
                  <Text style={{ fontSize: 12, color: doctor.is_available ? '#10B981' : '#9CA3AF', fontWeight: '500' }}>
                    {doctor.is_available ? 'Disponible' : 'No disponible'}
                  </Text>
                  {dist && (
                    <>
                      <Text style={{ fontSize: 12, color: isDark ? '#4B5563' : '#D1D5DB' }}>·</Text>
                      <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '500' }}>{dist}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Clinic info */}
            {(doctor.clinic.name && doctor.clinic.name !== 'Sin clínica') && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: isDark ? '#1F1F1F' : '#F8FAFC', borderRadius: 12, padding: 12, gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E8467C15', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="business" size={15} color="#E8467C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textColor, marginBottom: 2 }} numberOfLines={1}>
                    {doctor.clinic.name}
                  </Text>
                  {doctor.branch.address ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="location-outline" size={11} color={labelColor} />
                      <Text style={{ fontSize: 11, color: labelColor, flex: 1 }} numberOfLines={2}>{doctor.branch.address}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* ── Divider ──────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: divider, marginHorizontal: 24, marginBottom: 20 }} />

          {/* ── Bio ──────────────────────────────────────────── */}
          {doctor.bio ? (
            <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Sobre el médico</Text>
              <Text style={{ fontSize: 14, color: textColor, lineHeight: 21 }}>{doctor.bio}</Text>
            </View>
          ) : null}

          {/* ── Stats ────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1, backgroundColor: statBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: statBorder, alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="ribbon" size={17} color="#E8467C" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>{doctor.years_experience}</Text>
              <Text style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>años exp.</Text>
            </View>

            {doctor.consultation_fee !== null && (
              <View style={{ flex: 1, backgroundColor: statBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: statBorder, alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="cash" size={17} color="#10B981" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>${doctor.consultation_fee?.toFixed(0)}</Text>
                <Text style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>consulta</Text>
              </View>
            )}

            <View style={{ flex: 1, backgroundColor: statBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: statBorder, alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="star" size={17} color="#3B82F6" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>
                {doctor.is_verified ? '✓' : '—'}
              </Text>
              <Text style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>verificado</Text>
            </View>
          </View>

          {/* ── CTA Buttons ──────────────────────────────────── */}
          <View style={{ paddingHorizontal: 24, gap: 10 }}>

            {/* Primary: Agendar — premium design */}
            <Pressable
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/book-appointment',
                  params: {
                    doctorProfileId: doctor.doctor_profile_id,
                    doctorUserId: doctor.user_id,
                    doctorName: doctor.full_name,
                    specialtyName: doctor.specialty.name,
                    clinicName: doctor.clinic.name,
                    branchId: doctor.branch.id,
                    consultationFee: doctor.consultation_fee?.toString() ?? '',
                  },
                });
              }}
              disabled={!doctor.is_available}
              style={({ pressed }) => ({
                borderRadius: 22,
                overflow: 'hidden',
                opacity: pressed ? 0.88 : 1,
                shadowColor: doctor.is_available ? '#C0325A' : '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: doctor.is_available ? 0.45 : 0.12,
                shadowRadius: 18,
                elevation: doctor.is_available ? 10 : 2,
              })}
              accessibilityRole="button"
              accessibilityLabel="Agendar cita con este médico"
            >
              <View style={{
                backgroundColor: doctor.is_available ? '#E8467C' : '#9CA3AF',
                borderRadius: 22,
                paddingVertical: 18,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {/* Left icon circle */}
                <View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 14,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                }}>
                  <Ionicons name={doctor.is_available ? 'calendar' : 'close-circle'} size={20} color="#fff" />
                </View>

                {/* Text block */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 }}>
                    {doctor.is_available ? 'Agendar Cita' : 'No disponible'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                    {doctor.is_available
                      ? doctor.consultation_fee
                        ? `Consulta desde $${doctor.consultation_fee.toFixed(0)} · Elige tu horario`
                        : 'Selecciona un horario disponible'
                      : 'Este médico no tiene horarios activos'}
                  </Text>
                </View>

                {/* Right arrow */}
                {doctor.is_available && (
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                  }}>
                    <Ionicons name="arrow-forward" size={15} color="#fff" />
                  </View>
                )}
              </View>
            </Pressable>

            {/* Chat — visible para pacientes con cualquier médico verificado */}
            {userRole === 'patient' && (
              <>
                <Pressable
                  onPress={handleOpenChat}
                  disabled={chattingNow}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                    backgroundColor: isDark ? '#1A2A3A' : '#EFF6FF',
                    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 24,
                    borderWidth: 1.5, borderColor: isDark ? '#2563EB50' : '#BFDBFE',
                    opacity: pressed || chattingNow ? 0.75 : 1,
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.25 : 0.12,
                    shadowRadius: 10,
                    elevation: 3,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar mensaje al médico"
                >
                  <View style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: isDark ? '#2563EB25' : '#DBEAFE',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="chatbubble-ellipses" size={18} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                      {chattingNow ? 'Conectando...' : 'Enviar mensaje'}
                    </Text>
                    <Text style={{ fontSize: 11, color: isDark ? '#60A5FA' : '#3B82F6', marginTop: 1 }}>
                      Consulta rápida con tu médico
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
                </Pressable>
                {chatError && (
                  <View style={{ marginTop: 8, backgroundColor: isDark ? '#2D1F10' : '#FFF7ED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: isDark ? '#92400E50' : '#FED7AA' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#FCD34D' : '#92400E' }}>{chatError}</Text>
                  </View>
                )}
              </>
            )}

          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Doctor Card ───────────────────────────────────────────────────────────────

function DoctorCard({
  doctor, isDark, onPress,
}: {
  doctor: NearbyDoctor; isDark: boolean; onPress: () => void;
}) {
  const initials = doctor.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const dist = formatDistance(doctor.distance_m);
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSub     = isDark ? '#9CA3AF' : '#6B7280';
  const accentColor = doctor.is_available ? '#10B981' : '#9CA3AF';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: cardBg,
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
        opacity: pressed ? 0.88 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : 0.07,
        shadowRadius: 8,
        elevation: 3,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${doctor.full_name}`}
    >
      {/* Accent top bar */}
      <View style={{ height: 3, backgroundColor: doctor.is_available ? '#E8467C' : '#D1D5DB' }} />

      <View style={{ padding: 16 }}>
        {/* Row 1: Avatar + info + availability */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
          {/* Avatar */}
          <View style={{
            width: 54, height: 54, borderRadius: 27,
            backgroundColor: '#E8467C15', alignItems: 'center', justifyContent: 'center',
            marginRight: 14, borderWidth: 2, borderColor: '#E8467C30',
          }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#E8467C' }}>{initials}</Text>
          </View>

          {/* Name + specialty */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, flex: 1 }} numberOfLines={1}>
                {doctor.full_name}
              </Text>
              {doctor.is_verified && (
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              )}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#E8467C', marginBottom: 4 }} numberOfLines={1}>
              {doctor.specialty.name}
            </Text>
            {(doctor.clinic.name && doctor.clinic.name !== 'Sin clínica') ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="business-outline" size={11} color={textSub} />
                <Text style={{ fontSize: 11, color: textSub, flex: 1 }} numberOfLines={1}>
                  {doctor.clinic.name}{doctor.branch.name ? ` · ${doctor.branch.name}` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Availability pill */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: doctor.is_available ? (isDark ? '#0D2E1F' : '#ECFDF5') : (isDark ? '#252525' : '#F9FAFB'),
            paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
            borderWidth: 1, borderColor: doctor.is_available ? '#10B98130' : (isDark ? '#333' : '#E5E7EB'),
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentColor }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor }}>
              {doctor.is_available ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
        </View>

        {/* Row 2: Pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {dist && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
              <Ionicons name="location-outline" size={11} color="#3B82F6" style={{ marginRight: 3 }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#3B82F6' }}>{dist}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#3D1A2B' : '#FFF0F5', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
            <Ionicons name="cash-outline" size={11} color="#E8467C" style={{ marginRight: 3 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#E8467C' }}>{formatFee(doctor.consultation_fee)}</Text>
          </View>
          {doctor.years_experience > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#252525' : '#F3F4F6', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 }}>
              <Ionicons name="ribbon-outline" size={11} color={textSub} style={{ marginRight: 3 }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: textSub }}>{doctor.years_experience} años exp.</Text>
            </View>
          )}
        </View>

        {/* Row 3: CTA */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: isDark ? '#252525' : '#FFF5F8',
          borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
          borderWidth: 1, borderColor: isDark ? '#333' : '#F9C6D5',
        }}>
          <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#BE185D', fontWeight: '600' }}>
            Toca para ver su perfil y agendar
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8467C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Ver perfil</Text>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function DoctorsScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';

  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(true);
  const [hasGps, setHasGps] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [selectedDoctor, setSelectedDoctor] = useState<NearbyDoctor | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openProfile = useCallback((doctor: NearbyDoctor) => {
    setSelectedDoctor(doctor);
    setModalVisible(true);
  }, []);

  const closeProfile = useCallback(() => {
    setModalVisible(false);
  }, []);

  // 1️⃣ Cargar primera página o refrescar
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setApiError(null);
    try {
      const res = await directoryApi.listDoctors({ per_page: 20, page: 1 });
      setDoctors(res.data?.doctors ?? []);
      setCurrentPage(res.data?.pagination.current_page ?? 1);
      setLastPage(res.data?.pagination.last_page ?? 1);
      setTotal(res.data?.pagination.total ?? 0);
    } catch {
      setApiError('No se pudo conectar al servidor. Verifica tu red.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 2️⃣ Cargar siguiente página (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || currentPage >= lastPage) return;
    setLoadingMore(true);
    try {
      const res = await directoryApi.listDoctors({ per_page: 20, page: currentPage + 1 });
      setDoctors((prev) => [...prev, ...(res.data?.doctors ?? [])]);
      setCurrentPage(res.data?.pagination.current_page ?? currentPage);
      setLastPage(res.data?.pagination.last_page ?? lastPage);
    } catch {
      // Silenciar errores en loadMore para no interrumpir UX
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, lastPage, loadingMore]);

  // 3️⃣ GPS como mejora: enriquece distancias y reordena por cercanía
  const enrichWithGps = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const res = await directoryApi.nearbyDoctors({ lat: latitude, lng: longitude, radius_m: 50000, limit: 50 });
      const nearbyMap = new Map((res.data?.doctors ?? []).map((d) => [d.doctor_profile_id, d]));
      setDoctors((prev) =>
        prev.map((d) => {
          const nearby = nearbyMap.get(d.doctor_profile_id);
          return nearby ? { ...d, distance_m: nearby.distance_m } : d;
        })
      );
      setHasGps(true);
    } catch { /* GPS opcional */ }
  }, []);

  useEffect(() => {
    loadAll();
    enrichWithGps();
  }, [loadAll, enrichWithGps]);

  const filtered = doctors.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      q === '' ||
      d.full_name.toLowerCase().includes(q) ||
      d.specialty.name.toLowerCase().includes(q) ||
      d.clinic.name.toLowerCase().includes(q);
    // Por defecto solo disponibles; "Ver todos" quita el filtro
    const matchAvail = showAll || d.is_available;
    return matchSearch && matchAvail;
  });

  // Ordenar: GPS (distancia) cuando disponible, si no alfabético
  const sorted = hasGps
    ? [...filtered].sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity))
    : filtered;

  const inputBg     = isDark ? '#2A2A2A' : '#FFFFFF';
  const inputBorder = isDark ? '#3A3A3A' : '#E5E7EB';
  const inputText   = isDark ? '#F9FAFB' : '#111827';
  const placeholder = isDark ? '#6B7280' : '#9CA3AF';
  const surfaceBg   = isDark ? '#111111' : '#F5F5F5';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surfaceBg }} edges={['top']}>
      {/* Header + search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#F3F4F6' : '#111827' }}>Médicos</Text>
          {hasGps && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1C2A23' : '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Ionicons name="locate" size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>Cercanos primero</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
          {loading ? 'Cargando directorio...' : `${sorted.length} médico${sorted.length !== 1 ? 's' : ''} disponible${sorted.length !== 1 ? 's' : ''}`}
        </Text>

        {/* Search bar */}
        <View style={{ backgroundColor: inputBg, borderColor: inputBorder, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, marginBottom: 10 }}>
          <Ionicons name="search" size={16} color={placeholder} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, especialidad..."
            placeholderTextColor={placeholder}
            style={{ flex: 1, fontSize: 14, color: inputText }}
            returnKeyType="search"
            accessibilityLabel="Buscar médicos"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={placeholder} />
            </Pressable>
          )}
        </View>

        {/* Filter chip */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setShowAll(false)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: !showAll ? '#10B981' : (isDark ? '#2A2A2A' : '#F3F3F3'), borderWidth: 1, borderColor: !showAll ? '#10B981' : (isDark ? '#3A3A3A' : '#E5E7EB'), gap: 4 }}
            accessibilityRole="radio"
          >
            <Ionicons name="checkmark-circle" size={13} color={!showAll ? '#fff' : '#9CA3AF'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: !showAll ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280') }}>Disponibles</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowAll(true)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: showAll ? '#E8467C' : (isDark ? '#2A2A2A' : '#F3F3F3'), borderWidth: 1, borderColor: showAll ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'), gap: 4 }}
            accessibilityRole="radio"
          >
            <Ionicons name="people" size={13} color={showAll ? '#fff' : '#9CA3AF'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: showAll ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280') }}>Ver todos</Text>
          </Pressable>
        </View>
      </View>

      {/* API error */}
      {apiError && !loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', textAlign: 'center', marginBottom: 8 }}>Error de conexión</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>{apiError}</Text>
          <Pressable onPress={() => loadAll()} style={{ backgroundColor: '#E8467C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      {!apiError && (
        <FlatList
          data={loading ? [] : sorted}
          keyExtractor={(item) => item.doctor_profile_id}
          renderItem={({ item }) => <DoctorCard doctor={item} isDark={isDark} onPress={() => openProfile(item)} />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadAll(true).then(() => enrichWithGps()); }}
              tintColor="#E8467C"
            />
          }
          ListHeaderComponent={
            loading ? (
              <View>
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} isDark={isDark} />)}
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C', opacity: 0.6 }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C', opacity: 0.8 }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C' }} />
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Cargando más...</Text>
              </View>
            ) : currentPage >= lastPage && doctors.length > 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {total} médico{total !== 1 ? 's' : ''} en total
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
                <Ionicons name="person-outline" size={48} color="#E8467C" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', textAlign: 'center' }}>Sin resultados</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>
                  {search ? 'Prueba con otro nombre o especialidad' : 'No hay médicos registrados aún'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Doctor Profile Bottom Sheet */}
      <DoctorProfileSheet
        doctor={selectedDoctor}
        visible={modalVisible}
        onClose={closeProfile}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}
