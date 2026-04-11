import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore, useEffectiveTheme } from '@/store/themeStore';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useEffectiveTheme();
  const { mode, setMode } = useThemeStore();

  const cycleTheme = () => {
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-brand-500 mb-2">
          Control Prenatal
        </Text>
        <Text className="text-base text-neutral-600 dark:text-neutral-400 mb-2 text-center">
          {user ? `Bienvenida, ${user.name}` : 'Bienvenida'}
        </Text>
        {user?.role && (
          <Text className="text-sm text-neutral-500 dark:text-neutral-500 mb-8 text-center">
            Rol: {user.role === 'patient' ? 'Paciente' : user.role === 'doctor' ? 'Médico' : 'Admin'}
          </Text>
        )}

        <Pressable
          onPress={cycleTheme}
          className="bg-brand-500 active:bg-brand-600 rounded-xl px-8 py-4 mb-4 w-full max-w-sm"
          accessibilityLabel="Cambiar tema"
          accessibilityRole="button"
        >
          <Text className="text-white font-semibold text-base text-center">
            {`Tema: ${mode === 'light' ? '☀️ Claro' : mode === 'dark' ? '🌙 Oscuro' : '⚙️ Sistema'}`}
          </Text>
        </Pressable>

        <Pressable
          onPress={logout}
          className="border-2 border-brand-500 rounded-xl px-8 py-4 w-full max-w-sm active:opacity-70"
          accessibilityLabel="Cerrar sesión"
          accessibilityRole="button"
        >
          <Text className="text-brand-500 font-semibold text-base text-center">
            Cerrar Sesión
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
