import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  SectionList,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  medicalApi,
  MedicalRecord,
  MedicalRecordFile,
  VitalSign,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

const CATEGORY = {
  lab:          { icon: 'flask-outline' as const,          color: '#3B82F6', bgLight: '#EFF6FF', bgDark: '#1E3A8A20', label: 'Laboratorio'  },
  ultrasound:   { icon: 'scan-outline' as const,           color: '#8B5CF6', bgLight: '#F5F3FF', bgDark: '#4C1D9520', label: 'Ecografía'    },
  prescription: { icon: 'document-text-outline' as const,  color: '#10B981', bgLight: '#ECFDF5', bgDark: '#06402020', label: 'Receta'       },
  other:        { icon: 'folder-outline' as const,         color: '#6B7280', bgLight: '#F9FAFB', bgDark: '#1F293740', label: 'Otro'         },
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function groupByMonth(records: MedicalRecord[]): Array<{ title: string; data: MedicalRecord[] }> {
  const map = new Map<string, MedicalRecord[]>();
  records.forEach((r) => {
    const d = new Date(r.created_at);
    const raw = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(d);
    const key = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function SkeletonPulse({ width, height = 12, rounded = false }: { width: number | string; height?: number; rounded?: boolean }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        opacity: anim,
        width: width as number,
        height,
        borderRadius: rounded ? height / 2 : 6,
        backgroundColor: '#E5E7EB',
      }}
    />
  );
}

function VitalRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
      <Ionicons name={icon as any} size={13} color="#9CA3AF" style={{ marginRight: 6, width: 16 }} />
      <Text style={{ fontSize: 12, color: '#9CA3AF', width: 110 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{value}</Text>
    </View>
  );
}

function FileItem({
  file, recordId, token, isDark,
}: {
  file: MedicalRecordFile; recordId: string; token: string; isDark: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const cat = CATEGORY[file.category];

  const handleOpen = async () => {
    setOpening(true);
    try {
      const res = await medicalApi.getSignedUrl(token, recordId, file.id);
      await Linking.openURL(res.data.url);
    } catch {
      // silent – user sees nothing happens, no crash
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? cat.bgDark : cat.bgLight,
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
    }}>
      <View style={{
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: cat.color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 8,
      }}>
        <Ionicons name={cat.icon} size={16} color={cat.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }} numberOfLines={1}>
          {file.file_name}
        </Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
          {cat.label} · {formatBytes(file.file_size_bytes)}
        </Text>
      </View>
      <Pressable
        onPress={handleOpen}
        disabled={opening}
        style={{
          backgroundColor: cat.color, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
          opacity: opening ? 0.6 : 1, minWidth: 44, minHeight: 32, alignItems: 'center', justifyContent: 'center',
        }}
        accessibilityLabel={`Abrir ${file.file_name}`}
        accessibilityRole="button"
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
          {opening ? '...' : 'Abrir'}
        </Text>
      </Pressable>
    </View>
  );
}

