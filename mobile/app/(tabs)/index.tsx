import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';
import { appointmentApi, Appointment } from '@/lib/api';

// ─── helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso: string) {
  return iso.slice(0, 10) === todayISO();
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const STATUS_CFG = {
  pending:     { label: 'Pendiente',  color: '#F59E0B', bg: '#FFFBEB' },
  confirmed:   { label: 'Confirmada', color: '#3B82F6', bg: '#EFF6FF' },
  in_progress: { label: 'En curso',   color: '#10B981', bg: '#ECFDF5' },
  completed:   { label: 'Completada', color: '#6B7280', bg: '#F9FAFB' },
  cancelled:   { label: 'Cancelada',  color: '#EF4444', bg: '#FEF2F2' },
  no_show:     { label: 'No asistió', color: '#F97316', bg: '#FFF7ED' },
} as const;

// ─── Doctor agenda card (clinical left-border design) ─────────────────────

function AgendaCard({
  appt, isDark, onAction,
}: {
  appt: Appointment; isDark: boolean; onAction: (action: 'confirm' | 'complete' | 'no_show' | 'cancel', id: string) => void;
}) {
  const sc = STATUS_CFG[appt.status];
  const patientName = appt.patient?.name ?? 'Paciente';
  const initials = patientName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const cardBg = isDark ? '#1C1C1C' : '#FFFFFF';

  return (
    <View style={{
      backgroundColor: cardBg,
      marginHorizontal: 16, marginBottom: 8,
      borderRadius: 12,
      overflow: 'hidden',
      flexDirection: 'row',
      shadowColor: '#000', shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }}>
      {/* Status left bar */}
      <View style={{ width: 4, backgroundColor: sc.color }} />

      <View style={{ flex: 1, padding: 14 }}>
        {/* Top row: avatar + name + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: sc.color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: sc.color }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827' }} numberOfLines={1}>{patientName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
              <Ionicons name="time-outline" size={11} color="#9CA3AF" />
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 3 }}>
                {fmt(appt.scheduled_at)}{appt.duration_minutes ? `  ·  ${appt.duration_minutes} min` : ''}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sc.color + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.color, marginRight: 4 }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: sc.color }}>{sc.label.toUpperCase()}</Text>
          </View>
        </View>

        {appt.patient_notes ? (
          <View style={{ backgroundColor: isDark ? '#252525' : '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: '#CBD5E1' }}>
            <Text style={{ fontSize: 11, color: isDark ? '#CBD5E1' : '#64748B', lineHeight: 16 }} numberOfLines={2}>"{appt.patient_notes}"</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {appt.status === 'pending' && (
            <>
              <Pressable onPress={() => onAction('confirm', appt.id)}
                style={{ flex: 1, backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                accessibilityRole="button" accessibilityLabel="Confirmar cita">
                <Ionicons name="checkmark" size={13} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Confirmar</Text>
              </Pressable>
              <Pressable onPress={() => onAction('cancel', appt.id)}
                style={{ paddingHorizontal: 14, backgroundColor: isDark ? '#2A2A2A' : '#FEF2F2', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                accessibilityRole="button" accessibilityLabel="Cancelar cita">
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
            </>
          )}
          {(appt.status === 'confirmed' || appt.status === 'in_progress') && (
            <>
              <Pressable onPress={() => onAction('complete', appt.id)}
                style={{ flex: 1, backgroundColor: '#059669', borderRadius: 8, paddingVertical: 9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                accessibilityRole="button" accessibilityLabel="Completar cita">
                <Ionicons name="checkmark-done" size={13} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Completar</Text>
              </Pressable>
              <Pressable onPress={() => onAction('no_show', appt.id)}
                style={{ paddingHorizontal: 14, backgroundColor: isDark ? '#2A2A2A' : '#FFF7ED', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                accessibilityRole="button" accessibilityLabel="Marcar no asistió">
                <Text style={{ color: '#F97316', fontSize: 12, fontWeight: '700' }}>No asistió</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Doctor Dashboard ─────────────────────────────────────────────────────

function DoctorDashboard({ isDark }: { isDark: boolean }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await appointmentApi.list(token);
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const todayAppts   = appointments.filter((a) => isToday(a.scheduled_at));
  const activToday   = todayAppts.filter((a) => !['completed', 'cancelled', 'no_show'].includes(a.status));
  const pendingCount  = todayAppts.filter((a) => a.status === 'pending').length;
  const confirmedCount= todayAppts.filter((a) => a.status === 'confirmed' || a.status === 'in_progress').length;
  const completedCount= todayAppts.filter((a) => a.status === 'completed').length;
  const totalAll      = appointments.length;

  const handleAction = (action: 'confirm' | 'complete' | 'no_show' | 'cancel', id: string) => {
    const labels = { confirm: 'Confirmar cita', complete: 'Marcar como completada', no_show: 'Marcar como no asistió', cancel: 'Cancelar cita' };
    Alert.alert(labels[action], '¿Confirmar esta acción?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        style: action === 'cancel' || action === 'no_show' ? 'destructive' : 'default',
        onPress: async () => {
          if (!token) return;
          try {
            if (action === 'confirm') await appointmentApi.confirm(token, id);
            else if (action === 'complete') await appointmentApi.complete(token, id);
            else if (action === 'no_show') await appointmentApi.noShow(token, id);
            else await appointmentApi.cancel(token, id);
            await load(true);
          } catch {
            Alert.alert('Error', 'No se pudo realizar la acción.');
          }
        },
      },
    ]);
  };

  const isVerified = (user as any)?.doctor_profile?.is_verified ?? true;
  const doctorTitle = (user as any)?.doctor_profile?.gender === 'F' ? 'Dra.' : 'Dr.';
  const fullName = user?.name ?? 'Doctor';

  const STATS = [
    { value: pendingCount,   label: 'Pendientes', color: '#F59E0B' },
    { value: confirmedCount, label: 'Confirmadas', color: '#3B82F6' },
    { value: completedCount, label: 'Completadas', color: '#10B981' },
    { value: totalAll,       label: 'Total citas',  color: '#8B5CF6' },
  ];

  const surfaceBg     = isDark ? '#111111' : '#F0F4F8';
  const textPrimary   = isDark ? '#F3F4F6' : '#0F172A';
  const textSecondary = '#64748B';

  return (
    <FlatList
      data={activToday}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#E8467C" />
      }
      ListHeaderComponent={
        <View style={{ backgroundColor: surfaceBg }}>

          {/* ── Clinical header ── */}
          <View style={{ backgroundColor: isDark ? '#0D0D0D' : '#0F172A', paddingTop: 24, paddingBottom: 28, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{greet()}</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 4, letterSpacing: -0.3 }}>
                  {doctorTitle} {fullName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                  {isVerified ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#05966920', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: '#05966940' }}>
                      <Ionicons name="shield-checkmark" size={11} color="#34D399" />
                      <Text style={{ fontSize: 10, color: '#34D399', fontWeight: '700', marginLeft: 4 }}>VERIFICADO</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B20', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: '#F59E0B40' }}>
                      <Ionicons name="alert-circle" size={11} color="#F59E0B" />
                      <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '700', marginLeft: 4 }}>PENDIENTE VERIFICACIÓN</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {new Date().toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/appointments')}
                style={{ backgroundColor: '#E8467C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}
                accessibilityRole="button" accessibilityLabel="Ver agenda completa"
              >
                <Ionicons name="calendar" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 3 }}>Agenda</Text>
              </Pressable>
            </View>

            {/* Stats strip */}
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 0 }}>
              {STATS.map((s, i) => (
                <View key={s.label} style={{
                  flex: 1, alignItems: 'center', paddingVertical: 12,
                  borderRightWidth: i < STATS.length - 1 ? 1 : 0,
                  borderRightColor: 'rgba(255,255,255,0.1)',
                }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: loading ? '#444' : s.color }}>{loading ? '–' : s.value}</Text>
                  <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Quick action pills ── */}
          <View style={{ backgroundColor: isDark ? '#161616' : '#1E293B', paddingVertical: 14, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: 'Mensajes',   icon: 'chatbubbles'  as const, onPress: () => router.push('/(tabs)/messages'),    color: '#E8467C' },
                { label: 'Directorio', icon: 'people'       as const, onPress: () => router.push('/(tabs)/doctors'),     color: '#3B82F6' },
                { label: 'Citas hoy',  icon: 'list'         as const, onPress: () => router.push('/appointments'),       color: '#10B981' },
                { label: 'Horarios',   icon: 'time'         as const, onPress: () => router.push('/doctor-schedule'),    color: '#8B5CF6' },
              ].map((btn) => (
                <Pressable
                  key={btn.label}
                  onPress={btn.onPress}
                  style={{ flex: 1, backgroundColor: btn.color + '20', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: btn.color + '35' }}
                  accessibilityRole="button" accessibilityLabel={btn.label}
                >
                  <Ionicons name={btn.icon} size={16} color={btn.color} />
                  <Text style={{ color: btn.color, fontSize: 10, fontWeight: '700', marginTop: 4 }}>{btn.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Unverified warning ── */}
          {!isVerified && (
            <View style={{ margin: 16, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FDE68A' }}>
              <Ionicons name="alert-circle" size={20} color="#D97706" style={{ marginRight: 10, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>Cuenta pendiente de verificación</Text>
                <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2, lineHeight: 16 }}>
                  Completa la verificación OTP para activar la gestión de horarios y agenda.
                </Text>
              </View>
            </View>
          )}

          {/* ── Section header ── */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>Agenda de hoy</Text>
              <Text style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
                {activToday.length} cita{activToday.length !== 1 ? 's' : ''} activa{activToday.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
              <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', gap: 8 }}>
              {[1, 2, 3].map((k) => (
                <View key={k} style={{ marginHorizontal: 16, height: 88, borderRadius: 12, backgroundColor: isDark ? '#1C1C1C' : '#E2E8F0', width: '92%' }} />
              ))}
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ backgroundColor: surfaceBg }}>
          <AgendaCard appt={item} isDark={isDark} onAction={handleAction} />
        </View>
      )}
      ListFooterComponent={<View style={{ backgroundColor: surfaceBg, height: 120 }} />}
      ListEmptyComponent={
        !loading ? (
          <View style={{ backgroundColor: surfaceBg, alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, paddingBottom: 40 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? '#1C2A23' : '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark-done-circle" size={28} color="#22C55E" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, textAlign: 'center' }}>
              Sin citas pendientes hoy
            </Text>
            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
              Cuando tengas citas activas aparecerán aquí.
            </Text>
          </View>
        ) : null
      }
    />
  );
}

// ─── Patient Home ─────────────────────────────────────────────────────────

function PatientHome({ isDark }: { isDark: boolean }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const bg = isDark ? '#141414' : '#F5F5F5';

  const firstName = user?.name?.split(' ')[0] ?? 'Paciente';

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginRight: 8 }}>
            Hola, {firstName}
          </Text>
            <Ionicons name="heart" size={22} color="#E8467C" />
          </View>
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Tu salud prenatal en control</Text>
        </View>

        {/* Hero card */}
        <View style={{ marginHorizontal: 16, marginBottom: 20, backgroundColor: '#E8467C', borderRadius: 20, padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>BIENESTAR PRENATAL</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24 }}>
              Encuentra al especialista ideal para ti
            </Text>
          </View>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
            <Ionicons name="heart-half" size={28} color="#fff" />
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/doctors')}
          style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityRole="button" accessibilityLabel="Buscar médicos"
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Buscar médico</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        </View>

        {/* Quick actions grid */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 12 }}>Accesos rápidos</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { icon: 'search' as const,        label: 'Buscar Médico',  sub: 'Especialistas cerca',    action: () => router.push('/(tabs)/doctors'),     color: '#E8467C' },
            { icon: 'calendar' as const,       label: 'Mis Citas',      sub: 'Ver y gestionar',        action: () => router.push('/appointments'),         color: '#3B82F6' },
            { icon: 'chatbubbles' as const,    label: 'Mensajes',       sub: 'Chat con médicos',       action: () => router.push('/(tabs)/messages'),      color: '#10B981' },
            { icon: 'documents' as const,      label: 'Historial',      sub: 'Consultas y archivos',   action: () => router.push('/medical-history'),      color: '#F59E0B' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={item.action}
              style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, width: '47.5%', borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6' }}
              accessibilityRole="button" accessibilityLabel={item.label}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>{item.label}</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 12 }}>Tips de salud</Text>
        {[
          { icon: 'water' as const,     color: '#3B82F6', title: 'Hidratación',           body: 'Bebe al menos 8 vasos de agua al día.' },
          { icon: 'nutrition' as const, color: '#10B981', title: 'Alimentación balanceada', body: 'Incluye frutas, verduras y proteínas en cada comida.' },
          { icon: 'walk' as const,      color: '#F59E0B', title: 'Actividad suave',         body: 'Caminar 20 min al día mejora tu circulación.' },
        ].map((tip) => (
          <View key={tip.title} style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6' }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tip.color + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name={tip.icon} size={18} color={tip.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>{tip.title}</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, lineHeight: 17 }}>{tip.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar - Quick Access */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: bg,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        borderTopWidth: 1,
        borderTopColor: isDark ? '#2D2D2D' : '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 12,
        elevation: 8,
      }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.push('/appointments')}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1.5,
              borderColor: '#3B82F6',
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            })}
            accessibilityRole="button"
            accessibilityLabel="Ver mis citas"
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#3B82F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="calendar" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>
                Mis Citas
              </Text>
              <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600' }}>
                Ver y gestionar
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/medical-history')}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1.5,
              borderColor: '#F59E0B',
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            })}
            accessibilityRole="button"
            accessibilityLabel="Ver historial médico"
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="documents" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>
                Historial
              </Text>
              <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>
                Consultas previas
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#F59E0B" />
          </Pressable>
        </View>
      </View>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const role = useAuthStore((s) => s.user?.role);
  const bg = isDark ? '#141414' : '#F5F5F5';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      {role === 'doctor' ? <DoctorDashboard isDark={isDark} /> : <PatientHome isDark={isDark} />}
    </SafeAreaView>
  );
}
