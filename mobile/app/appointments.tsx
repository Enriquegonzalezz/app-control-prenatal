import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { appointmentApi, chatApi, scheduleApi, Appointment, Slot } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

type FilterKey = 'active' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'active',    label: 'Activas'     },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas'  },
];

const STATUS_CONFIG = {
  pending:     { label: 'Pendiente',   color: '#F59E0B', bg: '#FFFBEB' },
  confirmed:   { label: 'Confirmada',  color: '#3B82F6', bg: '#EFF6FF' },
  in_progress: { label: 'En curso',    color: '#10B981', bg: '#ECFDF5' },
  completed:   { label: 'Completada',  color: '#6B7280', bg: '#F9FAFB' },
  cancelled:   { label: 'Cancelada',   color: '#EF4444', bg: '#FEF2F2' },
  no_show:     { label: 'No asistió',  color: '#F97316', bg: '#FFF7ED' },
} as const;

const CANCELLABLE = new Set<Appointment['status']>(['pending', 'confirmed']);
const ACTIVE_STATUSES = new Set<Appointment['status']>(['pending', 'confirmed', 'in_progress']);

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
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
    <Animated.View style={{ opacity: anim, backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, marginRight: 12 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 14, backgroundColor: bg, borderRadius: 6, width: '60%' }} />
          <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '40%' }} />
        </View>
        <View style={{ width: 70, height: 24, backgroundColor: bg, borderRadius: 12 }} />
      </View>
      <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '70%', marginBottom: 6 }} />
      <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '50%' }} />
    </Animated.View>
  );
}

// Chat disponible en todos los estados excepto cancelled
// La relación se crea al reservar la cita (book), así que pending también tiene chat.
const CHAT_ACTIVE_STATUSES = new Set<Appointment['status']>(['pending', 'confirmed', 'in_progress', 'completed', 'no_show']);
const RESCHEDULE_STATUSES  = new Set<Appointment['status']>(['confirmed', 'pending']);

function formatTimeSlot(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function formatDateHeaderLabel(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long', day: '2-digit', month: 'long',
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
    label: formatDateHeaderLabel(slotList[0].starts_at),
    slots: slotList,
  }));
}

