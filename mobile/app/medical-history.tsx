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

const ACCENT = '#E8467C';

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

// Group by document_date (YYYY-MM-DD) or created_at month as fallback
function groupByDocumentDate(records: MedicalRecord[]): Array<{ title: string; data: MedicalRecord[] }> {
  const map = new Map<string, { sort: string; label: string; items: MedicalRecord[] }>();
  records.forEach((r) => {
    const raw = r.document_date ?? r.created_at;
    const d = new Date(raw);
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(d);
    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
    if (!map.has(sortKey)) map.set(sortKey, { sort: sortKey, label: displayLabel, items: [] });
    map.get(sortKey)!.items.push(r);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => ({ title: v.label, data: v.items }));
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
      style={{ opacity: anim, width: width as number, height, borderRadius: rounded ? height / 2 : 6, backgroundColor: '#E5E7EB' }}
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

function FileItem({ file, recordId, token, isDark }: { file: MedicalRecordFile; recordId: string; token: string; isDark: boolean }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      const res = await medicalApi.getSignedUrl(token, recordId, file.id);
      await Linking.openURL(res.data.url);
    } catch { /* silent */ }
    finally { setOpening(false); }
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isDark ? '#25252550' : '#F9FAFB',
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
    }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#E8467C20', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <Ionicons name="document-outline" size={16} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }} numberOfLines={1}>
          {file.file_name}
        </Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
          {formatBytes(file.file_size_bytes)}
        </Text>
      </View>
      <Pressable
        onPress={handleOpen}
        disabled={opening}
        style={{
          backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
          opacity: opening ? 0.6 : 1, minWidth: 44, minHeight: 32, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{opening ? '...' : 'Abrir'}</Text>
      </Pressable>
    </View>
  );
}

function DocumentFile({ record, token, isDark }: { record: MedicalRecord; token: string; isDark: boolean }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      const res = await medicalApi.getDocumentSignedUrl(token, record.id);
      await Linking.openURL(res.data.url);
    } catch { /* silent */ }
    finally { setOpening(false); }
  };

  return (
    <Pressable
      onPress={handleOpen}
      disabled={opening}
      style={{
        flexDirection: 'row', alignItems: 'center', marginTop: 10,
        backgroundColor: isDark ? '#252525' : '#FFF1F6',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      }}
    >
      <Ionicons name="document-outline" size={18} color={ACCENT} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>
          {opening ? 'Abriendo…' : 'Ver archivo adjunto'}
        </Text>
        {record.file_size_kb && (
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
            {(record.file_size_kb).toFixed(0)} KB · {record.file_type?.split('/')[1]?.toUpperCase() ?? 'Archivo'}
          </Text>
        )}
      </View>
      <Ionicons name="open-outline" size={16} color={ACCENT} />
    </Pressable>
  );
}

function RecordCard({ record, token, isDark }: { record: MedicalRecord; token: string; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<MedicalRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const chevron = useRef(new Animated.Value(0)).current;

  const isDocumentUpload = !!record.storage_path;
  const displayTitle = record.title ?? record.category?.name ?? 'Documento médico';
  const dateLabel = formatDate(record.document_date ?? record.created_at);

  const toggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(chevron, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
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

  const iconColor = record.category?.color ?? ACCENT;
  const catIcon = isDocumentUpload ? 'document-text-outline' : 'medkit-outline';

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
      accessibilityLabel={`${displayTitle}, ${dateLabel}`}
      accessibilityState={{ expanded }}
    >
      {/* ── Card header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: iconColor + '20',
          alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Ionicons name={catIcon as any} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={2}>
            {displayTitle}
          </Text>
          {/* Category + subcategory badges */}
          {record.category && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 }}>
              <View style={{ backgroundColor: iconColor + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: iconColor }}>{record.category.name}</Text>
              </View>
              {record.subcategory && (
                <View style={{ backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{record.subcategory.name}</Text>
                </View>
              )}
              {record.visibility === 'private' && (
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="lock-closed" size={9} color="#D97706" />
                  <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>Privado</Text>
                </View>
              )}
            </View>
          )}
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{dateLabel}</Text>
          {record.doctor && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }} numberOfLines={1}>
              Dr. {record.doctor.name}
            </Text>
          )}
          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
              {record.tags.map((tag) => (
                <View
                  key={tag.id}
                  style={{ backgroundColor: (tag.color ?? '#9CA3AF') + '25', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: tag.color ?? '#6B7280' }}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Animated.View>
      </View>

      {/* ── Expanded content ── */}
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: isDark ? '#2D2D2D' : '#F3F4F6' }}>
          {/* Description (document-upload records) */}
          {record.description && (
            <View style={{ marginTop: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Descripción
              </Text>
              <Text style={{ fontSize: 13, color: isDark ? '#E5E7EB' : '#374151', lineHeight: 18 }}>
                {record.description}
              </Text>
            </View>
          )}

          {/* Document file link */}
          {record.storage_path && (
            <DocumentFile record={record} token={token} isDark={isDark} />
          )}

          {/* Diagnosis (legacy doctor-note) */}
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
                {vitals.weight_kg      && <VitalRow label="Peso"             value={`${vitals.weight_kg} kg`}         icon="scale-outline" />}
                {vitals.height_cm      && <VitalRow label="Talla"            value={`${vitals.height_cm} cm`}         icon="resize-outline" />}
                {vitals.blood_pressure && <VitalRow label="Presión art."     value={vitals.blood_pressure}            icon="pulse-outline" />}
                {vitals.heart_rate_bpm && <VitalRow label="Frec. cardíaca"   value={`${vitals.heart_rate_bpm} bpm`}  icon="heart-outline" />}
                {vitals.temperature_c  && <VitalRow label="Temperatura"      value={`${vitals.temperature_c} °C`}    icon="thermometer-outline" />}
                {vitals.oxygen_saturation && <VitalRow label="SaO₂"          value={`${vitals.oxygen_saturation}%`}  icon="water-outline" />}
              </View>
            </View>
          )}

          {/* Legacy attached files */}
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
          {!loadingDetail && !record.description && !record.storage_path && !record.diagnosis && !vitals && (!detail?.files || detail.files.length === 0) && (
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
  const user = useAuthStore((s) => s.user);

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

  const sections = groupByDocumentDate(records);
  const bg = isDark ? '#141414' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';

  const isPatient = user?.role === 'patient';

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
            <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>{records.length}</Text>
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
          <Pressable onPress={load} style={{ backgroundColor: ACCENT, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 }}>
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
          contentContainerStyle={{ paddingBottom: isPatient ? 100 : 48 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="documents-outline" size={32} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
                Sin registros médicos
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                {isPatient
                  ? 'Sube tu primer documento con el botón +'
                  : 'Tus consultas y exámenes aparecerán aquí.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── FAB upload (patients only) ── */}
      {isPatient && !loading && (
        <Pressable
          onPress={() => router.push('/upload-document')}
          style={{
            position: 'absolute', bottom: 32, right: 20,
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: ACCENT,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: ACCENT, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel="Subir nuevo documento"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}