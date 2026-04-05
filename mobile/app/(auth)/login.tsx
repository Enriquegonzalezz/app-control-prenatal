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

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useEffectiveTheme();
  const c = colors[theme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setFieldErrors({});

    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
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
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-full bg-brand-500 items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">CP</Text>
            </View>
            <Text className="text-3xl font-bold text-brand-500">
              Control Prenatal
            </Text>
            <Text className="text-base mt-2 text-neutral-500 dark:text-neutral-400">
              Bienvenida de vuelta
            </Text>
          </View>

          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm">
            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                <Text className="text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Correo Electrónico
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
                <Text className="text-red-500 text-xs mt-1">
                  {fieldErrors.email[0]}
                </Text>
              ) : null}
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Contraseña
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={c.placeholder}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
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
                <Text className="text-red-500 text-xs mt-1">
                  {fieldErrors.password[0]}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className={`bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center ${loading ? 'opacity-50' : ''}`}
              accessibilityLabel="Iniciar sesión"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Iniciar Sesión
                </Text>
              )}
            </Pressable>
          </View>

          <View className="flex-row justify-center mt-6 mb-8">
            <Text className="text-neutral-500 dark:text-neutral-400 text-sm">
              ¿No tienes cuenta?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              accessibilityRole="link"
            >
              <Text className="text-brand-500 font-semibold text-sm">
                Regístrate
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
