import { useEffect, useRef, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { experienceApi, ExperienceTag } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';
import { brandColors } from '@/theme/colors';

// Paleta rosada de marca (coherente con el botón "Guardar perfil" y el resto de la app).
const PINK = {
  primary:     brandColors.primary, // #E8467C
  primaryDark: '#C73E6B',           // borde del botón primario (igual que guardar perfil)
  tintLight:   '#FDF2F8',           // fondo suave (modo claro)
  tintDark:    '#2A0E1A',           // fondo suave (modo oscuro)
  borderLight: '#FBCFE8',           // borde suave (modo claro)
  borderDark:  '#E8467C40',         // borde suave (modo oscuro)
  textLight:   '#BE185D',           // texto sobre tinte (modo claro)
  textDark:    '#F9A8D4',           // texto sobre tinte (modo oscuro)
};

type Privacy = 'full_name' | 'partial' | 'anonymous';

const PRIVACY_OPTIONS: { key: Privacy; label: string; desc: string; icon: string }[] = [
  { key: 'full_name',  label: 'Nombre completo', desc: 'Ej. María González',    icon: 'person' },
  { key: 'partial',   label: 'Nombre parcial',   desc: 'Ej. María G.',          icon: 'person-outline' },
  { key: 'anonymous', label: 'Anónimo',           desc: 'Paciente anónimo',      icon: 'glasses-outline' },
];

const MIN_CHARS = 50;
const MAX_CHARS = 1000;

function TagPill({
  tag, selected, onPress, isDark,
}: { tag: ExperienceTag; selected: boolean; onPress: () => void; isDark: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 15, paddingVertical: 10,
        borderRadius: 22, borderWidth: 1.5,
        backgroundColor: selected ? PINK.primary : (isDark ? '#1E1E1E' : '#FFFFFF'),
        borderColor: selected ? PINK.primary : (isDark ? '#3A3A3A' : '#E5E7EB'),
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons
          name="pricetag-outline"
          size={12}
          color={selected ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
        />
        <Text style={{
          fontSize: 12, fontWeight: '600',
          color: selected ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#374151'),
        }}>
          {tag.name}
        </Text>
      </View>
    </Pressable>
  );
}

export default function WriteExperienceScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const token = useAuthStore((s) => s.token);
  const params = useLocalSearchParams<{
    appointment_id: string;
    doctor_name: string;
    doctor_id: string;
  }>();

  const [tags, setTags] = useState<ExperienceTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('partial');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const bg = isDark ? '#141414' : '#F5F5F5';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#2D2D2D' : '#E5E7EB';

  useEffect(() => {
    experienceApi.listTags().then((res) => setTags(res.data ?? [])).catch(() => {});
  }, []);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!token || !params.appointment_id) return;
    const trimmed = body.trim();
    if (trimmed.length < MIN_CHARS) {
      setError(`La experiencia debe tener al menos ${MIN_CHARS} caracteres (${trimmed.length}/${MIN_CHARS}).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await experienceApi.create(token, {
        appointment_id: params.appointment_id,
        body: trimmed,
        privacy,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      setSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo publicar la experiencia. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const charCount = body.trim().length;
  const tooShort = charCount < MIN_CHARS;
  const charColor = charCount > MAX_CHARS ? '#EF4444' : charCount >= MIN_CHARS ? '#10B981' : '#9CA3AF';

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'bottom']}>
        <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, opacity: successOpacity, transform: [{ scale: successScale }] }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: PINK.tintLight, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="checkmark-circle" size={50} color={PINK.primary} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: textColor, textAlign: 'center', marginBottom: 10 }}>
            ¡Gracias por compartir!
          </Text>
          <Text style={{ fontSize: 14, color: subColor, textAlign: 'center', lineHeight: 21, marginBottom: 36 }}>
            Tu experiencia con {params.doctor_name} ha sido publicada y ayudará a otras pacientes.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              backgroundColor: PINK.primary, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 40,
              opacity: pressed ? 0.85 : 1,
              shadowColor: PINK.primary, shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4, shadowRadius: 18, elevation: 10,
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Volver a mis citas</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          accessibilityRole="button" accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>Mi experiencia</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Con {params.doctor_name}</Text>
        </View>
        <View style={{ backgroundColor: PINK.tintLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Ionicons name="star-half" size={16} color={PINK.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
      >
        {/* Intro card */}
        <View style={{ backgroundColor: isDark ? PINK.tintDark : PINK.tintLight, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: isDark ? PINK.borderDark : PINK.borderLight }}>
          <Text style={{ fontSize: 13, color: isDark ? PINK.textDark : PINK.textLight, lineHeight: 19 }}>
            Tu opinión ayuda a otras pacientes a elegir al especialista adecuado. No usamos estrellas — aquí lo que importa es tu experiencia real.
          </Text>
        </View>

        {/* ── Texto de la experiencia ── */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          Tu experiencia *
        </Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: borderColor, marginBottom: 4 }}>
          <TextInput
            multiline
            placeholder="Describe cómo fue tu consulta: puntualidad, trato, explicaciones, instalaciones... Todo cuenta."
            placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
            value={body}
            onChangeText={(t) => { if (t.length <= MAX_CHARS) { setBody(t); if (error) setError(null); } }}
            style={{
              padding: 16, fontSize: 14, color: textColor,
              minHeight: 140, textAlignVertical: 'top', lineHeight: 21,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 11, color: tooShort ? '#9CA3AF' : '#10B981' }}>
            {tooShort ? `Mínimo ${MIN_CHARS} caracteres` : 'Longitud correcta'}
          </Text>
          <Text style={{ fontSize: 11, color: charColor, fontWeight: '600' }}>
            {charCount}/{MAX_CHARS}
          </Text>
        </View>

        {/* ── Tags ── */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          ¿Qué destacas? (opcional)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              selected={selectedTagIds.includes(tag.id)}
              onPress={() => toggleTag(tag.id)}
              isDark={isDark}
            />
          ))}
        </View>

        {/* ── Privacidad ── */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          ¿Cómo aparecerá tu nombre?
        </Text>
        <View style={{ gap: 8, marginBottom: 28 }}>
          {PRIVACY_OPTIONS.map((opt) => {
            const isSelected = privacy === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPrivacy(opt.key)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: isSelected ? (isDark ? PINK.tintDark : PINK.tintLight) : cardBg,
                  borderRadius: 14, padding: 14, borderWidth: 1.5,
                  borderColor: isSelected ? PINK.primary : borderColor,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: isSelected ? PINK.primary : (isDark ? '#252525' : '#F3F4F6'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={opt.icon as any} size={16} color={isSelected ? '#fff' : subColor} />
                </View>
                {/* Nombre + ejemplo en flex: envuelve con gracia si no cabe en una línea */}
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? PINK.primary : textColor }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: subColor }}>{opt.desc}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={PINK.primary} />}
              </Pressable>
            );
          })}
        </View>

        {/* Error */}
        {error && (
          <View style={{
            backgroundColor: isDark ? '#2D0A0A' : '#FEF2F2',
            borderRadius: 12, padding: 12, marginBottom: 16,
            flexDirection: 'row', gap: 8, alignItems: 'flex-start',
            borderWidth: 1, borderColor: isDark ? '#EF444440' : '#FCA5A5',
          }}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 18 }}>{error}</Text>
          </View>
        )}

        {/* Submit — mismo patrón que el botón "Confirmar Cita" (doble fondo rosado) */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => ({
            backgroundColor: submitting ? '#9CA3AF' : '#E8467C',
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: submitting ? '#9CA3AF' : '#C73E6B',
            opacity: submitting ? 0.5 : (pressed ? 0.85 : 1),
            shadowColor: submitting ? 'transparent' : '#E8467C',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: submitting ? 0 : 0.35,
            shadowRadius: 12,
            elevation: submitting ? 0 : 6,
          })}
          accessibilityRole="button"
          accessibilityLabel="Publicar experiencia"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: submitting ? '#9CA3AF' : '#E8467C', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20 }}>
            <Ionicons name={submitting ? 'hourglass-outline' : 'paper-plane'} size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 }}>
              {submitting ? 'Publicando...' : 'Publicar experiencia'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
