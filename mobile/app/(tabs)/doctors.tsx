import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Directorio Médico
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Encuentra especialistas en Ginecobstetricia
          </Text>
        </View>

        {/* Search Bar Placeholder */}
        <View className="px-6 mb-6">
          <View className="bg-card-light dark:bg-card-dark rounded-xl p-4 border border-subtle-light dark:border-subtle-dark flex-row items-center">
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <Text className="text-neutral-400 dark:text-neutral-500">
              Buscar médicos cerca de ti...
            </Text>
          </View>
        </View>

        {/* Coming Soon */}
        <View className="flex-1 items-center justify-center px-6 py-20">
          <Ionicons name="medical" size={80} color="#E8467C" style={{ marginBottom: 16 }} />
          <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 text-center">
            Próximamente
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
            Aquí podrás buscar médicos, ver perfiles, ubicaciones en el mapa y agendar citas
          </Text>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
