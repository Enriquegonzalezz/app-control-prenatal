import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doctorProfileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const { mode, setMode } = useThemeStore();

  // Completitud del perfil profesional (solo médicos) — controla visibilidad ante pacientes
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const loadProfileStatus = useCallback(async () => {
    if (!token || user?.role !== 'doctor') return;
    try {
      const res = await doctorProfileApi.get(token);
      setProfileComplete(res.data?.doctor_profile?.is_profile_complete ?? false);
    } catch {
      // silencioso: no bloquea el perfil
    }
  }, [token, user?.role]);

  // Refresca al volver de la pantalla de edición
  useFocusEffect(useCallback(() => { loadProfileStatus(); }, [loadProfileStatus]));

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Mi Perfil
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tu cuenta y preferencias
          </Text>
        </View>

        {/* Aviso: perfil profesional incompleto (solo médicos) */}
        {user?.role === 'doctor' && profileComplete === false && (
          <View className="px-6 mb-5">
            <Pressable
              onPress={() => router.push('/doctor-profile-edit')}
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Completar perfil profesional"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/40 items-center justify-center mr-3">
                  <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    Completa tu perfil profesional
                  </Text>
                  <Text className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-4">
                    Aún no eres visible para las pacientes. Agrega tus datos para poder recibir citas.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
              </View>
            </Pressable>
          </View>
        )}

        {/* User Info Card */}
        <View className="px-6 mb-6">
          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-5">
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-brand-500 items-center justify-center mb-3">
                <Text className="text-white text-3xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {user?.name || 'Usuario'}
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {user?.email}
              </Text>
              {user?.role && (
                <View className="bg-brand-100 dark:bg-brand-900/30 px-3 py-1 rounded-full mt-2">
                  <Text className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {user.role === 'patient' ? 'Paciente' : user.role === 'doctor' ? 'Médico' : 'Admin'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Herramientas del médico */}
        {user?.role === 'doctor' && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Mi Práctica
            </Text>

            {/* Perfil profesional */}
            <Pressable
              onPress={() => router.push('/doctor-profile-edit')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Editar perfil profesional"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="person-circle-outline" size={20} color="#E8467C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Perfil Profesional</Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Experiencia, precio y descripción</Text>
                  </View>
                </View>
                {profileComplete === true ? (
                  <View className="bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full mr-1">
                    <Text className="text-[11px] font-bold text-green-700 dark:text-green-400">Completo</Text>
                  </View>
                ) : profileComplete === false ? (
                  <View className="bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full mr-1">
                    <Text className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Incompleto</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/appointments')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Ver agenda de citas"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-3">
                    <Ionicons name="calendar" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Agenda de Citas</Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Ver, confirmar y completar</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/messages')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Mensajes con pacientes"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="chatbubbles" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mensajes</Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Conversaciones con pacientes</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/patients-records')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Historial de mis pacientes"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="people-outline" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Historial de Pacientes</Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Documentos compartidos por paciente</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/medical-history')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Mi historial médico personal"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="documents-outline" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mi Historial Médico</Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Tus documentos y registros personales</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>
          </View>
        )}

        {/* Historial Médico — solo pacientes */}
        {user?.role === 'patient' && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Mi Salud
            </Text>
            <Pressable
              onPress={() => router.push('/medical-history')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Ver historial médico"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="documents-outline" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Historial Médico
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Exámenes, consultas y archivos
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/appointments')}
              className="bg-card-light dark:bg-card-dark rounded-xl p-4 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Ver mis citas"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-3">
                    <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Mis Citas
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Reservadas, activas y canceladas
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>
          </View>
        )}

        {/* Settings */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Configuración
          </Text>

          {/* Theme Toggle */}
          <Pressable
            onPress={cycleTheme}
            className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
            accessibilityRole="button"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons 
                  name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'settings'} 
                  size={24} 
                  color="#E8467C" 
                  style={{ marginRight: 12 }} 
                />
                <View>
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Tema
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {mode === 'light' ? 'Claro' : mode === 'dark' ? 'Oscuro' : 'Sistema'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          {/* Notifications */}
          <Pressable
            className="bg-card-light dark:bg-card-dark rounded-xl p-4 mb-3 active:opacity-70"
            accessibilityRole="button"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="notifications" size={24} color="#E8467C" style={{ marginRight: 12 }} />
                <View>
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Notificaciones
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Gestiona tus alertas
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          {/* Privacy */}
          <Pressable
            className="bg-card-light dark:bg-card-dark rounded-xl p-4 active:opacity-70"
            accessibilityRole="button"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="lock-closed" size={24} color="#E8467C" style={{ marginRight: 12 }} />
                <View>
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Privacidad
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Seguridad y datos
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        </View>

        {/* Logout Button */}
        <View className="px-6 mb-6">
          <Pressable
            onPress={logout}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 active:opacity-70"
            accessibilityRole="button"
          >
            <Text className="text-red-600 dark:text-red-400 font-semibold text-center">
              Cerrar Sesión
            </Text>
          </Pressable>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
