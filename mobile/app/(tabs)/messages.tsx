import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Mensajes
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Chatea con tus médicos
          </Text>
        </View>

        {/* Coming Soon */}
        <View className="flex-1 items-center justify-center px-6 py-20">
          <Ionicons name="chatbubbles" size={80} color="#E8467C" style={{ marginBottom: 16 }} />
          <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 text-center">
            Próximamente
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
            Aquí podrás chatear en tiempo real con tus médicos, enviar fotos de exámenes y recibir orientación
          </Text>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
