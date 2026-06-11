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
  const isDark = mode === 'dark';

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
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#141414' : '#F0F4F8' }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#F9FAFB' : '#0F172A' }}>
            Mi Perfil
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 4 }}>
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
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20 }}>
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-brand-500 items-center justify-center mb-3">
                <Text className="text-white text-3xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                {user?.name || 'Usuario'}
              </Text>
              <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 4 }}>
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
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A', marginBottom: 16 }}>
              Mi Práctica
            </Text>

            {/* Perfil profesional */}
            <Pressable
              onPress={() => router.push('/doctor-profile-edit')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil profesional"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="person-circle-outline" size={20} color="#E8467C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>Perfil Profesional</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>Experiencia, precio y descripción</Text>
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

            {/* Experiencias recibidas */}
            <Pressable
              onPress={() => router.push('/doctor-experiences')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Ver experiencias recibidas de pacientes"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="ribbon-outline" size={20} color="#E8467C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>Experiencias de Pacientes</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>Lo que opinan quienes te visitaron</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/appointments')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Ver agenda de citas"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-3">
                    <Ionicons name="calendar" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>Agenda de Citas</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>Ver, confirmar y completar</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/messages')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Mensajes con pacientes"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="chatbubbles" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>Mensajes</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>Conversaciones con pacientes</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/patients-records')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Historial de mis pacientes"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="people-outline" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>Historial de Pacientes</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>Documentos compartidos por paciente</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/medical-history')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Mi historial médico personal"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="documents-outline" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>Mi Historial Médico</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>Tus documentos y registros personales</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>
          </View>
        )}

        {/* Historial Médico — solo pacientes */}
        {user?.role === 'patient' && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A', marginBottom: 16 }}>
              Mi Salud
            </Text>
            <Pressable
              onPress={() => router.push('/medical-history')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Ver historial médico"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Ionicons name="documents-outline" size={20} color="#E8467C" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                      Historial Médico
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>
                      Exámenes, consultas y archivos
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/appointments')}
              style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Ver mis citas"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-3">
                    <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                      Mis Citas
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>
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
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A', marginBottom: 16 }}>
            Configuración
          </Text>

          {/* Theme Toggle */}
          <Pressable
            onPress={cycleTheme}
            style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}
            accessibilityRole="button"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons 
                  name={mode === 'light' ? 'sunny' : 'moon'} 
                  size={24} 
                  color="#E8467C" 
                  style={{ marginRight: 12 }} 
                />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                    Tema
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>
                    {mode === 'light' ? 'Claro' : 'Oscuro'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          {/* Terms */}
          <Pressable
            onPress={() => router.push('/terms')}
            style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 12, padding: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Ver términos y condiciones"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="document-text" size={24} color="#E8467C" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#0F172A' }}>
                    Términos y Condiciones
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B', marginTop: 2 }}>
                    Uso de la plataforma
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
