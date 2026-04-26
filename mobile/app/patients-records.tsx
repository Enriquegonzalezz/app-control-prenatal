import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { medicalApi, MedicalRecord } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

const ACCENT = '#E8467C';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

type PatientSection = {
  patientId: string;
  title: string;
  subtitle: string;
  data: MedicalRecord[];
};

function groupByPatient(records: MedicalRecord[]): PatientSection[] {
  const map = new Map<string, PatientSection>();

  records.forEach((r) => {
    const pid = r.patient_id;
    if (!map.has(pid)) {
      map.set(pid, {
        patientId: pid,
        title: r.patient?.name ?? 'Paciente',
        subtitle: '',
        data: [],
      });
    }
    map.get(pid)!.data.push(r);
  });

  // Sort each patient's records newest first
  map.forEach((s) => {
    s.data.sort((a, b) => {
      const da = new Date(a.document_date ?? a.created_at).getTime();
      const db = new Date(b.document_date ?? b.created_at).getTime();
      return db - da;
    });
    s.subtitle = `${s.data.length} ${s.data.length === 1 ? 'documento' : 'documentos'}`;
  });

  // Return sorted alphabetically by patient name
  return Array.from(map.values()).sort((a, b) =>
    a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
  );
}

function RecordRow({
  record, isDark, token,
}: {
  record: MedicalRecord;
  isDark: boolean;
  token: string;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDoc = record.has_document;
  const category = record.category?.name ?? 'Documento';
  const dateStr = formatDate(record.document_date ?? record.created_at);

  const handleOpen = async () => {
    if (!hasDoc) {
      router.push({
        pathname: '/medical-history',
        params: { patient_id: record.patient_id, patient_name: record.patient?.name ?? '' },
      });
      return;
    }
    setOpening(true);
    setError(null);
    try {
      const res = await medicalApi.getDocumentSignedUrl(token, record.id);
      const url = res.data?.url;
      if (!url) throw new Error('URL no disponible');
      await Linking.openURL(url);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo abrir el documento.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
      <Pressable
        onPress={handleOpen}
        disabled={opening}
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: isDark ? '#2D2D2D' : '#F3F4F6',
          opacity: opening ? 0.6 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${record.title ?? category}`}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: '#E8467C15',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <Ionicons name="document-text-outline" size={20} color={ACCENT} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}
            numberOfLines={1}
          >
            {record.title || category}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{dateStr}</Text>
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' }} />
            <Text style={{ fontSize: 11, color: '#9CA3AF' }} numberOfLines={1}>{category}</Text>
          </View>
        </View>

        {opening ? (
          <ActivityIndicator size="small" color={ACCENT} />
        ) : (
          <Ionicons
            name={hasDoc ? 'open-outline' : 'chevron-forward'}
            size={18}
            color="#9CA3AF"
          />
        )}
      </Pressable>

      {error && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2',
          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4,
        }}>
          <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
          <Text style={{ fontSize: 11, color: '#EF4444', flex: 1 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function PatientsRecordsScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [sections, setSections] = useState<PatientSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await medicalApi.list(token, { scope: 'patients' });
      const data = Array.isArray(res.data) ? res.data : [];
      setSections(groupByPatient(data));
    } catch {
      setError('No se pudo cargar el historial de pacientes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Redirect if not a doctor
  if (user && user.role !== 'doctor') {
    router.replace('/medical-history');
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#141414' : '#F5F5F5' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: isDark ? '#2D2D2D' : '#E5E7EB',
        backgroundColor: isDark ? '#141414' : '#F5F5F5',
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>
            Historial de Pacientes
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
            Documentos compartidos por tus pacientes
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ACCENT} />
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Cargando…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 12 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => { setLoading(true); load(); }}
            style={{ backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/medical-history',
                  params: { patient_id: section.patientId, patient_name: section.title },
                })
              }
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
                backgroundColor: isDark ? '#141414' : '#F5F5F5',
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ver historial completo de ${section.title}`}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: '#E8467C15',
                alignItems: 'center', justifyContent: 'center',
                marginRight: 10,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>
                  {section.title.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
                  {section.title}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                  {section.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          )}
          renderItem={({ item }) => (
            <RecordRow record={item} isDark={isDark} token={token ?? ''} />
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: isDark ? '#2D1A20' : '#FCE7F3',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Ionicons name="people-outline" size={32} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center', marginBottom: 8 }}>
                Sin documentos de pacientes
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
                Cuando tus pacientes compartan documentos, aparecerán aquí agrupados por paciente.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
