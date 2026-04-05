import { Stack } from 'expo-router';
import { useEffectiveTheme } from '@/store/themeStore';

export default function AuthLayout() {
  const theme = useEffectiveTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme === 'dark' ? '#202020' : '#F3F3F3',
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
