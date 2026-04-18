import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { appointmentApi, Appointment } from '@/lib/api';
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

function AppointmentCard({
  appt, isDark, onCancel, cancelling, userRole,
}: {
  appt: Appointment; isDark: boolean; onCancel: (id: string) => void; cancelling: string | null; userRole: 'patient' | 'doctor';
}) {
  const sc = STATUS_CONFIG[appt.status];
  const canCancel = CANCELLABLE.has(appt.status);
  const isCancelling = cancelling === appt.id;

  // Determinar quién mostrar y quién es el "otro"
  const isPatientView = userRole === 'patient';
  const shownPerson = isPatientView ? appt.doctor : appt.patient;
  const initials = (shownPerson?.name ?? '?')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={{
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 16, marginHorizontal: 16, marginBottom: 10,
      borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6',
      padding: 16,
    }}>
      {/* Top row: avatar + doctor + status badge */}
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
            accessibilityRole="button"
            accessibilityLabel="Cancelar cita"
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
    </SafeAreaView>
  );
}
