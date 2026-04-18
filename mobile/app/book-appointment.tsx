import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { appointmentApi, Slot } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateHeader(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(new Date(iso));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function formatDateKey(iso: string): string {
  return new Date(iso).toISOString().split('T')[0];
}

function groupSlotsByDate(slots: Slot[]): { date: string; label: string; slots: Slot[] }[] {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = formatDateKey(slot.starts_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return Array.from(map.entries()).map(([date, slotList]) => ({
    date,
    label: formatDateHeader(slotList[0].starts_at),
    slots: slotList,
  }));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonSlots({ isDark }: { isDark: boolean }) {
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
    <Animated.View style={{ opacity: anim, paddingHorizontal: 20 }}>
      {[1, 2].map((g) => (
        <View key={g} style={{ marginBottom: 24 }}>
          <View style={{ height: 14, backgroundColor: bg, borderRadius: 7, width: '50%', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ height: 44, width: 88, backgroundColor: bg, borderRadius: 12 }} />
            ))}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BookAppointmentScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);

  const {
    doctorProfileId,
    doctorName,
    specialtyName,
    clinicName,
    consultationFee,
  } = useLocalSearchParams<{
    doctorProfileId: string;
    doctorUserId: string;
    doctorName: string;
    specialtyName: string;
    clinicName: string;
    branchId: string;
    consultationFee: string;
  }>();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Colours
  const bg       = isDark ? '#141414' : '#F5F5F5';
  const cardBg   = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subColor  = isDark ? '#9CA3AF' : '#6B7280';
  const border    = isDark ? '#2D2D2D' : '#F3F4F6';
  const inputBg   = isDark ? '#252525' : '#FFFFFF';

  const load = useCallback(async () => {
    if (!token || !doctorProfileId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await appointmentApi.availableSlots(token, doctorProfileId, 30);
      setSlots(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('No se pudieron cargar los horarios disponibles.');
    } finally {
      setLoading(false);
    }
  }, [token, doctorProfileId]);

  useEffect(() => { load(); }, [load]);

  const handleBook = async () => {
    if (!selectedSlot || !token) return;

    setBooking(true);
    try {
      await appointmentApi.book(token, {
        slot_id: selectedSlot.id,
        patient_notes: notes.trim() || undefined,
      });

      Alert.alert(
        '¡Cita reservada! 🎉',
        `Tu cita con ${doctorName} ha sido agendada para el ${formatDateHeader(selectedSlot.starts_at)} a las ${formatTime(selectedSlot.starts_at)}.`,
        [
          {
            text: 'Ver mis citas',
            onPress: () => router.replace('/appointments'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Error al reservar',
        err?.message ?? 'El slot ya no está disponible. Por favor elige otro horario.',
        [{ text: 'Entendido' }]
      );
      await load();
      setSelectedSlot(null);
    } finally {
      setBooking(false);
    }
  };

  const grouped = groupSlotsByDate(slots);
  const initials = (doctorName ?? 'D').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const fee = consultationFee ? `$${parseFloat(consultationFee).toFixed(0)}` : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
          accessibilityRole="button" accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: textColor }}>Agendar Cita</Text>
          <Text style={{ fontSize: 12, color: subColor }}>Elige un horario disponible</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Doctor Card ──────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8467C18', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 2, borderColor: '#E8467C30' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#E8467C' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textColor }} numberOfLines={1}>{doctorName}</Text>
              <Text style={{ fontSize: 13, color: '#E8467C', fontWeight: '600', marginTop: 1 }}>{specialtyName}</Text>
              {clinicName && clinicName !== 'Sin clínica' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="business-outline" size={11} color={subColor} />
                  <Text style={{ fontSize: 11, color: subColor }} numberOfLines={1}>{clinicName}</Text>
                </View>
              ) : null}
            </View>
            {fee ? (
              <View style={{ alignItems: 'center', backgroundColor: '#FFF0F5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#E8467C' }}>{fee}</Text>
                <Text style={{ fontSize: 10, color: '#E8467C', opacity: 0.7 }}>consulta</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Slot Picker ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: subColor, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 16 }}>
            Horarios disponibles
          </Text>
        </View>

        {loading && <SkeletonSlots isDark={isDark} />}

        {!loading && error && (
          <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 24 }}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, color: textColor, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
            <Pressable onPress={load} style={{ backgroundColor: '#E8467C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && grouped.length === 0 && (
          <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#1E1E1E' : '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="calendar-outline" size={32} color="#E8467C" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
              Sin horarios disponibles
            </Text>
            <Text style={{ fontSize: 13, color: subColor, textAlign: 'center', lineHeight: 18 }}>
              Este médico no tiene citas disponibles en los próximos 30 días. Intenta más tarde.
            </Text>
          </View>
        )}

        {!loading && !error && grouped.map(({ date, label, slots: daySlots }) => (
          <View key={date} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            {/* Date label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C' }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: textColor, textTransform: 'capitalize' }}>
                {label}
              </Text>
            </View>

            {/* Time chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {daySlots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    onPress={() => setSelectedSlot(isSelected ? null : slot)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16, paddingVertical: 11,
                      borderRadius: 14, minWidth: 80, alignItems: 'center',
                      backgroundColor: isSelected ? '#E8467C' : (isDark ? '#252525' : '#FFFFFF'),
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#E8467C' : (isDark ? '#333' : '#E5E7EB'),
                      opacity: pressed ? 0.75 : 1,
                      shadowColor: isSelected ? '#E8467C' : 'transparent',
                      shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: isSelected ? 4 : 0,
                    })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Slot ${formatTime(slot.starts_at)}`}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? '#FFFFFF' : textColor }}>
                      {formatTime(slot.starts_at)}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '500', color: isSelected ? '#FFD6E7' : subColor, marginTop: 1 }}>
                      {formatTime(slot.ends_at)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Notes ────────────────────────────────────────────── */}
        {!loading && grouped.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: subColor, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Notas para el médico (opcional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Motivo de consulta, síntomas, preguntas..."
              placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
              multiline
              numberOfLines={4}
              maxLength={500}
              style={{
                backgroundColor: inputBg,
                borderWidth: 1, borderColor: border,
                borderRadius: 16, padding: 14,
                fontSize: 14, color: textColor,
                minHeight: 100, textAlignVertical: 'top',
              }}
              accessibilityLabel="Notas para el médico"
            />
            <Text style={{ fontSize: 11, color: subColor, marginTop: 6, textAlign: 'right' }}>
              {notes.length}/500
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Sticky Confirm Button ────────────────────────────── */}
      {selectedSlot && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: bg,
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
          borderTopWidth: 1, borderTopColor: border,
        }}>
          {/* Selected slot preview */}
          <View style={{ backgroundColor: '#E8467C12', borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="time-outline" size={16} color="#E8467C" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#E8467C' }}>
                {formatDateHeader(selectedSlot.starts_at)} · {formatTime(selectedSlot.starts_at)} – {formatTime(selectedSlot.ends_at)}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedSlot(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#E8467C" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleBook}
            disabled={booking}
            style={({ pressed }) => ({
              backgroundColor: booking ? '#9CA3AF' : '#E8467C',
              borderRadius: 18, paddingVertical: 17,
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              opacity: pressed ? 0.86 : 1,
              shadowColor: '#E8467C', shadowOffset: { width: 0, height: 6 },
              shadowOpacity: booking ? 0 : 0.35, shadowRadius: 14, elevation: booking ? 0 : 8,
            })}
            accessibilityRole="button"
            accessibilityLabel="Confirmar reserva de cita"
          >
            {booking ? (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Reservando...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Confirmar Cita</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
