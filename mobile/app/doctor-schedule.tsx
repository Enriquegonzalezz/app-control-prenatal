import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { scheduleApi, clinicCatalogApi, clinicDiscoveryApi, Schedule, CatalogClinic, Slot, DiscoverableClinic } from '@/lib/api';
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

function startOfWeekPlusN(n: number): string {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay(); // shift to Monday
  d.setDate(d.getDate() + diff + n * 7);
  return d.toISOString().slice(0, 10);
}

function addWeeksTo(from: string, n: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function groupSlotsByDate(slots: Slot[]): [string, Slot[]][] {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = s.starts_at.slice(0, 10);
    const arr = map.get(k) ?? [];
    arr.push(s);
    map.set(k, arr);
  }
  return Array.from(map.entries());
}

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
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
  const [catalog, setCatalog] = useState<CatalogClinic[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule form
  const [showForm, setShowForm] = useState(false);
  const [selClinicId, setSelClinicId] = useState<string>('');
  const [selBranchId, setSelBranchId] = useState<string>('');
  const [clinicPickerOpen, setClinicPickerOpen] = useState(false);
  const [clinicSearch, setClinicSearch] = useState('');
  const [selDay, setSelDay]       = useState('monday');
  const [selStart, setSelStart]   = useState('08:00');
  const [selEnd, setSelEnd]       = useState('12:00');
  const [selDuration, setSelDuration] = useState(30);
  const [selAutoExtend, setSelAutoExtend] = useState(true);
  const [creating, setCreating]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline feedback
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError]           = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState<{ id: string; count: number; isError?: boolean } | null>(null);

  // Animate form
  const formAnim = useRef(new Animated.Value(0)).current;

  // Tab principal
  const [activeTab, setActiveTab] = useState<'schedules' | 'agenda' | 'discover'>('schedules');

  // Generate slots
  const [genFromOffset, setGenFromOffset] = useState(0);
  const [genWeeks, setGenWeeks]           = useState(4);
  const [generating, setGenerating]       = useState<string | null>(null);

  // Agenda
  const [agendaSlots, setAgendaSlots]               = useState<Slot[]>([]);
  const [agendaLoading, setAgendaLoading]           = useState(false);
  const [agendaError, setAgendaError]               = useState<string | null>(null);
  const [agendaWeeks, setAgendaWeeks]               = useState(2);
  const [agendaStatusFilter, setAgendaStatusFilter] = useState<string | null>(null);

  // Discover clinics
  const [discoverSearch, setDiscoverSearch]       = useState('');
  const [discoverResults, setDiscoverResults]     = useState<DiscoverableClinic[]>([]);
  const [discoverLoading, setDiscoverLoading]     = useState(false);
  const [discoverError, setDiscoverError]         = useState<string | null>(null);
  const discoverDebounce                          = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [catalogRes, schedRes] = await Promise.all([
        clinicCatalogApi.list(token),
        scheduleApi.list(token),
      ]);
      // Solo clínicas que tengan al menos una sede activa son seleccionables.
      const cl = Array.isArray(catalogRes.data)
        ? catalogRes.data.filter((c) => c.branches.length > 0)
        : [];
      setCatalog(cl);
      setSchedules(Array.isArray(schedRes.data) ? schedRes.data : []);
    } catch {
      setLoadError('No se pudieron cargar los datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const loadAgenda = useCallback(async () => {
    if (!token) return;
    setAgendaLoading(true);
    setAgendaError(null);
    try {
      const from  = startOfWeekPlusN(0);
      const until = addWeeksTo(from, agendaWeeks);
      const res = await scheduleApi.listSlots(token, {
        from,
        until,
        status: agendaStatusFilter ?? undefined,
      });
      setAgendaSlots(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAgendaError('No se pudieron cargar los slots. Verifica tu conexión.');
    } finally {
      setAgendaLoading(false);
    }
  }, [token, agendaWeeks, agendaStatusFilter]);

  useEffect(() => {
    if (activeTab === 'agenda') {
      loadAgenda();
    }
  }, [activeTab, loadAgenda]);

  const loadDiscover = useCallback(async (q: string) => {
    if (!token) return;
    setDiscoverLoading(true);
    setDiscoverError(null);
    try {
      const res = await clinicDiscoveryApi.search(token, { search: q || undefined, per_page: 20 });
      setDiscoverResults(res.data?.data ?? []);
    } catch {
      setDiscoverError('No se pudieron cargar las clínicas.');
    } finally {
      setDiscoverLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'discover') return;
    if (discoverDebounce.current) clearTimeout(discoverDebounce.current);
    discoverDebounce.current = setTimeout(() => {
      loadDiscover(discoverSearch);
    }, 400);
    return () => {
      if (discoverDebounce.current) clearTimeout(discoverDebounce.current);
    };
  }, [activeTab, discoverSearch, loadDiscover]);

  const toggleForm = (val: boolean) => {
    setShowForm(val);
    setFormError(null);
    setClinicPickerOpen(false);
    Animated.spring(formAnim, {
      toValue: val ? 1 : 0,
      tension: 80, friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!token) return;

    if (!selBranchId) {
      setFormError('Selecciona la clínica y la sede donde atenderás antes de continuar.');
      return;
    }
    if (selStart >= selEnd) {
      setFormError('La hora de inicio debe ser antes de la hora de fin.');
      return;
    }

    setCreating(true);
    try {
      const created = await scheduleApi.create(token, {
        branch_id:             selBranchId,
        day_of_week:           selDay,
        start_time:            selStart,
        end_time:              selEnd,
        slot_duration_minutes: selDuration,
        auto_extend:           selAutoExtend,
      });
      // Generación inmediata: si es indefinido, llena ~12 semanas ahora (el job
      // nocturno lo mantendrá rodando); si no, genera las próximas 4 semanas.
      try {
        const from  = startOfWeekPlusN(0);
        const weeks = selAutoExtend ? 12 : 4;
        await scheduleApi.generateSlots(token, created.data.id, from, addWeeksTo(from, weeks));
      } catch {
        // No bloqueante: el médico puede generar manualmente desde la lista.
      }
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
    const from  = startOfWeekPlusN(genFromOffset);
    const until = addWeeksTo(from, genWeeks);
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

  // Clínica y sede seleccionadas, derivadas del catálogo de clínicas verificadas.
  const selectedClinic = catalog.find((c) => c.id === selClinicId) ?? null;
  const filteredCatalog = clinicSearch.trim()
    ? catalog.filter((c) => c.name.toLowerCase().includes(clinicSearch.trim().toLowerCase()))
    : catalog;

  const pickClinic = (clinic: CatalogClinic) => {
    setSelClinicId(clinic.id);
    // Auto-selecciona la sede si solo hay una; si hay varias, deja que elija.
    setSelBranchId(clinic.branches.length === 1 ? clinic.branches[0].id : '');
    setClinicPickerOpen(false);
    setClinicSearch('');
  };

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

      {/* ── Tab switcher ────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, marginTop: 4,
        backgroundColor: isDark ? '#1C1C1C' : '#F3F4F6',
        borderRadius: 14, padding: 3,
      }}>
        {([
          { key: 'schedules', label: 'Horarios' },
          { key: 'agenda',    label: 'Agenda'   },
          { key: 'discover',  label: 'Explorar' },
        ] as const).map(({ key, label }) => {
          const sel = activeTab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center',
                backgroundColor: sel ? (isDark ? '#2A2A2A' : '#fff') : 'transparent',
                shadowColor: sel ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: sel ? 0.08 : 0,
                shadowRadius: 4, elevation: sel ? 2 : 0,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? '#E8467C' : subColor }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Cómo funciona (banner) ───────────────────────────── */}
        {activeTab === 'schedules' && schedules.length === 0 && !showForm && !loading && (
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
        {activeTab === 'schedules' && showForm && (
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

              {/* ── Selector de clínica verificada + sede ── */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="business" size={14} color="#E8467C" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Clínica de atención
                  </Text>
                </View>

                {catalog.length === 0 ? (
                  <View style={{ backgroundColor: isDark ? '#2D1A0E' : '#FFFBEB', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: isDark ? '#4D2A0E' : '#FDE68A' }}>
                    <Ionicons name="information-circle" size={16} color="#F59E0B" />
                    <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 16 }}>
                      No hay clínicas disponibles por ahora. Intenta nuevamente más tarde.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Botón que abre el dropdown de clínicas */}
                    <Pressable
                      onPress={() => setClinicPickerOpen((v) => !v)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: isDark ? '#252525' : '#F8FAFC',
                        borderRadius: 14, padding: 14,
                        borderWidth: 1.5, borderColor: selectedClinic ? '#E8467C' : (isDark ? '#333' : '#E5E7EB'),
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="business" size={16} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: selectedClinic ? textColor : subColor }} numberOfLines={1}>
                          {selectedClinic ? selectedClinic.name : 'Selecciona una clínica'}
                        </Text>
                        <Text style={{ fontSize: 11, color: subColor, marginTop: 1 }}>
                          {catalog.length} clínica{catalog.length !== 1 ? 's' : ''} verificada{catalog.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Ionicons name={clinicPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={subColor} />
                    </Pressable>

                    {/* Dropdown con buscador */}
                    {clinicPickerOpen && (
                      <View style={{ marginTop: 8, backgroundColor: isDark ? '#1E1E1E' : '#fff', borderRadius: 14, borderWidth: 1, borderColor: isDark ? '#333' : '#E5E7EB', overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#F1F5F9' }}>
                          <Ionicons name="search" size={15} color={subColor} />
                          <TextInput
                            placeholder="Buscar clínica..."
                            placeholderTextColor={subColor}
                            value={clinicSearch}
                            onChangeText={setClinicSearch}
                            style={{ flex: 1, fontSize: 13, color: textColor }}
                          />
                        </View>
                        <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {filteredCatalog.map((clinic) => {
                            const isSel = clinic.id === selClinicId;
                            return (
                              <Pressable
                                key={clinic.id}
                                onPress={() => pickClinic(clinic)}
                                style={({ pressed }) => ({
                                  flexDirection: 'row', alignItems: 'center', gap: 10,
                                  paddingHorizontal: 12, paddingVertical: 11,
                                  backgroundColor: isSel ? '#E8467C12' : (pressed ? (isDark ? '#252525' : '#F8FAFC') : 'transparent'),
                                })}
                              >
                                <Ionicons name="business-outline" size={15} color={isSel ? '#E8467C' : subColor} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '500', color: textColor }} numberOfLines={1}>{clinic.name}</Text>
                                  <Text style={{ fontSize: 10, color: subColor, marginTop: 1 }}>
                                    {clinic.branches.length} sede{clinic.branches.length !== 1 ? 's' : ''}
                                  </Text>
                                </View>
                                {isSel && <Ionicons name="checkmark-circle" size={18} color="#E8467C" />}
                              </Pressable>
                            );
                          })}
                          {filteredCatalog.length === 0 && (
                            <Text style={{ fontSize: 12, color: subColor, textAlign: 'center', paddingVertical: 20 }}>Sin resultados</Text>
                          )}
                        </ScrollView>
                      </View>
                    )}

                    {/* Selector de sede de la clínica elegida */}
                    {selectedClinic && selectedClinic.branches.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: subColor, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                          Sede
                        </Text>
                        {selectedClinic.branches.map((b) => {
                          const isSel = b.id === selBranchId;
                          return (
                            <Pressable
                              key={b.id}
                              onPress={() => setSelBranchId(b.id)}
                              style={({ pressed }) => ({
                                flexDirection: 'row', alignItems: 'center', gap: 10,
                                backgroundColor: isSel ? '#10B98115' : (isDark ? '#252525' : '#F8FAFC'),
                                borderRadius: 12, padding: 12, marginBottom: 6,
                                borderWidth: 1.5, borderColor: isSel ? '#10B981' : (isDark ? '#333' : '#E5E7EB'),
                                opacity: pressed ? 0.8 : 1,
                              })}
                            >
                              <Ionicons name="location" size={15} color={isSel ? '#10B981' : subColor} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }} numberOfLines={1}>{b.name}</Text>
                                {b.address && <Text style={{ fontSize: 11, color: subColor, marginTop: 1 }} numberOfLines={1}>{b.address}</Text>}
                              </View>
                              {isSel && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
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

              {/* Agenda indefinida (auto-extensión) */}
              <Pressable
                onPress={() => setSelAutoExtend((v) => !v)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: selAutoExtend ? '#E8467C12' : (isDark ? '#252525' : '#F8FAFC'),
                  borderRadius: 14, padding: 14,
                  borderWidth: 1.5, borderColor: selAutoExtend ? '#E8467C' : (isDark ? '#333' : '#E5E7EB'),
                  opacity: pressed ? 0.85 : 1,
                })}
                accessibilityRole="switch"
                accessibilityState={{ checked: selAutoExtend }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8467C20', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="infinite" size={18} color="#E8467C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>Agenda indefinida</Text>
                  <Text style={{ fontSize: 11, color: subColor, marginTop: 1, lineHeight: 15 }}>
                    Mantiene tus cupos generados automáticamente cada semana, sin tener que regenerarlos.
                  </Text>
                </View>
                <View style={{
                  width: 44, height: 26, borderRadius: 13, padding: 3,
                  backgroundColor: selAutoExtend ? '#E8467C' : (isDark ? '#3A3A3A' : '#D1D5DB'),
                  alignItems: selAutoExtend ? 'flex-end' : 'flex-start', justifyContent: 'center',
                }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
                </View>
              </Pressable>

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
        {activeTab === 'schedules' && schedules.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="flash" size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Iniciar desde
              </Text>
            </View>
            <PillRow
              options={[
                { value: 0, label: 'Esta semana' },
                { value: 1, label: 'Próx. semana' },
                { value: 2, label: 'En 2 semanas' },
                { value: 3, label: 'En 3 semanas' },
              ]}
              value={genFromOffset}
              onChange={setGenFromOffset}
              isDark={isDark}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 14 }}>
              <Ionicons name="calendar-outline" size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Generar para
              </Text>
            </View>
            <PillRow
              options={[
                { value: 4,  label: '4 semanas' },
                { value: 8,  label: '8 semanas' },
                { value: 12, label: '3 meses' },
                { value: 24, label: '6 meses' },
                { value: 52, label: '1 año' },
              ]}
              value={genWeeks}
              onChange={setGenWeeks}
              isDark={isDark}
            />
            <Text style={{ fontSize: 11, color: subColor, marginTop: 8, lineHeight: 15 }}>
              Para una agenda sin fin, activa “Agenda indefinida” al crear el horario: los cupos se
              extienden solos cada semana.
            </Text>
          </View>
        )}

        {/* ── Lista de horarios ────────────────────────────────── */}
        {activeTab === 'schedules' && <View style={{ paddingHorizontal: 16 }}>
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
        </View>}

        {/* ── Tab Explorar Clínicas ───────────────────────────── */}
        {activeTab === 'discover' && (
          <View style={{ paddingHorizontal: 16 }}>
            {/* Banner informativo */}
            <View style={{ backgroundColor: isDark ? '#1A2535' : '#EFF6FF', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14, borderWidth: 1, borderColor: isDark ? '#1E3A5F' : '#BFDBFE' }}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 17 }}>
                Estas son las clínicas verificadas donde puedes atender. Al crear un horario eliges la
                clínica y la sede; quedas vinculado automáticamente a ella.
              </Text>
            </View>

            {/* Buscador */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cardBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: isDark ? '#333' : '#E5E7EB' }}>
              <Ionicons name="search" size={16} color={subColor} />
              <TextInput
                placeholder="Buscar clínicas..."
                placeholderTextColor={subColor}
                value={discoverSearch}
                onChangeText={setDiscoverSearch}
                style={{ flex: 1, fontSize: 14, color: textColor }}
              />
              {discoverSearch.length > 0 && (
                <Pressable onPress={() => setDiscoverSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={subColor} />
                </Pressable>
              )}
            </View>

            {discoverLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ fontSize: 13, color: subColor }}>Buscando clínicas...</Text>
              </View>
            )}
            {discoverError && !discoverLoading && (
              <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCA5A5' : '#991B1B' }}>{discoverError}</Text>
              </View>
            )}

            {!discoverLoading && discoverResults.map((clinic) => (
              <View
                key={clinic.id}
                style={{
                  backgroundColor: cardBg, borderRadius: 16, padding: 14, marginBottom: 10,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.15 : 0.05, shadowRadius: 4, elevation: 1,
                  borderWidth: 1, borderColor: isDark ? '#272727' : '#F1F5F9',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="business" size={18} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>{clinic.name}</Text>
                    <Text style={{ fontSize: 11, color: subColor, marginTop: 2 }}>
                      {clinic.branch_count} sede{clinic.branch_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                {(clinic.phone || clinic.email) && (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {clinic.phone && (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${clinic.phone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? '#0D2E1F' : '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
                      >
                        <Ionicons name="call-outline" size={11} color="#10B981" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>{clinic.phone}</Text>
                      </Pressable>
                    )}
                    {clinic.email && (
                      <Pressable
                        onPress={() => Linking.openURL(`mailto:${clinic.email}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
                      >
                        <Ionicons name="mail-outline" size={11} color="#3B82F6" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#3B82F6' }} numberOfLines={1}>{clinic.email}</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            ))}

            {!discoverLoading && !discoverError && discoverResults.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="business-outline" size={40} color={subColor} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, marginTop: 12 }}>
                  {discoverSearch ? 'Sin resultados' : 'Escribe para buscar clínicas'}
                </Text>
                <Text style={{ fontSize: 12, color: subColor, marginTop: 4, textAlign: 'center' }}>
                  {discoverSearch ? 'Intenta con otro nombre.' : 'Encuentra clínicas activas donde puedas atender.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Tab Agenda ──────────────────────────────────────── */}
        {activeTab === 'agenda' && (
          <View style={{ paddingHorizontal: 16 }}>

            {/* Filtro de duración */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="eye-outline" size={13} color={subColor} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Mostrar
                </Text>
              </View>
              <PillRow
                options={[
                  { value: 1, label: '1 sem' },
                  { value: 2, label: '2 sem' },
                  { value: 4, label: '4 sem' },
                  { value: 8, label: '8 sem' },
                ]}
                value={agendaWeeks}
                onChange={setAgendaWeeks}
                isDark={isDark}
              />
            </View>

            {/* Filtro de estado */}
            <View style={{ marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {([null, 'available', 'booked', 'blocked'] as const).map((s) => {
                  const sel = agendaStatusFilter === s;
                  const label = s === null ? 'Todos' : s === 'available' ? 'Disponibles' : s === 'booked' ? 'Reservados' : 'Bloqueados';
                  const color = s === null ? '#6B7280' : s === 'available' ? '#10B981' : s === 'booked' ? '#E8467C' : '#F59E0B';
                  return (
                    <Pressable
                      key={String(s)}
                      onPress={() => setAgendaStatusFilter(s)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: sel ? color : (isDark ? '#2A2A2A' : '#F3F4F6'),
                        borderWidth: 1.5, borderColor: sel ? color : (isDark ? '#3A3A3A' : '#E5E7EB'),
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? '#fff' : (isDark ? '#D1D5DB' : '#374151') }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Loading / error */}
            {agendaLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 13, color: subColor }}>Cargando agenda...</Text>
              </View>
            )}
            {agendaError && !agendaLoading && (
              <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={{ flex: 1, fontSize: 12, color: isDark ? '#FCA5A5' : '#991B1B' }}>{agendaError}</Text>
                <Pressable onPress={loadAgenda} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#EF4444', borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Reintentar</Text>
                </Pressable>
              </View>
            )}

            {/* Slots agrupados por fecha */}
            {!agendaLoading && !agendaError && groupSlotsByDate(agendaSlots).map(([date, daySlots]) => (
              <View key={date} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: subColor, textTransform: 'capitalize', marginBottom: 8, letterSpacing: 0.3 }}>
                  {formatDateHeader(date)}
                </Text>
                {daySlots.map((slot) => {
                  const statusColor = slot.status === 'available' ? '#10B981' : slot.status === 'booked' ? '#E8467C' : slot.status === 'blocked' ? '#F59E0B' : '#6B7280';
                  const statusLabel = slot.status === 'available' ? 'Disponible' : slot.status === 'booked' ? 'Reservado' : slot.status === 'blocked' ? 'Bloqueado' : 'Cancelado';
                  const locationName = slot.branch?.name ?? slot.office?.name ?? null;
                  const locationIcon = slot.office?.type === 'home' ? 'home-outline' : slot.branch ? 'business-outline' : 'location-outline';
                  return (
                    <View
                      key={slot.id}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        backgroundColor: cardBg, borderRadius: 14, padding: 12, marginBottom: 6,
                        borderLeftWidth: 3, borderLeftColor: statusColor,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isDark ? 0.15 : 0.05, shadowRadius: 4, elevation: 1,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>
                          {formatTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                        </Text>
                        {locationName && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <Ionicons name={locationIcon as any} size={11} color={subColor} />
                            <Text style={{ fontSize: 11, color: subColor }} numberOfLines={1}>{locationName}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            {!agendaLoading && !agendaError && agendaSlots.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="calendar-outline" size={40} color={subColor} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, marginTop: 12 }}>Sin slots en este período</Text>
                <Text style={{ fontSize: 12, color: subColor, marginTop: 4, textAlign: 'center' }}>
                  Genera slots desde la pestaña Horarios para verlos aquí.
                </Text>
              </View>
            )}

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