function AppointmentCard({
  appt, isDark, onCancel, cancelling, userRole, onChat, chatting, chatError, onReschedule,
}: {
  appt: Appointment;
  isDark: boolean;
  onCancel: (id: string) => void;
  cancelling: string | null;
  userRole: 'patient' | 'doctor';
  onChat: (appt: Appointment) => void;
  chatting: string | null;
  chatError: { id: string; msg: string } | null;
  onReschedule: (appt: Appointment) => void;
}) {
  const sc = STATUS_CONFIG[appt.status];
  const canCancel = CANCELLABLE.has(appt.status);
  const isCancelling = cancelling === appt.id;
  const isChatting = chatting === appt.id;
  const thisChatError = chatError?.id === appt.id ? chatError.msg : null;

  const isPatientView = userRole === 'patient';
  const shownPerson = isPatientView ? appt.doctor : appt.patient;
  const initials = (shownPerson?.name ?? '?')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const chatAvailable = CHAT_ACTIVE_STATUSES.has(appt.status);
  const chatLabel     = isPatientView ? 'Hablar con médico' : 'Hablar con paciente';

  return (
    <View style={{
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 16, marginHorizontal: 16, marginBottom: 10,
      borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6',
      padding: 16,
    }}>
      {/* Top row: avatar + name + status badge */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: '#E8467C15', alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#E8467C' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
            {shownPerson?.name ?? (isPatientView ? 'Médico' : 'Paciente')}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
            {appt.clinic?.name ?? '—'}
          </Text>
        </View>
        <View style={{ backgroundColor: isDark ? sc.color + '25' : sc.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: sc.color }}>{sc.label}</Text>
        </View>
      </View>

      {/* Date + duration */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name="calendar-outline" size={13} color="#9CA3AF" style={{ marginRight: 5 }} />
        <Text style={{ fontSize: 12, color: isDark ? '#D1D5DB' : '#374151', fontWeight: '500' }}>
          {formatDateTime(appt.scheduled_at)}
          {appt.duration_minutes ? `  ·  ${appt.duration_minutes} min` : ''}
        </Text>
      </View>

      {/* Branch address */}
      {appt.branch?.address && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="location-outline" size={13} color="#9CA3AF" style={{ marginRight: 5 }} />
          <Text style={{ fontSize: 12, color: '#9CA3AF' }} numberOfLines={1}>{appt.branch.address}</Text>
        </View>
      )}

      {/* Fee + cancel */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {appt.consultation_fee ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="cash-outline" size={13} color="#E8467C" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#E8467C' }}>
              ${Number(appt.consultation_fee).toFixed(0)}
            </Text>
          </View>
        ) : <View />}

        {canCancel && (
          <Pressable
            onPress={() => onCancel(appt.id)}
            disabled={isCancelling}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              opacity: isCancelling ? 0.5 : 1, minHeight: 32,
            }}
            accessibilityRole="button" accessibilityLabel="Cancelar cita"
          >
            <Ionicons name="close-circle-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
              {isCancelling ? '...' : 'Cancelar'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Cancellation reason */}
      {appt.cancellation_reason && (
        <View style={{ marginTop: 8, backgroundColor: isDark ? '#2D1010' : '#FEF2F2', borderRadius: 8, padding: 8 }}>
          <Text style={{ fontSize: 11, color: '#EF4444' }}>
            Motivo: {appt.cancellation_reason}
          </Text>
        </View>
      )}

      {/* ── Botones de acción (chat + reagendar) ── */}
      <View style={{ marginTop: 10, gap: 8 }}>
        {/* Chat */}
        {chatAvailable && (
          <Pressable
            onPress={() => onChat(appt)}
            disabled={isChatting}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: isDark ? '#1A2A3A' : '#EFF6FF',
              borderRadius: 12, paddingVertical: 11,
              borderWidth: 1, borderColor: isDark ? '#2563EB50' : '#BFDBFE',
              opacity: isChatting ? 0.6 : 1,
            }}
            accessibilityRole="button" accessibilityLabel={chatLabel}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#3B82F6" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#3B82F6' }}>
              {isChatting ? 'Conectando...' : chatLabel}
            </Text>
          </Pressable>
        )}

        {/* Reagendar — solo médico, solo en citas activas */}
        {!isPatientView && RESCHEDULE_STATUSES.has(appt.status) && (
          <Pressable
            onPress={() => onReschedule(appt)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: isDark ? '#1A2D1A' : '#F0FDF4',
              borderRadius: 12, paddingVertical: 11,
              borderWidth: 1, borderColor: isDark ? '#16653050' : '#BBF7D0',
            }}
            accessibilityRole="button" accessibilityLabel="Reagendar cita"
          >
            <Ionicons name="calendar" size={15} color="#10B981" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>Reagendar</Text>
          </Pressable>
        )}
      </View>

      {/* Inline chat error */}
      {thisChatError && (
        <View style={{
          marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: isDark ? '#2D1F10' : '#FFF7ED',
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
          borderWidth: 1, borderColor: isDark ? '#92400E50' : '#FED7AA',
        }}>
          <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
          <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 16 }}>
            {thisChatError}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AppointmentsScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const userRole: 'patient' | 'doctor' = user?.role === 'doctor' ? 'doctor' : 'patient';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('active');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [chatting, setChatting] = useState<string | null>(null);
  const [chatError, setChatError] = useState<{ id: string; msg: string } | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<Slot | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await appointmentApi.list(token);
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('No se pudo cargar las citas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = (id: string) => {
    setConfirmingCancel(id);
    setCancelError(null);
  };

  const handleChat = async (appt: Appointment) => {
    if (!token) return;
    setChatError(null);

    const otherId   = userRole === 'patient' ? appt.doctor?.id   : appt.patient?.id;
    const otherName = userRole === 'patient' ? appt.doctor?.name : appt.patient?.name;
    if (!otherId) return;

    setChatting(appt.id);
    try {
      const res = await chatApi.startConversation(token, otherId);
      router.push({
        pathname: '/chat/[id]',
        params: { id: res.data.relationship_id, name: otherName ?? '' },
      });
    } catch {
      setChatError({ id: appt.id, msg: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setChatting(null);
    }
  };

  const handleReschedule = async (appt: Appointment) => {
    if (!token) return;
    setRescheduleTarget(appt);
    setRescheduleError(null);
    setSelectedRescheduleSlot(null);
    setLoadingSlots(true);
    try {
      const res = await scheduleApi.listSlots(token);
      const now = Date.now();
      const future = (res.data ?? []).filter(
        (s) => s.status === 'available' && new Date(s.starts_at).getTime() > now,
      );
      setAvailableSlots(future);
    } catch {
      setRescheduleError('No se pudo cargar los horarios disponibles.');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleRescheduleConfirm = async (newSlotId: string) => {
    if (!token || !rescheduleTarget) return;
    setRescheduling(true);
    setRescheduleError(null);
    try {
      await appointmentApi.reschedule(token, rescheduleTarget.id, newSlotId);
      setRescheduleTarget(null);
      setSelectedRescheduleSlot(null);
      await load(true);
    } catch (err: any) {
      setRescheduleError(err?.message ?? 'Error al reagendar. Intenta de nuevo.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelConfirm = async (id: string) => {
    if (!token) return;
    setCancelling(id);
    setConfirmingCancel(null);
    try {
      await appointmentApi.cancel(token, id);
      await load(true);
    } catch {
      setCancelError('No se pudo cancelar la cita. Intenta de nuevo.');
    } finally {
      setCancelling(null);
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === 'active') return ACTIVE_STATUSES.has(a.status);
    if (filter === 'completed') return a.status === 'completed' || a.status === 'no_show';
    return a.status === 'cancelled';
  });

  const bg = isDark ? '#141414' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const subColor = isDark ? '#9CA3AF' : '#64748B';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          accessibilityRole="button" accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Mis Citas</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
            {userRole === 'patient' ? 'Gestiona tus consultas' : 'Gestiona tus citas con pacientes'}
          </Text>
        </View>
        {!loading && appointments.length > 0 && (
          <View style={{ backgroundColor: '#E8467C15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E8467C' }}>{filtered.length}</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: filter === f.key ? '#E8467C' : (isDark ? '#2A2A2A' : '#FFFFFF'),
              borderWidth: 1, borderColor: filter === f.key ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'),
            }}
            accessibilityRole="radio" accessibilityState={{ selected: filter === f.key }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.key ? '#FFF' : (isDark ? '#9CA3AF' : '#6B7280') }}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Skeleton */}
      {loading && (
        <View style={{ paddingTop: 4 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} isDark={isDark} />)}
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginTop: 12, marginBottom: 8 }}>{error}</Text>
          <Pressable onPress={() => load()} style={{ backgroundColor: '#E8467C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      {!loading && !error && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <AppointmentCard
                appt={item}
                isDark={isDark}
                onCancel={handleCancel}
                cancelling={cancelling}
                userRole={userRole}
                onChat={handleChat}
                chatting={chatting}
                chatError={chatError}
                onReschedule={handleReschedule}
              />
              {/* Confirmación de cancelación inline */}
              {confirmingCancel === item.id && (
                <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Ionicons name="warning" size={18} color="#F59E0B" />
                  <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 16 }}>
                    ¿Cancelar esta cita? Esta acción no se puede deshacer.
                  </Text>
                  <Pressable onPress={() => setConfirmingCancel(null)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: isDark ? '#374151' : '#E5E7EB', borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: subColor }}>No</Text>
                  </Pressable>
                  <Pressable onPress={() => handleCancelConfirm(item.id)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#EF4444', borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Sí, cancelar</Text>
                  </Pressable>
                </View>
              )}
              {/* Error de cancelación */}
              {cancelError && confirmingCancel !== item.id && cancelling === item.id && (
                <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 6 }}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 15 }}>{cancelError}</Text>
                </View>
              )}
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#E8467C" />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="calendar-outline" size={32} color="#E8467C" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
                Sin citas {filter === 'active' ? 'activas' : filter === 'completed' ? 'completadas' : 'canceladas'}
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                {filter === 'active'
                  ? 'Cuando reserves una cita aparecerá aquí.'
                  : 'No hay citas en esta categoría todavía.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Modal Reagendar ── */}
      <Modal
        visible={rescheduleTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { setRescheduleTarget(null); setSelectedRescheduleSlot(null); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 16,
            maxHeight: '85%',
          }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#3D3D3D' : '#D1D5DB' }} />
            </View>

            {/* Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>
                Reagendar Cita
              </Text>
              <Pressable onPress={() => { setRescheduleTarget(null); setSelectedRescheduleSlot(null); }} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: '#9CA3AF', paddingHorizontal: 20, marginBottom: 16 }}>
              Selecciona el nuevo horario disponible
            </Text>

            {/* Error */}
            {rescheduleError && (
              <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 10, padding: 10, marginHorizontal: 20, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#EF4444' }}>{rescheduleError}</Text>
              </View>
            )}

            {/* Slot groups */}
            {loadingSlots ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: '#9CA3AF' }}>Cargando horarios...</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
                <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                  No tienes horarios disponibles.{'\n'}Genera nuevos slots desde tu agenda.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                {groupSlotsByDate(availableSlots).map(({ date, label, slots: daySlots }) => (
                  <View key={date} style={{ marginBottom: 24 }}>
                    {/* Date header card */}
                    <View style={{
                      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                      borderRadius: 16, padding: 14, marginBottom: 14,
                      flexDirection: 'row', alignItems: 'center',
                      borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.15 : 0.05, shadowRadius: 8, elevation: 2,
                    }}>
                      <View style={{
                        width: 48, height: 48, borderRadius: 12, backgroundColor: '#E8467C',
                        alignItems: 'center', justifyContent: 'center', marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>
                          {new Date(daySlots[0].starts_at).getDate()}
                        </Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginTop: -2 }}>
                          {new Date(daySlots[0].starts_at).toLocaleDateString('es', { month: 'short' }).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', textTransform: 'capitalize' }}>
                          {label.split(',')[0]}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                          {daySlots.length} horario{daySlots.length !== 1 ? 's' : ''} disponible{daySlots.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </View>

                    {/* Slot grid — 3 columns */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {daySlots.map((slot) => {
                        const isSelected = selectedRescheduleSlot?.id === slot.id;
                        return (
                          <Pressable
                            key={slot.id}
                            onPress={() => setSelectedRescheduleSlot(isSelected ? null : slot)}
                            disabled={rescheduling}
                            style={({ pressed }) => ({
                              width: '31%',
                              paddingVertical: 14,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSelected ? '#E8467C' : (isDark ? '#1E1E1E' : '#FFFFFF'),
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#E8467C' : (isDark ? '#2D2D2D' : '#E5E7EB'),
                              opacity: pressed || rescheduling ? 0.75 : 1,
                              shadowColor: isSelected ? '#E8467C' : '#000',
                              shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                              shadowOpacity: isSelected ? 0.4 : (isDark ? 0.2 : 0.06),
                              shadowRadius: isSelected ? 10 : 4,
                              elevation: isSelected ? 6 : 2,
                            })}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#FFFFFF' : (isDark ? '#F9FAFB' : '#111827'), letterSpacing: -0.3 }}>
                              {formatTimeSlot(slot.starts_at)}
                            </Text>
                            <View style={{
                              height: 1, width: 20,
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : (isDark ? '#2D2D2D' : '#E5E7EB'),
                              marginVertical: 4,
                            }} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? '#FFD6E7' : '#9CA3AF' }}>
                              {formatTimeSlot(slot.ends_at)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Action buttons */}
            {selectedRescheduleSlot && (
              <View style={{
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
                borderTopWidth: 1, borderTopColor: isDark ? '#2D2D2D' : '#F3F4F6',
                gap: 10,
              }}>
                <Pressable
                  onPress={() => handleRescheduleConfirm(selectedRescheduleSlot.id)}
                  disabled={rescheduling}
                  style={({ pressed }) => ({
                    backgroundColor: rescheduling ? '#9CA3AF' : '#E8467C',
                    borderRadius: 22, paddingVertical: 18,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.88 : 1,
                    shadowColor: rescheduling ? 'transparent' : '#E8467C',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: rescheduling ? 0 : 0.4,
                    shadowRadius: 20, elevation: rescheduling ? 0 : 12,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar reagendamiento"
                >
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>
                    {rescheduling ? 'Reagendando...' : 'Confirmar Reagendamiento'}
                  </Text>
                  {!rescheduling && (
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
                      {formatTimeSlot(selectedRescheduleSlot.starts_at)} – {formatTimeSlot(selectedRescheduleSlot.ends_at)}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setSelectedRescheduleSlot(null)}
                  style={({ pressed }) => ({
                    borderRadius: 22, paddingVertical: 14,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: isDark ? '#3A3A3A' : '#E5E7EB',
                    backgroundColor: isDark ? '#252525' : '#F9FAFB',
                    opacity: pressed ? 0.75 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar selección"
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Quitar selección
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
