import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  medicalApi,
  MedicalRecord,
  MedicalRecordFile,
  MedicalRecordFilters,
  RecordCategory,
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
    <Animated.View style={{ opacity: anim, width: width as number, height, borderRadius: rounded ? height / 2 : 6, backgroundColor: '#E5E7EB' }} />
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
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo abrir el archivo.');
    } finally { setOpening(false); }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#25252550' : '#F9FAFB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#E8467C20', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <Ionicons name="document-outline" size={16} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }} numberOfLines={1}>{file.file_name}</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{formatBytes(file.file_size_bytes)}</Text>
      </View>
      <Pressable onPress={handleOpen} disabled={opening} style={{ backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, opacity: opening ? 0.6 : 1, minWidth: 44, minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{opening ? '...' : 'Abrir'}</Text>
      </Pressable>
    </View>
  );
}

function DocumentFile({ record, token, isDark }: { record: MedicalRecord; token: string; isDark: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(4 / 3); // default until real dims load
  const [viewerOpen, setViewerOpen] = useState(false);

  const isImage = record.file_type?.startsWith('image/');
  const ext = record.file_type?.split('/')[1]?.toUpperCase() ?? 'Archivo';
  const sizeLabel = record.file_size_kb ? `${record.file_size_kb} KB` : '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUrl(true);
      setError(null);
      try {
        const res = await medicalApi.getDocumentSignedUrl(token, record.id);
        const signedUrl = res.data?.url ?? null;
        console.log('[DocumentFile] signed URL:', signedUrl);

        if (!signedUrl) {
          if (!cancelled) setError('El servidor no devolvió una URL válida.');
          return;
        }

        if (isImage) {
          // Download bytes and convert to base64 data URI for reliable inline display
          const imgRes = await fetch(signedUrl);
          if (!imgRes.ok) {
            if (!cancelled) setError(`Error HTTP ${imgRes.status} al descargar imagen.`);
            return;
          }
          const buf = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          const chunk = 8192;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          const mimeType = record.file_type ?? 'image/jpeg';
          const dataUri = `data:${mimeType};base64,${btoa(binary)}`;
          if (!cancelled) setUrl(dataUri);
        } else {
          if (!cancelled) setUrl(signedUrl);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Error al obtener el archivo.');
      } finally {
        if (!cancelled) setLoadingUrl(false);
      }
    })();
    return () => { cancelled = true; };
  }, [record.id, token]);

  const handleOpenDoc = async () => {
    if (!url) return;
    setOpening(true);
    setError(null);
    try {
      await Linking.openURL(url);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo abrir el archivo.');
    } finally {
      setOpening(false);
    }
  };

  const imgWidth = Dimensions.get('window').width - 64;
  const imgHeight = imgWidth / aspectRatio;

  if (isImage) {
    return (
      <View style={{ marginTop: 10 }}>
        {loadingUrl && (
          <View style={{ height: 160, borderRadius: 12, backgroundColor: isDark ? '#252525' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={ACCENT} />
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Cargando imagen…</Text>
          </View>
        )}

        {url && !loadingUrl && (
          <>
            <Pressable
              onPress={() => setViewerOpen(true)}
              style={{ borderRadius: 12, overflow: 'hidden' }}
            >
              <Image
                source={{ uri: url }}
                style={{ width: imgWidth, height: imgHeight }}
                resizeMode="cover"
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  if (width && height) setAspectRatio(width / height);
                }}
                onError={() => setError('Error al cargar la imagen.')}
              />
              <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#00000070', borderRadius: 8, padding: 5 }}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
              </View>
            </Pressable>
            {sizeLabel ? <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{sizeLabel}</Text> : null}

            <Modal
              visible={viewerOpen}
              transparent={false}
              animationType="fade"
              onRequestClose={() => setViewerOpen(false)}
              statusBarTranslucent
            >
              <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
                <Image
                  source={{ uri: url }}
                  style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
                  resizeMode="contain"
                />
                <Pressable
                  onPress={() => setViewerOpen(false)}
                  style={{ position: 'absolute', top: 52, right: 18, backgroundColor: '#00000080', borderRadius: 22, padding: 9 }}
                  hitSlop={12}
                >
                  <Ionicons name="close" size={22} color="#fff" />
                </Pressable>
              </View>
            </Modal>
          </>
        )}

        {!url && !loadingUrl && !error && (
          <View style={{ height: 80, borderRadius: 12, backgroundColor: isDark ? '#252525' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={22} color="#9CA3AF" />
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>No se pudo cargar la imagen</Text>
          </View>
        )}
        {error && (
          <View style={{ backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#EF4444' }}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={handleOpenDoc}
        disabled={opening || loadingUrl}
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: isDark ? '#252525' : '#FFF1F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, opacity: (opening || loadingUrl) ? 0.7 : 1 }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8467C20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          {loadingUrl
            ? <ActivityIndicator size="small" color={ACCENT} />
            : <Ionicons name="document-outline" size={18} color={ACCENT} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>
            {opening ? 'Abriendo…' : loadingUrl ? 'Preparando…' : 'Ver archivo adjunto'}
          </Text>
          {(sizeLabel || ext) && (
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
              {[sizeLabel, ext].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <Ionicons name="open-outline" size={16} color={ACCENT} />
      </Pressable>
      {error && (
        <View style={{ marginTop: 4, backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 11, color: '#EF4444' }}>{error}</Text>
        </View>
      )}
    </>
  );
}

function RecordCard({ record, token, isDark }: { record: MedicalRecord; token: string; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<MedicalRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const chevron = useRef(new Animated.Value(0)).current;

  const displayTitle = record.display_title;
  const dateLabel = formatDate(record.document_date ?? record.created_at);
  const iconColor = record.category?.color ?? ACCENT;

  const toggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(chevron, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    if (next && !detail) {
      setLoadingDetail(true);
      try {
        const res = await medicalApi.show(token, record.id);
        setDetail(res.data);
      } catch { /* ignore */ }
      finally { setLoadingDetail(false); }
    }
  }, [expanded, detail, record.id, token, chevron]);

  const rotate = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const vitals: VitalSign | undefined = detail?.vital_signs?.[0];

  return (
    <Pressable
      onPress={toggle}
      style={{ backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6', overflow: 'hidden' }}
      accessibilityRole="button"
      accessibilityLabel={`${displayTitle}, ${dateLabel}`}
      accessibilityState={{ expanded }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: iconColor + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name={record.has_document ? 'document-text-outline' : 'medkit-outline'} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={2}>
            {displayTitle}
          </Text>
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
          {record.tags && record.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
              {record.tags.map((tag) => (
                <View key={tag.id} style={{ backgroundColor: (tag.color ?? '#9CA3AF') + '25', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
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

      {/* Expanded */}
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: isDark ? '#2D2D2D' : '#F3F4F6' }}>
          {record.description && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Descripción</Text>
              <Text style={{ fontSize: 13, color: isDark ? '#E5E7EB' : '#374151', lineHeight: 18 }}>{record.description}</Text>
            </View>
          )}

          {/* Archivo del documento subido */}
          {record.has_document && (
            <DocumentFile record={record} token={token} isDark={isDark} />
          )}

          {record.diagnosis && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Diagnóstico</Text>
              <Text style={{ fontSize: 13, color: isDark ? '#E5E7EB' : '#374151', lineHeight: 18 }}>{record.diagnosis}</Text>
            </View>
          )}

          {loadingDetail && (
            <View style={{ marginTop: 8, gap: 6 }}>
              <SkeletonPulse width="100%" height={32} />
              <SkeletonPulse width="80%" height={32} />
            </View>
          )}

          {!loadingDetail && vitals && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Signos Vitales</Text>
              <View style={{ backgroundColor: isDark ? '#252525' : '#F9FAFB', borderRadius: 10, padding: 10 }}>
                {vitals.weight_kg       && <VitalRow label="Peso"            value={`${vitals.weight_kg} kg`}         icon="scale-outline" />}
                {vitals.height_cm       && <VitalRow label="Talla"           value={`${vitals.height_cm} cm`}         icon="resize-outline" />}
                {vitals.blood_pressure  && <VitalRow label="Presión art."    value={vitals.blood_pressure}            icon="pulse-outline" />}
                {vitals.heart_rate_bpm  && <VitalRow label="Frec. cardíaca"  value={`${vitals.heart_rate_bpm} bpm`}  icon="heart-outline" />}
                {vitals.temperature_c   && <VitalRow label="Temperatura"     value={`${vitals.temperature_c} °C`}    icon="thermometer-outline" />}
                {vitals.oxygen_saturation && <VitalRow label="SaO₂"          value={`${vitals.oxygen_saturation}%`}  icon="water-outline" />}
              </View>
            </View>
          )}

          {!loadingDetail && detail?.files && detail.files.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Archivos adjuntos</Text>
              {detail.files.map((f) => (
                <FileItem key={f.id} file={f} recordId={record.id} token={token} isDark={isDark} />
              ))}
            </View>
          )}

          {!loadingDetail && !record.description && !record.has_document && !record.diagnosis && !vitals && (!detail?.files || detail.files.length === 0) && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10, textAlign: 'center' }}>Sin detalles adicionales.</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── Filter modal ────────────────────────────────────────────────────────────

interface Filters {
  category_id: string;
  date_from: string;
  date_to: string;
  visibility: '' | 'shared' | 'private';
  uploaded_by_me: boolean;
}

const EMPTY_FILTERS: Filters = { category_id: '', date_from: '', date_to: '', visibility: '', uploaded_by_me: false };

function FilterModal({
  visible, onClose, onApply, initial, categories, isPatient, isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (f: Filters) => void;
  initial: Filters;
  categories: RecordCategory[];
  isPatient: boolean;
  isDark: boolean;
}) {
  const [f, setF] = useState<Filters>(initial);
  const bg = isDark ? '#1A1A1A' : '#FFFFFF';
  const inputBg = isDark ? '#252525' : '#F3F4F6';
  const text = isDark ? '#F9FAFB' : '#111827';
  const muted = '#9CA3AF';

  useEffect(() => { if (visible) setF(initial); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000060' }} onPress={onClose} />
      <View style={{ backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>
        {/* Handle */}
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginBottom: 16 }}>Filtrar historial</Text>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Categoría */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Categoría</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => setF(p => ({ ...p, category_id: '' }))}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: f.category_id === '' ? ACCENT : (isDark ? '#2D2D2D' : '#F3F4F6'), borderWidth: 1, borderColor: f.category_id === '' ? ACCENT : (isDark ? '#3D3D3D' : '#E5E7EB') }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: f.category_id === '' ? '#fff' : text }}>Todas</Text>
            </Pressable>
            {categories.map(cat => (
              <Pressable
                key={cat.id}
                onPress={() => setF(p => ({ ...p, category_id: p.category_id === cat.id ? '' : cat.id }))}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: f.category_id === cat.id ? (cat.color ?? ACCENT) : (isDark ? '#2D2D2D' : '#F3F4F6'), borderWidth: 1, borderColor: f.category_id === cat.id ? (cat.color ?? ACCENT) : (isDark ? '#3D3D3D' : '#E5E7EB') }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: f.category_id === cat.id ? '#fff' : text }}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>

          {/* Fecha */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Rango de fecha</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Desde</Text>
              <TextInput
                value={f.date_from}
                onChangeText={v => setF(p => ({ ...p, date_from: v }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={muted}
                style={{ backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: text }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Hasta</Text>
              <TextInput
                value={f.date_to}
                onChangeText={v => setF(p => ({ ...p, date_to: v }))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={muted}
                style={{ backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: text }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

          {/* Visibilidad (solo paciente) */}
          {isPatient && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Visibilidad</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['', 'shared', 'private'] as const).map(v => {
                  const label = v === '' ? 'Todos' : v === 'shared' ? 'Compartidos' : 'Privados';
                  const active = f.visibility === v;
                  return (
                    <Pressable key={v} onPress={() => setF(p => ({ ...p, visibility: v }))}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: active ? ACCENT : inputBg, borderWidth: 1, borderColor: active ? ACCENT : (isDark ? '#3D3D3D' : '#E5E7EB') }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : text }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Subido por mí */}
              <Pressable
                onPress={() => setF(p => ({ ...p, uploaded_by_me: !p.uploaded_by_me }))}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 }}
              >
                <Text style={{ fontSize: 14, color: text, fontWeight: '500' }}>Solo subidos por mí</Text>
                <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: f.uploaded_by_me ? ACCENT : '#D1D5DB', justifyContent: 'center', paddingHorizontal: 2 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: f.uploaded_by_me ? 'flex-end' : 'flex-start' }} />
                </View>
              </Pressable>
            </>
          )}
        </ScrollView>

        {/* Acciones */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={() => { setF(EMPTY_FILTERS); onApply(EMPTY_FILTERS); }}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: inputBg }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>Limpiar</Text>
          </Pressable>
          <Pressable
            onPress={() => onApply(f)}
            style={{ flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: ACCENT }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Aplicar filtros</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function MedicalHistoryScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const params = useLocalSearchParams<{ patient_id?: string; patient_name?: string }>();
  const doctorViewPatientId = params.patient_id;    // set when doctor opens a patient's history
  const doctorViewPatientName = params.patient_name;

  const isPatient = user?.role === 'patient';

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<RecordCategory[]>([]);

  // Fetch catalog categories for the filter modal
  useEffect(() => {
    if (!token) return;
    medicalApi.catalog(token)
      .then(res => setCategories(res.data.categories))
      .catch(() => {}); // non-critical
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const apiFilters: MedicalRecordFilters = {};
      if (doctorViewPatientId) apiFilters.patient_id = doctorViewPatientId;
      if (filters.category_id) apiFilters.category_id = filters.category_id;
      if (filters.date_from) apiFilters.date_from = filters.date_from;
      if (filters.date_to) apiFilters.date_to = filters.date_to;
      if (filters.visibility) apiFilters.visibility = filters.visibility as 'shared' | 'private';
      if (filters.uploaded_by_me) apiFilters.uploaded_by_me = 1;

      const res = await medicalApi.list(token, apiFilters);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('No se pudo cargar el historial. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [token, doctorViewPatientId, filters]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (f: Filters) => {
    setFilters(f);
    setShowFilters(false);
  };

  const hasActiveFilters = filters.category_id || filters.date_from || filters.date_to || filters.visibility || filters.uploaded_by_me;

  const sections = groupByDocumentDate(records);
  const bg = isDark ? '#141414' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';

  const headerTitle = doctorViewPatientId
    ? `Historial de ${doctorViewPatientName ?? 'Paciente'}`
    : 'Historial Médico';
  const headerSub = doctorViewPatientId
    ? 'Documentos compartidos del paciente'
    : 'Todos tus exámenes y consultas';

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
          <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{headerSub}</Text>
        </View>
        {/* Filter button */}
        <Pressable
          onPress={() => setShowFilters(true)}
          style={{
            width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: hasActiveFilters ? '#E8467C20' : cardBg,
            borderWidth: hasActiveFilters ? 1.5 : 0,
            borderColor: hasActiveFilters ? ACCENT : 'transparent',
          }}
          accessibilityRole="button" accessibilityLabel="Filtros"
        >
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? ACCENT : (isDark ? '#F9FAFB' : '#111827')} />
        </Pressable>
        {!loading && records.length > 0 && (
          <View style={{ backgroundColor: '#E8467C15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>{records.length}</Text>
          </View>
        )}
      </View>

      {/* Active filters hint */}
      {hasActiveFilters && (
        <Pressable onPress={() => setShowFilters(true)} style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8467C15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Ionicons name="funnel" size={13} color={ACCENT} />
          <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600', flex: 1 }}>Filtros activos — toca para editar</Text>
          <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
            <Ionicons name="close-circle" size={16} color={ACCENT} />
          </Pressable>
        </Pressable>
      )}

      {/* Skeleton */}
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

      {/* Error */}
      {!loading && error && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>Error de conexión</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 24, lineHeight: 18 }}>{error}</Text>
          <Pressable onPress={load} style={{ backgroundColor: ACCENT, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
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
          contentContainerStyle={{ paddingBottom: isPatient && !doctorViewPatientId ? 100 : 48 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="documents-outline" size={32} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
                {hasActiveFilters ? 'Sin resultados' : 'Sin registros médicos'}
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                {hasActiveFilters
                  ? 'Ningún registro coincide con los filtros aplicados.'
                  : isPatient
                    ? 'Sube tu primer documento con el botón +'
                    : 'Los documentos compartidos del paciente aparecerán aquí.'}
              </Text>
              {hasActiveFilters && (
                <Pressable onPress={() => setFilters(EMPTY_FILTERS)} style={{ marginTop: 16, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Limpiar filtros</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* FAB upload (patients, solo en su propio historial) */}
      {isPatient && !doctorViewPatientId && !loading && (
        <Pressable
          onPress={() => router.push('/upload-document')}
          style={{
            position: 'absolute', bottom: 32, right: 20,
            width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: ACCENT, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
          accessibilityRole="button" accessibilityLabel="Subir nuevo documento"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      {/* Filter modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={applyFilters}
        initial={filters}
        categories={categories}
        isPatient={isPatient}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}