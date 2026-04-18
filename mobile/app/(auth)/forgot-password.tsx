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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { passwordApi, ApiError } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError('');
    setDebugCode(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido');
      return;
    }

    setLoading(true);
    try {
      const res = await passwordApi.requestReset(email.trim().toLowerCase());
      setSuccess(true);
      // Mostrar código en modo debug
      if (res.data?.debug_code) {
        setDebugCode(res.data.debug_code);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error de conexión. Verifica tu red.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(auth)/reset-password',
      params: { email: email.trim().toLowerCase() },
    });
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
              Recuperar Contraseña
            </Text>
          </View>

          {!success ? (
            <>
              {/* Icon */}
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 items-center justify-center mb-4">
                  <Ionicons name="lock-closed-outline" size={36} color="#E8467C" />
                </View>
                <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center">
                  Ingresa tu email y te enviaremos un código de verificación
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

                <View className="mb-4">
                  <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100"
                    editable={!loading}
                  />
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
                      Enviar Código
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Success state */}
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Código Enviado
                </Text>
                <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center mb-4">
                  Hemos enviado un código de verificación a:
                </Text>
                <Text className="text-base font-semibold text-brand-500 mb-6">
                  {email}
                </Text>

                {/* Debug code display */}
                {debugCode && (
                  <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 w-full">
                    <Text className="text-xs text-yellow-700 dark:text-yellow-400 text-center mb-2">
                      🔧 Modo Debug - Código de prueba:
                    </Text>
                    <Text className="text-2xl font-bold text-yellow-900 dark:text-yellow-300 text-center tracking-widest">
                      {debugCode}
                    </Text>
                  </View>
                )}

                <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
                  Revisa tu bandeja de entrada y spam. El código expira en 15 minutos.
                </Text>
              </View>

              <Pressable
                onPress={handleContinue}
                className="bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center mb-4"
                accessibilityRole="button"
              >
                <Text className="text-white font-semibold text-base">
                  Continuar
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSuccess(false)}
                className="py-3"
                accessibilityRole="button"
              >
                <Text className="text-brand-500 text-center font-medium">
                  Cambiar email
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
