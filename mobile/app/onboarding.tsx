import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Control Prenatal Inteligente',
    description: 'Gestiona tu embarazo de forma segura con seguimiento médico profesional',
    emoji: '🤰',
    color: '#E8467C',
  },
  {
    id: '2',
    title: 'Conecta con Médicos',
    description: 'Accede a médicos verificados y especialistas en salud prenatal',
    emoji: '👨‍⚕️',
    color: '#8B5CF6',
  },
  {
    id: '3',
    title: 'Historial Completo',
    description: 'Mantén un registro detallado de consultas, exámenes y evolución',
    emoji: '📋',
    color: '#3B82F6',
  },
  {
    id: '4',
    title: 'Recordatorios y Citas',
    description: 'Nunca olvides una cita o medicamento con notificaciones inteligentes',
    emoji: '🔔',
    color: '#10B981',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/login');
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <View className="absolute top-4 right-4 z-10">
          <Pressable
            onPress={handleSkip}
            className="px-4 py-2"
            accessibilityRole="button"
            accessibilityLabel="Saltar introducción"
          >
            <Text className="text-brand-500 font-semibold">Saltar</Text>
          </Pressable>
        </View>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {slides.map((item, index) => (
          <View
            key={item.id}
            style={{ width }}
            className="flex-1 items-center justify-center px-8"
          >
            <View
              style={{ backgroundColor: item.color }}
              className="w-32 h-32 rounded-full items-center justify-center mb-8"
            >
              <Text className="text-6xl">{item.emoji}</Text>
            </View>
            <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 text-center mb-4">
              {item.title}
            </Text>
            <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center leading-6">
              {item.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Section */}
      <View className="px-8 pb-8">
        {/* Pagination */}
        <View className="flex-row justify-center items-center mb-8">
          {slides.map((_, index) => (
            <View
              key={index}
              className="h-2 rounded-full bg-brand-500 mx-1"
              style={{
                width: currentIndex === index ? 24 : 8,
                opacity: currentIndex === index ? 1 : 0.3,
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          className="bg-brand-500 active:bg-brand-600 rounded-xl py-4 items-center"
          accessibilityRole="button"
          accessibilityLabel={currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
        >
          <Text className="text-white font-semibold text-base">
            {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