function RecordCard({ record, token, isDark }: { record: MedicalRecord; token: string; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<MedicalRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const chevron = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(chevron, {
      toValue: next ? 1 : 0, duration: 200, useNativeDriver: true,
    }).start();
    if (next && !detail) {
      setLoadingDetail(true);
      try {
        const res = await medicalApi.show(token, record.id);
        setDetail(res.data);
      } catch { /* show nothing */ }
      finally { setLoadingDetail(false); }
    }
  }, [expanded, detail, record.id, token, chevron]);

  const rotate = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const vitals: VitalSign | undefined = detail?.vital_signs?.[0];

  return (
    <Pressable
      onPress={toggle}
      style={{
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 16, marginHorizontal: 16, marginBottom: 10,
        borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6',
        overflow: 'hidden',
      }}
      accessibilityRole="button"
      accessibilityLabel={`${record.title}, ${formatDate(record.created_at)}`}
      accessibilityState={{ expanded }}
    >
      {/* ── Card header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: '#E8467C15', alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Ionicons name="document-text-outline" size={20} color="#E8467C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={2}>
            {record.title}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {formatDate(record.created_at)}
          </Text>
          {record.doctor && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }} numberOfLines={1}>
              Dr. {record.doctor.name}
              {record.specialty ? ` · ${record.specialty.name}` : ''}
            </Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Animated.View>
      </View>

      {/* ── Expanded content ── */}
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: isDark ? '#2D2D2D' : '#F3F4F6' }}>
          {/* Diagnosis */}
          {record.diagnosis && (
            <View style={{ marginTop: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Diagnóstico
              </Text>
              <Text style={{ fontSize: 13, color: isDark ? '#E5E7EB' : '#374151', lineHeight: 18 }}>
                {record.diagnosis}
              </Text>
            </View>
          )}

          {/* Loading skeleton */}
          {loadingDetail && (
            <View style={{ marginTop: 8, gap: 6 }}>
              <SkeletonPulse width="100%" height={32} />
              <SkeletonPulse width="80%" height={32} />
            </View>
          )}

          {/* Vital signs */}
          {!loadingDetail && vitals && (
            <View style={{ marginTop: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Signos Vitales
              </Text>
              <View style={{ backgroundColor: isDark ? '#252525' : '#F9FAFB', borderRadius: 10, padding: 10 }}>
                {vitals.weight_kg    && <VitalRow label="Peso"            value={`${vitals.weight_kg} kg`}         icon="scale-outline" />}
                {vitals.height_cm    && <VitalRow label="Talla"           value={`${vitals.height_cm} cm`}         icon="resize-outline" />}
                {vitals.blood_pressure && <VitalRow label="Presión art."  value={vitals.blood_pressure}            icon="pulse-outline" />}
                {vitals.heart_rate_bpm && <VitalRow label="Frec. cardíaca" value={`${vitals.heart_rate_bpm} bpm`} icon="heart-outline" />}
                {vitals.temperature_c  && <VitalRow label="Temperatura"   value={`${vitals.temperature_c} °C`}    icon="thermometer-outline" />}
                {vitals.oxygen_saturation && <VitalRow label="SaO₂"       value={`${vitals.oxygen_saturation}%`}  icon="water-outline" />}
              </View>
            </View>
          )}

          {/* Files */}
          {!loadingDetail && detail?.files && detail.files.length > 0 && (
            <View style={{ marginTop: vitals ? 0 : 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Archivos adjuntos
              </Text>
              {detail.files.map((f) => (
                <FileItem key={f.id} file={f} recordId={record.id} token={token} isDark={isDark} />
              ))}
            </View>
          )}

          {/* No extra info */}
          {!loadingDetail && !record.diagnosis && !vitals && (!detail?.files || detail.files.length === 0) && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10, textAlign: 'center' }}>
              Sin detalles adicionales en este registro.
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default function MedicalHistoryScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await medicalApi.list(token);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('No se pudo cargar el historial. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const sections = groupByMonth(records);
  const bg = isDark ? '#141414' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>
            Historial Médico
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
            Todos tus exámenes y consultas
          </Text>
        </View>
        {!loading && records.length > 0 && (
          <View style={{ backgroundColor: '#E8467C15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E8467C' }}>{records.length}</Text>
          </View>
        )}
      </View>

      {/* ── Skeleton ── */}
      {loading && (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: cardBg, borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonPulse width={40} height={40} rounded />
                <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                  <SkeletonPulse width="70%" height={14} />
                  <SkeletonPulse width="45%" height={11} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
            Error de conexión
          </Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>{error}</Text>
          <Pressable onPress={load} style={{ backgroundColor: '#E8467C', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* ── List ── */}
      {!loading && !error && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <RecordCard record={item} token={token!} isDark={isDark} />
          )}
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="documents-outline" size={32} color="#E8467C" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
                Sin registros médicos
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                Tus consultas y exámenes aparecerán aquí cuando tu médico los registre.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
