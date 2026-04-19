import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  medicalApi,
  MedicalRecordCatalog,
  RecordCategory,
  RecordSubcategory,
  RecordTag,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

const ACCENT = '#E8467C';
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
      {children}
    </Text>
  );
}

function OptionChip({
  label, selected, onPress, color, isDark,
}: {
  label: string; selected: boolean; onPress: () => void; color?: string | null; isDark: boolean;
}) {
  const bg = selected ? (color ?? ACCENT) : (isDark ? '#2D2D2D' : '#F3F4F6');
  const text = selected ? '#fff' : (isDark ? '#D1D5DB' : '#374151');
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: bg, marginRight: 8, marginBottom: 8,
        borderWidth: selected ? 0 : 1,
        borderColor: isDark ? '#3D3D3D' : '#E5E7EB',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function UploadDocumentScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const params = useLocalSearchParams<{
    patient_id?: string;
    appointment_id?: string;
    doctor_id?: string;
  }>();

  const bg = isDark ? '#141414' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const inputBg = isDark ? '#252525' : '#F9FAFB';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const mutedColor = '#9CA3AF';

  // ── Catalog state ──
  const [catalog, setCatalog] = useState<MedicalRecordCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // ── Form state ──
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared');
  const [doctorId, setDoctorId] = useState(params.doctor_id ?? '');

  const [pickedFile, setPickedFile] = useState<{
    uri: string; name: string; mimeType: string; size: number;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => router.back(), 1800);
      return () => clearTimeout(t);
    }
  }, [submitted]);

  // ── Load catalog ──
  useEffect(() => {
    if (!token) return;
    medicalApi.catalog(token)
      .then((res) => { setCatalog(res.data); setCatalogError(null); })
      .catch(() => setCatalogError('No se pudo cargar el catálogo. Verifica tu conexión.'))
      .finally(() => setCatalogLoading(false));
  }, [token]);

  // ── Derived ──
  const selectedCategory = useMemo<RecordCategory | undefined>(
    () => catalog?.categories.find((c) => c.id === categoryId),
    [catalog, categoryId],
  );

  const subcategories = useMemo<RecordSubcategory[]>(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory],
  );

  const patientId = params.patient_id ?? (user?.id ? String(user.id) : '');

  // ── File picker ──
  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_BYTES) {
      setFileError('El archivo no puede superar los 20 MB.');
      return;
    }
    setFileError(null);
    setPickedFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  }, []);

  // ── Validate & submit ──
  const isValid = categoryId && subcategoryId && documentDate && description.length >= 10 && pickedFile;

  const handleSubmit = async () => {
    if (!token || !isValid || !pickedFile) return;
    setUploading(true);
    try {
      await medicalApi.uploadDocument(token, {
        patient_id: patientId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        document_date: documentDate,
        description,
        visibility,
        fileUri: pickedFile.uri,
        fileName: pickedFile.name,
        fileMimeType: pickedFile.mimeType,
        tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
        appointment_id: params.appointment_id || undefined,
        doctor_id: doctorId || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      const fieldErrors = err?.errors
        ? Object.entries(err.errors as Record<string, string[]>)
            .map(([field, msgs]) => `• ${field}: ${msgs[0]}`)
            .join('\n')
        : null;
      setSubmitError(fieldErrors ?? err?.message ?? 'No se pudo subir el documento.');
    } finally {
      setUploading(false);
    }
  };

  const toggleTag = (id: string) =>
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  if (catalogLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </SafeAreaView>
    );
  }

  if (catalogError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="cloud-offline-outline" size={28} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: textColor, marginBottom: 8, textAlign: 'center' }}>Error de conexión</Text>
          <Text style={{ fontSize: 13, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>{catalogError}</Text>
          <Pressable
            onPress={() => { setCatalogLoading(true); setCatalogError(null); if (token) medicalApi.catalog(token).then((res) => setCatalog(res.data)).catch(() => setCatalogError('No se pudo cargar el catálogo.')).finally(() => setCatalogLoading(false)); }}
            style={{ backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>
              Subir Documento
            </Text>
            <Text style={{ fontSize: 12, color: mutedColor, marginTop: 1 }}>
              PDF, JPG, PNG o WEBP — máx. 20 MB
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Category ── */}
          <SectionLabel>Categoría *</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {catalog?.categories.map((cat) => (
              <OptionChip
                key={cat.id}
                label={cat.name}
                selected={categoryId === cat.id}
                color={cat.color}
                isDark={isDark}
                onPress={() => { setCategoryId(cat.id); setSubcategoryId(''); }}
              />
            ))}
          </View>

          {/* ── Subcategory ── */}
          {subcategories.length > 0 && (
            <>
              <SectionLabel>Subcategoría *</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {subcategories.map((sub) => (
                  <OptionChip
                    key={sub.id}
                    label={sub.name}
                    selected={subcategoryId === sub.id}
                    isDark={isDark}
                    onPress={() => setSubcategoryId(sub.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── Tags ── */}
          {catalog && catalog.tags.length > 0 && (
            <>
              <SectionLabel>Etiquetas</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {catalog.tags.map((tag: RecordTag) => (
                  <OptionChip
                    key={tag.id}
                    label={tag.name}
                    selected={selectedTags.includes(tag.id)}
                    color={tag.color}
                    isDark={isDark}
                    onPress={() => toggleTag(tag.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── Date ── */}
          <SectionLabel>Fecha del documento *</SectionLabel>
          <View style={{
            backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            borderWidth: 1, borderColor: isDark ? '#3D3D3D' : '#E5E7EB',
          }}>
            <TextInput
              value={documentDate}
              onChangeText={setDocumentDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={mutedColor}
              style={{ fontSize: 15, color: textColor }}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {/* ── Related doctor (patient only, from catalog) ── */}
          {user?.role === 'patient' && catalog && catalog.doctors.length > 0 && (
            <>
              <SectionLabel>Médico relacionado</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <OptionChip
                  label="Ninguno"
                  selected={doctorId === ''}
                  isDark={isDark}
                  onPress={() => setDoctorId('')}
                />
                {catalog.doctors.map((doc) => (
                  <OptionChip
                    key={doc.id}
                    label={doc.name}
                    selected={doctorId === doc.id}
                    isDark={isDark}
                    onPress={() => setDoctorId(doc.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* ── Visibility ── */}
          <SectionLabel>Visibilidad *</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setVisibility('shared')}
              style={{
                flex: 1, borderRadius: 12, padding: 12,
                backgroundColor: visibility === 'shared' ? '#E8467C15' : (isDark ? '#252525' : '#F9FAFB'),
                borderWidth: 1.5,
                borderColor: visibility === 'shared' ? ACCENT : (isDark ? '#3D3D3D' : '#E5E7EB'),
                alignItems: 'center', gap: 4,
              }}
            >
              <Ionicons name="people-outline" size={20} color={visibility === 'shared' ? ACCENT : mutedColor} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: visibility === 'shared' ? ACCENT : (isDark ? '#D1D5DB' : '#374151') }}>
                Compartido
              </Text>
              <Text style={{ fontSize: 11, color: mutedColor, textAlign: 'center' }}>
                Tu médico puede verlo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility('private')}
              style={{
                flex: 1, borderRadius: 12, padding: 12,
                backgroundColor: visibility === 'private' ? '#E8467C15' : (isDark ? '#252525' : '#F9FAFB'),
                borderWidth: 1.5,
                borderColor: visibility === 'private' ? ACCENT : (isDark ? '#3D3D3D' : '#E5E7EB'),
                alignItems: 'center', gap: 4,
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={visibility === 'private' ? ACCENT : mutedColor} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: visibility === 'private' ? ACCENT : (isDark ? '#D1D5DB' : '#374151') }}>
                Privado
              </Text>
              <Text style={{ fontSize: 11, color: mutedColor, textAlign: 'center' }}>
                Solo tú lo verás
              </Text>
            </Pressable>
          </View>

          {/* ── Description ── */}
          <SectionLabel>Descripción * (mín. 10 caracteres)</SectionLabel>
          <View style={{
            backgroundColor: inputBg, borderRadius: 12,
            borderWidth: 1, borderColor: isDark ? '#3D3D3D' : '#E5E7EB',
          }}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe brevemente este documento…"
              placeholderTextColor={mutedColor}
              multiline
              numberOfLines={4}
              style={{ fontSize: 14, color: textColor, padding: 14, minHeight: 100, textAlignVertical: 'top' }}
              maxLength={1000}
            />
          </View>
          <Text style={{ fontSize: 11, color: mutedColor, marginTop: 4, textAlign: 'right' }}>
            {description.length}/1000
          </Text>

          {/* ── File picker ── */}
          <SectionLabel>Archivo *</SectionLabel>
          {fileError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, gap: 8 }}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={{ fontSize: 13, color: '#EF4444', flex: 1 }}>{fileError}</Text>
            </View>
          )}
          {pickedFile ? (
            <View style={{
              backgroundColor: cardBg, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: isDark ? '#3D3D3D' : '#E5E7EB',
              flexDirection: 'row', alignItems: 'center',
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8467C20',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <Ionicons name="document-outline" size={20} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }} numberOfLines={1}>
                  {pickedFile.name}
                </Text>
                <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>
                  {formatBytes(pickedFile.size)} · {pickedFile.mimeType.split('/')[1]?.toUpperCase() ?? 'Archivo'}
                </Text>
              </View>
              <Pressable onPress={pickFile} style={{ padding: 4 }}>
                <Ionicons name="refresh-outline" size={20} color={mutedColor} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickFile}
              style={{
                borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed',
                borderColor: isDark ? '#3D3D3D' : '#D1D5DB',
                backgroundColor: inputBg, padding: 28,
                alignItems: 'center', gap: 8,
              }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8467C15',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="cloud-upload-outline" size={24} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                Seleccionar archivo
              </Text>
              <Text style={{ fontSize: 12, color: mutedColor }}>
                PDF, JPG, PNG o WEBP — máx. 20 MB
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {/* ── Sticky submit ── */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16,
          backgroundColor: bg,
          borderTopWidth: 1, borderTopColor: isDark ? '#2D2D2D' : '#F3F4F6',
        }}>
          {submitError && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 13, color: '#EF4444', flex: 1, lineHeight: 18 }}>{submitError}</Text>
              <Pressable onPress={() => setSubmitError(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color="#EF4444" />
              </Pressable>
            </View>
          )}
          {submitted ? (
            <View style={{ backgroundColor: '#ECFDF5', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#10B981' }}>¡Documento subido!</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || uploading}
              style={{
                backgroundColor: isValid && !uploading ? ACCENT : '#9CA3AF',
                borderRadius: 16, paddingVertical: 16, alignItems: 'center',
              }}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                  Subir Documento
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}