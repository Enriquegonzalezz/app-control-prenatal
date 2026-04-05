import { Stack } from 'expo-router';
import { useEffectiveTheme } from '@/store/themeStore';

export default function TabsLayout() {
  const theme = useEffectiveTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme === 'dark' ? '#202020' : '#F3F3F3',
        },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
