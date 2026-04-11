import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';
import { authApi, ApiError } from '@/lib/api';
import { colors } from '@/theme/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useEffectiveTheme();
  const c = colors[theme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

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

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
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
          <View className="items-center mt-8 mb-8">
            <Text className="text-3xl font-bold text-brand-500">
              Crear Cuenta
            </Text>
            <Text className="text-sm mt-2 text-neutral-500 dark:text-neutral-400 text-center">
              Tu rol se detecta automáticamente por tu cédula
            </Text>
          </View>

          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm mb-6">
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
                onChangeText={setCedula}
                placeholder="V12345678"
                placeholderTextColor={c.placeholder}
                autoCapitalize="characters"
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
          </View>

          <View className="flex-row justify-center mb-8">
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
