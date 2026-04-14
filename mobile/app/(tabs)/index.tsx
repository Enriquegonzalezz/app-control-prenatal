import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mr-2">
              Hola, {user?.name?.split(' ')[0] || 'Usuario'}
            </Text>
            <Ionicons name="hand-left" size={24} color="#E8467C" />
          </View>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {isPatient ? 'Tu salud prenatal en control' : isDoctor ? 'Panel de médico' : 'Bienvenida'}
          </Text>
        </View>

        {/* Next Appointment Card */}
        {isPatient && (
          <View className="px-6 mb-6">
            <View className="bg-brand-500 rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white font-semibold text-base">Próxima Cita</Text>
                <Ionicons name="calendar" size={20} color="rgba(255,255,255,0.8)" />
              </View>
              <Text className="text-white text-lg font-bold mb-1">Dr. María González</Text>
              <Text className="text-white/90 text-sm mb-2">Ginecobstetricia</Text>
              <View className="flex-row items-center flex-wrap">
                <View className="flex-row items-center mr-3">
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 text-xs ml-1">Clínica Central</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time" size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 text-xs ml-1">Lunes 15, 10:00 AM</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Accesos Rápidos
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <Pressable
              onPress={() => router.push('/(tabs)/doctors')}
              className="bg-card-light dark:bg-card-dark rounded-2xl p-4 flex-1 min-w-[45%] active:opacity-70"
              accessibilityRole="button"
            >
              <Ionicons name="search" size={28} color="#E8467C" style={{ marginBottom: 8 }} />
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Buscar Médico
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Encuentra especialistas
              </Text>
            </Pressable>

            <Pressable
              className="bg-card-light dark:bg-card-dark rounded-2xl p-4 flex-1 min-w-[45%] active:opacity-70"
              accessibilityRole="button"
            >
              <Ionicons name="document-text" size={28} color="#E8467C" style={{ marginBottom: 8 }} />
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Mi Historial
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Ver consultas
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/messages')}
              className="bg-card-light dark:bg-card-dark rounded-2xl p-4 flex-1 min-w-[45%] active:opacity-70"
              accessibilityRole="button"
            >
              <Ionicons name="chatbubbles" size={28} color="#E8467C" style={{ marginBottom: 8 }} />
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Mensajes
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Chatea con médicos
              </Text>
            </Pressable>

            <Pressable
              className="bg-card-light dark:bg-card-dark rounded-2xl p-4 flex-1 min-w-[45%] active:opacity-70"
              accessibilityRole="button"
            >
              <Ionicons name="notifications" size={28} color="#E8467C" style={{ marginBottom: 8 }} />
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Recordatorios
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Medicamentos y citas
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Health Tips */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Tips de Salud Prenatal
          </Text>
          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-4 mb-3">
            <View className="flex-row items-start">
              <Ionicons name="water" size={24} color="#3B82F6" style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  Hidratación
                </Text>
                <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                  Bebe al menos 8 vasos de agua al día para mantenerte hidratada
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-card-light dark:bg-card-dark rounded-2xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="nutrition" size={24} color="#10B981" style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  Alimentación Balanceada
                </Text>
                <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                  Incluye frutas, verduras y proteínas en cada comida
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
