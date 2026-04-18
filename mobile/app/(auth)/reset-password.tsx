import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { passwordApi, ApiError } from '@/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setFieldErrors({});

    if (!code.trim()) {
      setError('Ingresa el código de verificación');
      return;
    }

    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    if (!password) {
      setError('Ingresa tu nueva contraseña');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await passwordApi.resetPassword(
        email || '',
        code.trim(),
        password,
        confirmPassword
      );
      
      // Mostrar éxito y redirigir a login
      router.replace({
        pathname: '/(auth)/login',
        params: { resetSuccess: 'true' },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError('Error de conexión. Verifica tu red.');
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
          {/* Header */}
          <View className="flex-row items-center mt-4 mb-8">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-card-light dark:bg-card-dark items-center justify-center mr-3"
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="arrow-back" size={20} color="#E8467C" />
            </Pressable>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Nueva Contraseña
            </Text>
          </View>

          {/* Icon */}
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 items-center justify-center mb-4">
              <Ionicons name="key-outline" size={36} color="#E8467C" />
            </View>
            <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center">
              Ingresa el código que recibiste en {email}
            </Text>
          </View>

          {/* Form */}
          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm mb-6">
            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                <Text className="text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Código */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Código de Verificación <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 text-center text-2xl tracking-widest font-mono"
                editable={!loading}
              />
              {fieldErrors.code && (
                <Text className="text-red-500 text-xs mt-1">
                  {fieldErrors.code[0]}
                </Text>
              )}
            </View>

            {/* Nueva contraseña */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Nueva Contraseña <Text className="text-red-500">*</Text>
              </Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 pr-12 text-neutral-900 dark:text-neutral-100"
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
              {fieldErrors.password && (
                <Text className="text-red-500 text-xs mt-1">
                  {fieldErrors.password[0]}
                </Text>
              )}
            </View>

            {/* Confirmar contraseña */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Confirmar Contraseña <Text className="text-red-500">*</Text>
              </Text>
              <View className="relative">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 pr-12 text-neutral-900 dark:text-neutral-100"
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-3"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Cambiar Contraseña
                </Text>
              )}
            </Pressable>
          </View>

          {/* Resend code */}
          <Pressable
            onPress={() => router.back()}
            className="py-3"
            accessibilityRole="button"
          >
            <Text className="text-brand-500 text-center font-medium">
              ¿No recibiste el código? Reenviar
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
