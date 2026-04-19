import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { mode, setMode } = useThemeStore();

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
