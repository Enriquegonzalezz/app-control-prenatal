import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isLoading) {
        try {
          const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
          
          if (isAuthenticated) {
            router.replace('/(tabs)');
          } else if (!hasSeenOnboarding) {
            router.replace('/onboarding');
          } else {
            router.replace('/(auth)/login');
          }
        } catch (error) {
          console.error('Error checking onboarding:', error);
          router.replace('/(auth)/login');
        } finally {
          setCheckingOnboarding(false);
        }
      }
    };
    
    checkOnboarding();
  }, [isLoading, isAuthenticated]);
  
  if (isLoading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F3F3' }}>
        <ActivityIndicator size="large" color="#E8467C" />
      </View>
    );
  }
  
  return null;
}
