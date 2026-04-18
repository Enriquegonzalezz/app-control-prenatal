import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { scheduleApi, officeApi, Schedule, DoctorClinicInfo, DoctorOffice } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

// ── Constantes ────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 'monday',    label: 'Lun', full: 'Lunes'     },
  { value: 'tuesday',   label: 'Mar', full: 'Martes'    },
  { value: 'wednesday', label: 'Mié', full: 'Miércoles' },
  { value: 'thursday',  label: 'Jue', full: 'Jueves'    },
  { value: 'friday',    label: 'Vie', full: 'Viernes'   },
  { value: 'saturday',  label: 'Sáb', full: 'Sábado'    },
  { value: 'sunday',    label: 'Dom', full: 'Domingo'   },
];

const TIMES: string[] = [];
for (let h = 6; h <= 20; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 20) TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
];

function dayLabel(val: string) {
  return DAYS.find((d) => d.value === val)?.full ?? val;
}

function addWeeks(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function estimateSlots(start: string, end: string, duration: number): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? Math.floor(mins / duration) : 0;
}

// ── Pill selector ──────────────────────────────────────────────────────────────

function PillRow<T extends string | number>({
  options, value, onChange, isDark,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {options.map((opt) => {
        const sel = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => ({
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
              backgroundColor: sel ? '#E8467C' : (isDark ? '#2A2A2A' : '#F3F4F6'),
              borderWidth: 1.5,
              borderColor: sel ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'),
              opacity: pressed ? 0.75 : 1,
              shadowColor: sel ? '#E8467C' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: sel ? 0.3 : 0,
              shadowRadius: 4, elevation: sel ? 3 : 0,
            })}
          >
            <Text style={{
              fontSize: 13, fontWeight: sel ? '700' : '500',
              color: sel ? '#fff' : (isDark ? '#D1D5DB' : '#374151'),
            }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function DoctorScheduleScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);

  const bg        = isDark ? '#141414' : '#F0F4F8';
  const cardBg    = isDark ? '#1C1C1C' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#0F172A';
  const subColor  = isDark ? '#9CA3AF' : '#64748B';
  const border    = isDark ? '#272727' : '#F1F5F9';

  // Data
  const [clinics, setClinics] = useState<DoctorClinicInfo[]>([]);
  const [offices, setOffices] = useState<DoctorOffice[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule form
  const [showForm, setShowForm] = useState(false);
  const [selLocKind, setSelLocKind] = useState<'branch' | 'office' | null>(null);
  const [selLocId, setSelLocId]   = useState<string>('');
  const [selDay, setSelDay]       = useState('monday');
  const [selStart, setSelStart]   = useState('08:00');
  const [selEnd, setSelEnd]       = useState('12:00');
  const [selDuration, setSelDuration] = useState(30);
  const [creating, setCreating]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add-office sub-form
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeType, setNewOfficeType] = useState<'office' | 'home'>('office');
  const [newOfficeAddress, setNewOfficeAddress] = useState('');
  const [newOfficeCity, setNewOfficeCity]   = useState('');
  const [savingOffice, setSavingOffice]     = useState(false);
  const [officeError, setOfficeError]       = useState<string | null>(null);
  const [officeSaved, setOfficeSaved]       = useState(false);

  // Inline feedback
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError]           = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState<{ id: string; count: number; isError?: boolean } | null>(null);

  // Animate form
  const formAnim = useRef(new Animated.Value(0)).current;

  // Generate slots
  const [genWeeks, setGenWeeks]     = useState(4);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [clinicRes, schedRes] = await Promise.all([
        scheduleApi.clinicInfo(token),
        scheduleApi.list(token),
      ]);
      const cl = Array.isArray(clinicRes.data) ? clinicRes.data : [];
      setClinics(cl);
      setSchedules(Array.isArray(schedRes.data) ? schedRes.data : []);

      // Cargar consultorios propios por separado: si falla no bloquea lo demás
      let of: DoctorOffice[] = [];
      try {
        const officeRes = await officeApi.list(token);
        of = Array.isArray(officeRes.data) ? officeRes.data : [];
      } catch {
        // Endpoint aún no disponible o sin consultorios — no crítico
      }
      setOffices(of);

      // Auto-select primera ubicación disponible
      setSelLocKind((prev) => {
        if (prev) return prev;
        if (cl.length > 0) return 'branch';
        if (of.length > 0) return 'office';
        return null;
      });
      setSelLocId((prev) => {
        if (prev) return prev;
        if (cl.length > 0) return cl[0].branch_id ?? '';
        if (of.length > 0) return of[0].id;
        return '';
      });
    } catch {
      setLoadError('No se pudieron cargar los datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggleForm = (val: boolean) => {
    setShowForm(val);
    setFormError(null);
    setShowAddOffice(false);
    Animated.spring(formAnim, {
      toValue: val ? 1 : 0,
      tension: 80, friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleAddOffice = async () => {
    if (!token) return;
    if (!newOfficeName.trim()) {
      setOfficeError('Escribe un nombre para la ubicación.');
      return;
    }
    setOfficeError(null);
    setSavingOffice(true);
    try {
      const res = await officeApi.create(token, {
        name:    newOfficeName.trim(),
        type:    newOfficeType,
        address: newOfficeAddress.trim() || undefined,
        city:    newOfficeCity.trim() || undefined,
        country: 'Venezuela',
      });
      const created = res.data;
      setOffices((prev) => [...prev, created]);
      setSelLocKind('office');
      setSelLocId(created.id);
      setNewOfficeName('');
      setNewOfficeAddress('');
      setNewOfficeCity('');
      setOfficeSaved(true);
      setTimeout(() => { setOfficeSaved(false); setShowAddOffice(false); }, 1500);
    } catch (err: any) {
      setOfficeError(err?.message ?? 'No se pudo guardar. Revisa tu conexión.');
    } finally {
      setSavingOffice(false);
    }
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!token) return;

    if (!selLocId || !selLocKind) {
      setFormError('Selecciona o crea una ubicación de atención antes de continuar.');
      return;
    }
    if (selStart >= selEnd) {
      setFormError('La hora de inicio debe ser antes de la hora de fin.');
      return;
    }

    setCreating(true);
    try {
      await scheduleApi.create(token, {
        branch_id: selLocKind === 'branch' ? selLocId : null,
        office_id: selLocKind === 'office' ? selLocId : null,
        day_of_week:           selDay,
        start_time:            selStart,
        end_time:              selEnd,
        slot_duration_minutes: selDuration,
      });
      toggleForm(false);
      await load();
    } catch (err: any) {
      const msg = err?.message ?? 'No se pudo crear el horario. Intenta nuevamente.';
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteError(null);
    setConfirmingDelete(id);
  };

  const handleDeleteConfirm = async (id: string) => {
    if (!token) return;
    try {
      await scheduleApi.remove(token, id);
      setConfirmingDelete(null);
      await load();
    } catch {
      setDeleteError(id);
      setConfirmingDelete(null);
    }
  };

  const handleGenerate = async (schedule: Schedule) => {
    if (!token) return;
    setGenerating(schedule.id);
    const from = todayStr();
    const until = addWeeks(genWeeks);
    try {
      const res = await scheduleApi.generateSlots(token, schedule.id, from, until);
      const count = res.data?.generated ?? 0;
      setGenerateMsg({ id: schedule.id, count });
      setTimeout(() => setGenerateMsg(null), 4000);
      await load();
    } catch {
      setGenerateMsg({ id: schedule.id, count: -1, isError: true });
      setTimeout(() => setGenerateMsg(null), 4000);
    } finally {
      setGenerating(null);
    }
  };

  // Ubicaciones unificadas: clínicas + consultorios propios
  const allLocations: { kind: 'branch' | 'office'; id: string; label: string; sublabel?: string; icon: string; color: string }[] = [
    ...clinics
      .filter((c) => !!c.branch_id)
      .map((c) => ({
        kind: 'branch' as const,
        id:    c.branch_id,
        label: c.clinic_name,
        sublabel: c.branch_name || undefined,
        icon:  'business',
        color: '#3B82F6',
      })),
    ...offices.map((o) => ({
      kind:     'office' as const,
      id:       o.id,
      label:    o.name,
      sublabel: o.type === 'home' ? 'Domicilio' : (o.city || 'Consultorio propio'),
      icon:     o.type === 'home' ? 'home' : 'medical',
      color:    o.type === 'home' ? '#10B981' : '#8B5CF6',
    })),
  ];

  const slotEstimate = estimateSlots(selStart, selEnd, selDuration);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: cardBg,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
          })}
          accessibilityRole="button" accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, letterSpacing: -0.3 }}>
            Mis Horarios
          </Text>
          <Text style={{ fontSize: 12, color: subColor, marginTop: 1 }}>
            {loading ? 'Cargando...' : `${schedules.length} horario${schedules.length !== 1 ? 's' : ''} configurado${schedules.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        <Pressable
          onPress={() => toggleForm(!showForm)}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: showForm ? (isDark ? '#2A2A2A' : '#F1F5F9') : '#E8467C',
            paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
            opacity: pressed ? 0.8 : 1,
            shadowColor: showForm ? 'transparent' : '#E8467C',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          })}
          accessibilityRole="button"
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={16} color={showForm ? subColor : '#fff'} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: showForm ? subColor : '#fff' }}>
            {showForm ? 'Cancelar' : 'Agregar'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Cómo funciona (banner) ───────────────────────────── */}
        {schedules.length === 0 && !showForm && !loading && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{
              backgroundColor: isDark ? '#1A2535' : '#EFF6FF',
              borderRadius: 20, padding: 20,
              borderWidth: 1, borderColor: isDark ? '#1E3A5F' : '#BFDBFE',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="bulb" size={20} color="#3B82F6" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                  ¿Cómo configurar mi agenda?
                </Text>
              </View>
              {[
                { icon: 'calendar-outline', text: 'Crea un horario semanal (ej: Lunes de 08:00 a 12:00)' },
                { icon: 'flash-outline', text: 'Genera los slots para las próximas semanas con un tap' },
                { icon: 'people-outline', text: 'Los pacientes verán y reservarán esos horarios' },
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Ionicons name={step.icon as any} size={14} color="#3B82F6" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#93C5FD' : '#2563EB', lineHeight: 18 }}>
                    {step.text}
                  </Text>
                </View>
              ))}
              <Pressable
                onPress={() => toggleForm(true)}
                style={({ pressed }) => ({
                  marginTop: 16, backgroundColor: '#3B82F6',
                  borderRadius: 16, paddingVertical: 13,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Crear primer horario</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Formulario nuevo horario ─────────────────────────── */}
        {showForm && (
          <View style={{
            marginHorizontal: 16, marginBottom: 20,
            backgroundColor: cardBg, borderRadius: 24, overflow: 'hidden',
            shadowColor: '#E8467C', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
              backgroundColor: '#E8467C',
            }}>
              <Pressable
                onPress={() => router.back()}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button" accessibilityLabel="Volver"
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Mis Horarios</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Gestiona tus horarios de atención</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Error de carga */}
            {loadError && (
              <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCA5A5' : '#991B1B' }}>{loadError}</Text>
                <Pressable onPress={() => { setLoadError(null); load(); }} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#EF4444', borderRadius: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Reintentar</Text>
                </Pressable>
              </View>
            )}
            <View style={{ padding: 20, gap: 20 }}>

              {/* ── Selector de ubicación unificado ── */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="location" size={14} color="#E8467C" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      Lugar de atención
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowAddOffice((v) => !v)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: isDark ? '#252525' : '#F3F4F6',
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name={showAddOffice ? 'close' : 'add'} size={13} color={subColor} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: subColor }}>
                      {showAddOffice ? 'Cancelar' : 'Agregar ubicación'}
                    </Text>
                  </Pressable>
                </View>

                {/* Sub-form: agregar consultorio / domicilio */}
                {showAddOffice && (
                  <View style={{ backgroundColor: isDark ? '#252525' : '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 12, gap: 10, borderWidth: 1, borderColor: isDark ? '#333' : '#E2E8F0' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>Nueva ubicación propia</Text>

                    {/* Tipo */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {([{ value: 'office', label: 'Consultorio', icon: 'medical' }, { value: 'home', label: 'Domicilio', icon: 'home' }] as const).map((opt) => {
                        const sel = newOfficeType === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => setNewOfficeType(opt.value)}
                            style={({ pressed }) => ({
                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              paddingVertical: 10, borderRadius: 12,
                              backgroundColor: sel ? (opt.value === 'home' ? '#10B981' : '#8B5CF6') : (isDark ? '#1E1E1E' : '#F3F4F6'),
                              borderWidth: 1.5, borderColor: sel ? (opt.value === 'home' ? '#10B981' : '#8B5CF6') : (isDark ? '#333' : '#E5E7EB'),
                              opacity: pressed ? 0.75 : 1,
                            })}
                          >
                            <Ionicons name={opt.icon as any} size={14} color={sel ? '#fff' : subColor} />
                            <Text style={{ fontSize: 13, fontWeight: sel ? '700' : '500', color: sel ? '#fff' : subColor }}>{opt.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Nombre */}
                    <TextInput
                      placeholder={newOfficeType === 'home' ? 'Ej: Mi casa — La Trinidad' : 'Ej: Consultorio Dra. García'}
                      placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                      value={newOfficeName}
                      onChangeText={setNewOfficeName}
                      style={{ backgroundColor: isDark ? '#1E1E1E' : '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: textColor, borderWidth: 1, borderColor: isDark ? '#333' : '#E5E7EB' }}
                    />

                    {/* Dirección */}
                    <TextInput
                      placeholder="Dirección (opcional)"
                      placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                      value={newOfficeAddress}
                      onChangeText={setNewOfficeAddress}
                      style={{ backgroundColor: isDark ? '#1E1E1E' : '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: textColor, borderWidth: 1, borderColor: isDark ? '#333' : '#E5E7EB' }}
                    />

                    {/* Ciudad */}
                    <TextInput
                      placeholder="Ciudad (ej: Caracas)"
                      placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                      value={newOfficeCity}
                      onChangeText={setNewOfficeCity}
                      style={{ backgroundColor: isDark ? '#1E1E1E' : '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: textColor, borderWidth: 1, borderColor: isDark ? '#333' : '#E5E7EB' }}
                    />

                    {/* Error/éxito inline */}
                    {officeError && (
                      <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 6, marginTop: 2 }}>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 15 }}>{officeError}</Text>
                      </View>
                    )}
                    {officeSaved && (
                      <View style={{ backgroundColor: isDark ? '#0D2E1F' : '#F0FDF4', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 6, marginTop: 2 }}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#6EE7B7' : '#065F46', lineHeight: 15 }}>Ubicación guardada y seleccionada</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={handleAddOffice}
                      disabled={savingOffice}
                      style={({ pressed }) => ({
                        backgroundColor: savingOffice ? '#9CA3AF' : '#8B5CF6',
                        borderRadius: 12, paddingVertical: 11,
                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons name="checkmark" size={15} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        {savingOffice ? 'Guardando...' : 'Guardar ubicación'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Lista de ubicaciones */}
                {allLocations.length === 0 && !showAddOffice && (
                  <View style={{ backgroundColor: isDark ? '#2D1A0E' : '#FFFBEB', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: isDark ? '#4D2A0E' : '#FDE68A' }}>
                    <Ionicons name="information-circle" size={16} color="#F59E0B" />
                    <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 16 }}>
                      Agrega una ubicación propia (consultorio o domicilio) o pide al administrador de una clínica que te asigne.
                    </Text>
                  </View>
                )}

                {allLocations.map((loc) => {
                  const isSelected = selLocKind === loc.kind && selLocId === loc.id;
                  return (
                    <Pressable
                      key={`${loc.kind}-${loc.id}`}
                      onPress={() => { setSelLocKind(loc.kind); setSelLocId(loc.id); }}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: isSelected ? `${loc.color}15` : (isDark ? '#252525' : '#F8FAFC'),
                        borderRadius: 14, padding: 12, marginBottom: 6,
                        borderWidth: 1.5, borderColor: isSelected ? loc.color : (isDark ? '#333' : '#E5E7EB'),
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${loc.color}20`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={loc.icon as any} size={16} color={loc.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>{loc.label}</Text>
                        {loc.sublabel && <Text style={{ fontSize: 11, color: subColor, marginTop: 1 }}>{loc.sublabel}</Text>}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={loc.color} />}
                    </Pressable>
                  );
                })}
              </View>

              {/* Día */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="today" size={14} color="#E8467C" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Día de la semana
                  </Text>
                </View>
                <PillRow options={DAYS.map((d) => ({ value: d.value, label: d.label }))} value={selDay} onChange={setSelDay} isDark={isDark} />
              </View>

              {/* Horas en dos columnas */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Ionicons name="play-circle" size={14} color="#10B981" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      Inicia
                    </Text>
                  </View>
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {TIMES.slice(0, -1).map((t) => {
                      const sel = t === selStart;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setSelStart(t)}
                          style={({ pressed }) => ({
                            paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
                            marginBottom: 4,
                            backgroundColor: sel ? '#10B981' : (isDark ? '#252525' : '#F8FAFC'),
                            borderWidth: 1, borderColor: sel ? '#10B981' : (isDark ? '#333' : '#E2E8F0'),
                            opacity: pressed ? 0.75 : 1,
                          })}
                        >
                          <Text style={{ fontSize: 14, fontWeight: sel ? '700' : '500', textAlign: 'center', color: sel ? '#fff' : (isDark ? '#D1D5DB' : '#334155') }}>
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Ionicons name="stop-circle" size={14} color="#EF4444" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      Termina
                    </Text>
                  </View>
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {TIMES.slice(1).map((t) => {
                      const sel = t === selEnd;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setSelEnd(t)}
                          style={({ pressed }) => ({
                            paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
                            marginBottom: 4,
                            backgroundColor: sel ? '#EF4444' : (isDark ? '#252525' : '#F8FAFC'),
                            borderWidth: 1, borderColor: sel ? '#EF4444' : (isDark ? '#333' : '#E2E8F0'),
                            opacity: pressed ? 0.75 : 1,
                          })}
                        >
                          <Text style={{ fontSize: 14, fontWeight: sel ? '700' : '500', textAlign: 'center', color: sel ? '#fff' : (isDark ? '#D1D5DB' : '#334155') }}>
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              {/* Duración */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="timer" size={14} color="#8B5CF6" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Duración por cita
                  </Text>
                </View>
                <PillRow options={DURATIONS} value={selDuration} onChange={setSelDuration} isDark={isDark} />
              </View>

              {/* Preview resumen */}
              {selStart < selEnd && (
                <View style={{
                  backgroundColor: isDark ? '#0D2E1F' : '#F0FDF4',
                  borderRadius: 16, padding: 16,
                  borderWidth: 1, borderColor: isDark ? '#14532D' : '#BBF7D0',
                  flexDirection: 'row', gap: 12, alignItems: 'center',
                }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#6EE7B7' : '#065F46' }}>
                      {dayLabel(selDay)}  {selStart} – {selEnd}
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#6EE7B7' : '#059669', marginTop: 2 }}>
                      ~{slotEstimate} cita{slotEstimate !== 1 ? 's' : ''} de {selDuration} min por semana
                    </Text>
                  </View>
                </View>
              )}

              {/* Error inline */}
              {formError && (
                <View style={{
                  backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2',
                  borderRadius: 12, padding: 12,
                  borderWidth: 1, borderColor: isDark ? '#7F1D1D' : '#FECACA',
                  flexDirection: 'row', gap: 8,
                }}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 17 }}>
                    {formError}
                  </Text>
                </View>
              )}

              {/* Save button */}
              <Pressable
                onPress={handleCreate}
                disabled={creating}
                style={({ pressed }) => ({
                  backgroundColor: creating ? '#9CA3AF' : '#E8467C',
                  borderRadius: 18, paddingVertical: 16,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: '#E8467C',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: creating ? 0 : 0.35,
                  shadowRadius: 12, elevation: creating ? 0 : 6,
                })}
                accessibilityRole="button"
                accessibilityLabel="Guardar horario"
              >
                <Ionicons name={creating ? 'hourglass-outline' : 'checkmark-circle'} size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                  {creating ? 'Guardando...' : 'Guardar Horario'}
                </Text>
              </Pressable>

            </View>
          </View>
        )}

        {/* ── Selector de semanas para generar ────────────────── */}
        {schedules.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="flash" size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Generar slots para las próximas
              </Text>
            </View>
            <PillRow
              options={[
                { value: 2, label: '2 semanas' },
                { value: 4, label: '4 semanas' },
                { value: 6, label: '6 semanas' },
                { value: 8, label: '8 semanas' },
              ]}
              value={genWeeks}
              onChange={setGenWeeks}
              isDark={isDark}
            />
          </View>
        )}

        {/* ── Lista de horarios ────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16 }}>
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 13, color: subColor }}>Cargando horarios...</Text>
            </View>
          )}

          {!loading && schedules.map((sched) => {
            const isGen = generating === sched.id;
            const slots = estimateSlots(sched.start_time?.slice(0, 5) ?? '00:00', sched.end_time?.slice(0, 5) ?? '00:00', sched.slot_duration_minutes);
            return (
              <View
                key={sched.id}
                style={{
                  backgroundColor: cardBg, borderRadius: 20, marginBottom: 12,
                  overflow: 'hidden',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.2 : 0.06, shadowRadius: 8, elevation: 2,
                }}
              >
                {/* Colored top strip */}
                <View style={{ height: 4, backgroundColor: '#E8467C' }} />

                <View style={{ padding: 16 }}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8467C12', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: '#E8467C20' }}>
                      <Ionicons name="calendar" size={20} color="#E8467C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: textColor }}>{dayLabel(sched.day_of_week)}</Text>
                      <Text style={{ fontSize: 12, color: subColor, marginTop: 2 }}>
                        {sched.start_time?.slice(0, 5)} – {sched.end_time?.slice(0, 5)}  ·  {sched.slot_duration_minutes} min/cita
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(sched.id)}
                      hitSlop={12}
                      style={({ pressed }) => ({
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: isDark ? '#2A0A0A' : '#FEF2F2',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: pressed ? 0.6 : 1,
                      })}
                      accessibilityRole="button" accessibilityLabel="Eliminar horario"
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </Pressable>
                  </View>

                  {/* Stats row */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? '#252525' : '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                      <Ionicons name="time-outline" size={11} color={subColor} />
                      <Text style={{ fontSize: 11, color: subColor, fontWeight: '600' }}>{slots} citas posibles</Text>
                    </View>
                    {sched.branch?.name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                        <Ionicons name="business-outline" size={11} color="#3B82F6" />
                        <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600' }} numberOfLines={1}>{sched.branch.name}</Text>
                      </View>
                    )}
                    {sched.office?.name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: sched.office.type === 'home' ? (isDark ? '#0D2E1F' : '#ECFDF5') : (isDark ? '#2E1A5F' : '#F5F3FF'), paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                        <Ionicons name={sched.office.type === 'home' ? 'home-outline' : 'medical-outline'} size={11} color={sched.office.type === 'home' ? '#10B981' : '#8B5CF6'} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: sched.office.type === 'home' ? '#10B981' : '#8B5CF6' }} numberOfLines={1}>{sched.office.name}</Text>
                      </View>
                    )}
                    {!sched.branch?.name && !sched.office?.name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? '#252525' : '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                        <Ionicons name="location-outline" size={11} color={subColor} />
                        <Text style={{ fontSize: 11, color: subColor, fontWeight: '600' }}>Sin ubicación asignada</Text>
                      </View>
                    )}
                  </View>

                  {/* Mensaje de generación */}
                  {generateMsg?.id === sched.id && (
                    <View style={{
                      backgroundColor: generateMsg.isError ? (isDark ? '#2D0A0A' : '#FEF2F2') : (isDark ? '#0D2E1F' : '#F0FDF4'),
                      borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center',
                      borderWidth: 1, borderColor: generateMsg.isError ? (isDark ? '#7F1D1D' : '#FECACA') : (isDark ? '#14532D' : '#BBF7D0'),
                      marginBottom: 10,
                    }}>
                      <Ionicons name={generateMsg.isError ? 'alert-circle' : 'checkmark-circle'} size={16} color={generateMsg.isError ? '#EF4444' : '#10B981'} />
                      <Text style={{ flex: 1, fontSize: 12, color: generateMsg.isError ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#6EE7B7' : '#065F46'), lineHeight: 16 }}>
                        {generateMsg.count === -1 ? 'Error al generar slots.' : generateMsg.count === 0 ? 'Ya existen slots para ese período.' : `Se crearon ${generateMsg.count} slots disponibles.`}
                      </Text>
                    </View>
                  )}

                  {/* Confirmación de eliminación */}
                  {confirmingDelete === sched.id && (
                    <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Ionicons name="warning" size={18} color="#F59E0B" />
                      <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 16 }}>
                        ¿Eliminar horario del {dayLabel(sched.day_of_week)}? No se borrarán slots ya generados.
                      </Text>
                      <Pressable onPress={() => setConfirmingDelete(null)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: isDark ? '#374151' : '#E5E7EB', borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: subColor }}>Cancelar</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteConfirm(sched.id)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#EF4444', borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Eliminar</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Error de eliminación */}
                  {deleteError === sched.id && (
                    <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                      <Text style={{ flex: 1, fontSize: 11, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 15 }}>No se pudo eliminar. Intenta de nuevo.</Text>
                    </View>
                  )}

                  {/* Generate button */}
                  <Pressable
                    onPress={() => handleGenerate(sched)}
                    disabled={isGen}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backgroundColor: isGen ? (isDark ? '#252525' : '#F3F4F6') : '#E8467C',
                      borderRadius: 16, paddingVertical: 13,
                      opacity: pressed ? 0.8 : 1,
                      shadowColor: isGen ? 'transparent' : '#E8467C',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3, shadowRadius: 8, elevation: isGen ? 0 : 4,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`Generar slots para ${dayLabel(sched.day_of_week)}`}
                  >
                    <Ionicons
                      name={isGen ? 'hourglass-outline' : 'flash'}
                      size={16}
                      color={isGen ? subColor : '#fff'}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isGen ? subColor : '#fff' }}>
                      {isGen ? 'Generando...' : `Generar slots (${genWeeks} semanas)`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
