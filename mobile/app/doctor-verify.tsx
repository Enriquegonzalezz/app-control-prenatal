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
import { verificationApi, authApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function DoctorVerifyScreen() {
  const router = useRouter();
  const { token, setAuth, user } = useAuthStore();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const handleRequestCode = async () => {
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const res = await verificationApi.requestCode(token);
      setExpiresAt(res.data.expires_at);
      setStep('verify');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión. Verifica tu red.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!token) return;
    setError('');

    if (!code.trim() || code.length !== 6) {
      setError('Ingresa el código de 6 dígitos que recibiste');
      return;
    }

    setLoading(true);
    try {
      await verificationApi.verifyCode(token, code.trim());
      // Refresh user profile so doctor_profile.is_verified updates
      const profile = await authApi.getProfile(token);
      setAuth(profile.data, token);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión. Verifica tu red.');
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
              Verificación Médico
            </Text>
          </View>

          {/* Icon + descripción */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 items-center justify-center mb-4">
              <Ionicons name="shield-checkmark-outline" size={38} color="#E8467C" />
            </View>
            {step === 'request' ? (
              <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center leading-6">
                Te enviaremos un código de verificación al correo registrado en el MPPS para confirmar tu identidad como médico.
              </Text>
            ) : (
              <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center leading-6">
                Ingresa el código de 6 dígitos que enviamos a tu correo registrado.
                {expiresAt ? `\nVence: ${new Date(expiresAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
            )}
          </View>

          {/* Card */}
          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm">
            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {step === 'request' ? (
              <Pressable
                onPress={handleRequestCode}
                disabled={loading}
                className="bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center"
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Enviar código por correo</Text>
                )}
              </Pressable>
            ) : (
              <>
                <View className="mb-5">
                  <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Código de verificación <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 text-center text-2xl tracking-widest font-mono"
                    editable={!loading}
                  />
                </View>

                <Pressable
                  onPress={handleVerifyCode}
                  disabled={loading}
                  className="bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center mb-3"
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">Verificar cuenta</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => { setCode(''); setError(''); setStep('request'); }}
                  className="py-2 items-center"
                  accessibilityRole="button"
                >
                  <Text className="text-brand-500 text-sm font-medium">¿No recibiste el código? Reenviar</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
