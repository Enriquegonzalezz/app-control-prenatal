import { useCallback, useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { doctorProfileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

// ── Validación (espejo de las reglas del backend) ───────────────────────────────

type FieldKey = 'license_number' | 'university' | 'years_experience' | 'consultation_fee' | 'bio';

function validate(key: FieldKey, raw: string): string | null {
  const v = raw.trim();
  switch (key) {
    case 'license_number':
      if (!v) return 'El número de colegiatura (MPPS) es obligatorio.';
      if (v.length > 50) return 'Máximo 50 caracteres.';
      return null;
    case 'university':
      if (!v) return 'Indica la universidad donde te graduaste.';
      if (v.length > 150) return 'Máximo 150 caracteres.';
      return null;
    case 'years_experience': {
      if (v === '') return 'Indica tus años de experiencia (0 si recién egresaste).';
      if (!/^\d+$/.test(v)) return 'Usa solo números enteros.';
      const n = Number(v);
      if (n > 70) return 'Máximo 70 años.';
      return null;
    }
    case 'consultation_fee': {
      if (v === '') return 'Indica el precio de la consulta.';
      const n = Number(v.replace(',', '.'));
      if (Number.isNaN(n)) return 'Ingresa un monto válido.';
      if (n <= 0) return 'El precio debe ser mayor a 0.';
      if (n > 100000) return 'El monto es demasiado alto.';
      return null;
    }
    case 'bio':
      if (!v) return 'Escribe una breve descripción profesional.';
      if (v.length < 20) return `Faltan ${20 - v.length} caracteres (mínimo 20).`;
      if (v.length > 1000) return 'Máximo 1000 caracteres.';
      return null;
  }
}

export default function DoctorProfileEditScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);

  const bg        = isDark ? '#141414' : '#F0F4F8';
  const cardBg    = isDark ? '#1C1C1C' : '#FFFFFF';
  const inputBg   = isDark ? '#252525' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#0F172A';
  const subColor  = isDark ? '#9CA3AF' : '#64748B';
  const borderCol = isDark ? '#333333' : '#E5E7EB';

  // Datos
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(null);

  // Campos
  const [license, setLicense]   = useState('');
  const [university, setUniversity] = useState('');
  const [years, setYears]       = useState('');
  const [fee, setFee]           = useState('');
  const [bio, setBio]           = useState('');

  const [errors, setErrors]     = useState<Partial<Record<FieldKey, string | null>>>({});
  const [touched, setTouched]   = useState<Partial<Record<FieldKey, boolean>>>({});
  const [focused, setFocused]   = useState<FieldKey | null>(null);

  const [saving, setSaving]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await doctorProfileApi.get(token);
      const dp = res.data?.doctor_profile;
      setSpecialty(dp?.specialty?.name ?? null);
      setLicense(dp?.license_number ?? '');
      setUniversity(dp?.university ?? '');
      setYears(dp?.years_experience != null ? String(dp.years_experience) : '');
      setFee(dp?.consultation_fee != null ? String(parseFloat(String(dp.consultation_fee))) : '');
      setBio(dp?.bio ?? '');
    } catch {
      setLoadError('No se pudo cargar tu perfil. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const values: Record<FieldKey, string> = {
    license_number: license,
    university,
    years_experience: years,
    consultation_fee: fee,
    bio,
  };

  const onBlur = (key: FieldKey) => {
    setFocused(null);
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((e) => ({ ...e, [key]: validate(key, values[key]) }));
  };

  // Limpia el error mientras el usuario corrige (si ya lo había tocado)
  const onChange = (key: FieldKey, setter: (v: string) => void) => (text: string) => {
    setter(text);
    if (touched[key]) {
      setErrors((e) => ({ ...e, [key]: validate(key, text) }));
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    const keys: FieldKey[] = ['license_number', 'university', 'years_experience', 'consultation_fee', 'bio'];
    const nextErrors: Partial<Record<FieldKey, string | null>> = {};
    let hasError = false;
    for (const k of keys) {
      const err = validate(k, values[k]);
      nextErrors[k] = err;
      if (err) hasError = true;
    }
    setErrors(nextErrors);
    setTouched({ license_number: true, university: true, years_experience: true, consultation_fee: true, bio: true });

    if (hasError) {
      setSubmitError('Revisa los campos marcados antes de guardar.');
      return;
    }

    setSubmitError(null);
    setSaving(true);
    try {
      await doctorProfileApi.update(token, {
        license_number: license.trim(),
        university: university.trim(),
        years_experience: parseInt(years, 10),
        consultation_fee: parseFloat(fee.replace(',', '.')),
        bio: bio.trim(),
      });
      setSaved(true);
      setTimeout(() => router.back(), 1200);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'No se pudo guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (key: FieldKey, multiline = false) => ({
    backgroundColor: inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: multiline ? 12 : 13,
    fontSize: 15,
    color: textColor,
    borderWidth: 1.5,
    borderColor: errors[key] ? '#EF4444' : focused === key ? '#E8467C' : borderCol,
    minHeight: multiline ? 110 : 48,
    textAlignVertical: multiline ? ('top' as const) : ('center' as const),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 42, height: 42, borderRadius: 21, backgroundColor: cardBg,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
          })}
          accessibilityRole="button" accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, letterSpacing: -0.3 }}>Perfil profesional</Text>
          <Text style={{ fontSize: 12, color: subColor, marginTop: 1 }}>Datos que verán las pacientes</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#E8467C" />
          <Text style={{ fontSize: 13, color: subColor, marginTop: 12 }}>Cargando tu perfil...</Text>
        </View>
      ) : loadError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={40} color={subColor} />
          <Text style={{ fontSize: 14, color: textColor, textAlign: 'center', marginTop: 12 }}>{loadError}</Text>
          <Pressable onPress={load} style={{ marginTop: 16, backgroundColor: '#E8467C', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Banner explicativo */}
            <View style={{
              flexDirection: 'row', gap: 10, alignItems: 'flex-start',
              backgroundColor: isDark ? '#1A2535' : '#EFF6FF', borderRadius: 16, padding: 14, marginBottom: 18,
              borderWidth: 1, borderColor: isDark ? '#1E3A5F' : '#BFDBFE',
            }}>
              <Ionicons name="eye-outline" size={18} color="#3B82F6" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12.5, color: isDark ? '#93C5FD' : '#1D4ED8', lineHeight: 18 }}>
                Completa todos los campos para aparecer en el directorio y que las pacientes puedan
                agendar contigo. Sin estos datos no serás visible.
              </Text>
            </View>

            {/* Especialidad (solo lectura) */}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: textColor, marginBottom: 6 }}>Especialidad</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: isDark ? '#252525' : '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                borderWidth: 1, borderColor: borderCol,
              }}>
                <Ionicons name="medkit-outline" size={16} color={subColor} />
                <Text style={{ flex: 1, fontSize: 15, color: specialty ? textColor : subColor }}>
                  {specialty ?? 'No asignada'}
                </Text>
                <Ionicons name="lock-closed" size={13} color={subColor} />
              </View>
              <Text style={{ fontSize: 11, color: subColor, marginTop: 5 }}>Se define al registrarte y no se edita aquí.</Text>
            </View>

            {/* Colegiatura */}
            <FormField label="Número de colegiatura (MPPS)" required error={errors.license_number} helper="Tu registro profesional ante el MPPS." textColor={textColor} subColor={subColor}>
              <TextInput
                value={license}
                onChangeText={onChange('license_number', setLicense)}
                onFocus={() => setFocused('license_number')}
                onBlur={() => onBlur('license_number')}
                placeholder="Ej: MPPS-123456"
                placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                autoCapitalize="characters"
                maxLength={50}
                style={inputStyle('license_number')}
                accessibilityLabel="Número de colegiatura"
              />
            </FormField>

            {/* Universidad */}
            <FormField label="Universidad" required error={errors.university} helper="Institución donde obtuviste tu título." textColor={textColor} subColor={subColor}>
              <TextInput
                value={university}
                onChangeText={onChange('university', setUniversity)}
                onFocus={() => setFocused('university')}
                onBlur={() => onBlur('university')}
                placeholder="Ej: Universidad Central de Venezuela"
                placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                maxLength={150}
                style={inputStyle('university')}
                accessibilityLabel="Universidad"
              />
            </FormField>

            {/* Años de experiencia + Precio (dos columnas) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormField label="Años de exp." required error={errors.years_experience} textColor={textColor} subColor={subColor}>
                  <TextInput
                    value={years}
                    onChangeText={onChange('years_experience', setYears)}
                    onFocus={() => setFocused('years_experience')}
                    onBlur={() => onBlur('years_experience')}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={inputStyle('years_experience')}
                    accessibilityLabel="Años de experiencia"
                  />
                </FormField>
              </View>
              <View style={{ flex: 1.3 }}>
                <FormField label="Precio consulta (USD)" required error={errors.consultation_fee} textColor={textColor} subColor={subColor}>
                  <View style={{ position: 'relative', justifyContent: 'center' }}>
                    <Text style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: '700', color: subColor, zIndex: 1 }}>$</Text>
                    <TextInput
                      value={fee}
                      onChangeText={onChange('consultation_fee', setFee)}
                      onFocus={() => setFocused('consultation_fee')}
                      onBlur={() => onBlur('consultation_fee')}
                      placeholder="50"
                      placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                      keyboardType="decimal-pad"
                      maxLength={8}
                      style={{ ...inputStyle('consultation_fee'), paddingLeft: 28 }}
                      accessibilityLabel="Precio de la consulta en dólares"
                    />
                  </View>
                </FormField>
              </View>
            </View>

            {/* Descripción */}
            <FormField
              label="Descripción profesional"
              required
              error={errors.bio}
              helper={`${bio.trim().length}/1000 · Cuéntale a las pacientes sobre tu experiencia y enfoque.`}
              textColor={textColor}
              subColor={subColor}
            >
              <TextInput
                value={bio}
                onChangeText={onChange('bio', setBio)}
                onFocus={() => setFocused('bio')}
                onBlur={() => onBlur('bio')}
                placeholder="Ej: Especialista en control prenatal con enfoque en embarazos de alto riesgo..."
                placeholderTextColor={isDark ? '#555' : '#9CA3AF'}
                multiline
                maxLength={1000}
                style={inputStyle('bio', true)}
                accessibilityLabel="Descripción profesional"
              />
            </FormField>

            {/* Error de envío */}
            {submitError && (
              <View style={{
                flexDirection: 'row', gap: 8, alignItems: 'center',
                backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 14,
                borderWidth: 1, borderColor: isDark ? '#7F1D1D' : '#FECACA',
              }}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#FCA5A5' : '#991B1B' }}>{submitError}</Text>
              </View>
            )}

            {/* Éxito */}
            {saved && (
              <View style={{
                flexDirection: 'row', gap: 8, alignItems: 'center',
                backgroundColor: isDark ? '#0D2E1F' : '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 14,
                borderWidth: 1, borderColor: isDark ? '#14532D' : '#BBF7D0',
              }}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: isDark ? '#6EE7B7' : '#065F46' }}>
                  ¡Perfil guardado! Ya puedes ser visible para las pacientes.
                </Text>
              </View>
            )}

            {/* Guardar */}
            <Pressable
              onPress={handleSubmit}
              disabled={saving || saved}
              style={({ pressed }) => ({
                backgroundColor: '#E8467C',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#C73E6B',
                opacity: saving || saved ? 0.5 : (pressed ? 0.85 : 1),
                shadowColor: '#E8467C',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: saving || saved ? 0 : 0.35,
                shadowRadius: 12,
                elevation: saving || saved ? 0 : 6,
              })}
              accessibilityRole="button"
              accessibilityLabel="Guardar perfil profesional"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8467C', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20 }}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color="#fff" />
                )}
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                  {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar perfil'}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ── Campo de formulario (label + error/helper) ──────────────────────────────────

function FormField({
  label, required, error, helper, children, textColor, subColor,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  helper?: string;
  children: React.ReactNode;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: textColor, marginBottom: 6 }}>
        {label}{required ? <Text style={{ color: '#E8467C' }}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <Ionicons name="alert-circle" size={13} color="#EF4444" />
          <Text style={{ flex: 1, fontSize: 12, color: '#EF4444' }}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={{ fontSize: 11, color: subColor, marginTop: 5, lineHeight: 15 }}>{helper}</Text>
      ) : null}
    </View>
  );
}
