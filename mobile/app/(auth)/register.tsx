import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';
import { authApi, ApiError } from '@/lib/api';
import { colors } from '@/theme/colors';

type PasswordRule = { label: string; test: (p: string) => boolean };

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mínimo 8 caracteres',        test: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula',         test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula',         test: (p) => /[a-z]/.test(p) },
  { label: 'Un número',                   test: (p) => /[0-9]/.test(p) },
  { label: 'Un carácter especial (!@#$…)',test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: passed,  label: 'Muy débil', color: '#EF4444' };
  if (passed === 2) return { score: passed, label: 'Débil',     color: '#F97316' };
  if (passed === 3) return { score: passed, label: 'Media',     color: '#F59E0B' };
  if (passed === 4) return { score: passed, label: 'Fuerte',    color: '#22C55E' };
  return              { score: passed,      label: 'Muy fuerte', color: '#10B981' };
}

function PasswordStrengthIndicator({ password, isDark }: { password: string; isDark: boolean }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <View className="mt-2">
      {/* Progress bar */}
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {PASSWORD_RULES.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: i < score ? color : (isDark ? '#374151' : '#E5E7EB'),
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      {/* Rule list */}
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <View key={rule.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 }}>
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={13}
              color={ok ? '#22C55E' : (isDark ? '#6B7280' : '#9CA3AF')}
            />
            <Text style={{ fontSize: 11, color: ok ? (isDark ? '#86EFAC' : '#16A34A') : (isDark ? '#6B7280' : '#9CA3AF') }}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const c = colors[theme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');

  const handleCedulaChange = (text: string) => {
    setCedula(text.toUpperCase());
  };
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    setError('');
    setFieldErrors({});

    if (!name.trim() || !email.trim() || !cedula.trim() || !password || !confirmPassword) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const failedRules = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failedRules.length > 0) {
      setError(`Contraseña insegura: ${failedRules[0].label.toLowerCase()}`);
      return;
    }

    if (!cedula.trim().toUpperCase().startsWith('V')) {
      setError('La cédula debe comenzar con la letra V');
      return;
    }

    if (cedula.trim().length > 9) {
      setError('La cédula debe tener máximo 9 caracteres (V + 8 dígitos)');
      return;
    }

    const cedulaWithoutV = cedula.trim().toUpperCase().slice(1);
    if (!/^\d+$/.test(cedulaWithoutV) || cedulaWithoutV.length === 0) {
      setError('La cédula debe tener el formato V seguido de dígitos (ej: V12345678)');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        cedula: cedula.trim(),
        phone: phone.trim() || undefined,
        password,
        password_confirmation: confirmPassword,
      });
      setAuth(res.data.user, res.data.token);
      // La redirección se maneja automáticamente por el authStore y index.tsx
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError('Error de conexión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          <Animated.View 
            className="items-center mt-8 mb-8"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text className="text-3xl font-bold text-brand-500">
              Crear Cuenta
            </Text>
            <Text className="text-sm mt-2 text-neutral-500 dark:text-neutral-400 text-center">
              Tu rol se detecta automáticamente por tu cédula
            </Text>
          </Animated.View>

          <Animated.View 
            className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm mb-6"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                <Text className="text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Nombre Completo <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="María García"
                placeholderTextColor={c.placeholder}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                className="bg-surface-light dark:bg-surface-dark border border-subtle-light dark:border-subtle-dark rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-100"
                accessibilityLabel="Nombre completo"
              />
              {fieldErrors.name ? (
                <Text className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</Text>
              ) : null}
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Cédula <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={cedula}
                onChangeText={handleCedulaChange}
                placeholder="V12345678"
                placeholderTextColor={c.placeholder}
                autoCapitalize="characters"
                maxLength={9}
                className="bg-surface-light dark:bg-surface-dark border border-subtle-light dark:border-subtle-dark rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-100"
                accessibilityLabel="Cédula de identidad"
              />
              <Text className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Si eres médico verificado, se detectará automáticamente
              </Text>
              {fieldErrors.cedula ? (
                <Text className="text-red-500 text-xs mt-1">{fieldErrors.cedula[0]}</Text>
              ) : null}
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Correo Electrónico <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={c.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                className="bg-surface-light dark:bg-surface-dark border border-subtle-light dark:border-subtle-dark rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-100"
                accessibilityLabel="Correo electrónico"
              />
              {fieldErrors.email ? (
                <Text className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</Text>
              ) : null}
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Teléfono <Text className="text-neutral-400 text-xs">(opcional)</Text>
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+58 412 1234567"
                placeholderTextColor={c.placeholder}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                className="bg-surface-light dark:bg-surface-dark border border-subtle-light dark:border-subtle-dark rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-100"
                accessibilityLabel="Teléfono"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Contraseña <Text className="text-red-500">*</Text>
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={c.placeholder}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  className="bg-surface-light dark:bg-surface-dark border border-subtle-light dark:border-subtle-dark rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-100 pr-16"
                  accessibilityLabel="Contraseña"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-0 bottom-0 justify-center px-2"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  accessibilityRole="button"
                >
                  <Text className="text-brand-500 text-sm font-medium">
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </Text>
                </Pressable>
              </View>
              <PasswordStrengthIndicator password={password} isDark={isDark} />
              {fieldErrors.password ? (
                <Text className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</Text>
              ) : null}
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Confirmar Contraseña <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                placeholderTextColor={c.placeholder}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                className="bg-surface-light dark:bg-surface-dark border border-subtle-light dark:border-subtle-dark rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-100"
                accessibilityLabel="Confirmar contraseña"
              />
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              className={`bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center ${loading ? 'opacity-50' : ''}`}
              accessibilityLabel="Crear cuenta"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Crear Cuenta
                </Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View 
            className="flex-row justify-center mb-8"
            style={{ opacity: fadeAnim }}
          >
            <Text className="text-neutral-500 dark:text-neutral-400 text-sm">
              ¿Ya tienes cuenta?{' '}
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="link"
            >
              <Text className="text-brand-500 font-semibold text-sm">
                Inicia Sesión
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
