import '../global.css';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { useAuthStore } from '@/store/authStore';
import { useEffectiveTheme } from '@/store/themeStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useEffectiveTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const segments = useSegments();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.log('Init auth error:', error);
      } finally {
        setAppReady(true);
        SplashScreen.hideAsync();
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(
      theme === 'dark' ? '#202020' : '#F3F3F3',
    );
  }, [theme]);

  useEffect(() => {
    if (!appReady || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, appReady]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F3F3' }}>
        <ActivityIndicator size="large" color="#E8467C" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#E8467C' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
      className={theme === 'dark' ? 'dark' : ''}
    >
      <SafeAreaProvider>
        <Slot />
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
