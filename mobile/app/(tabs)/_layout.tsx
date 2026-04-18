import { Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffectiveTheme } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';

export default function TabsLayout() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';
  const role = useAuthStore((s) => s.user?.role);
  const isDoctor = role === 'doctor';
  const tabHomeTitle = isDoctor ? 'Agenda' : 'Inicio';

  const TabBarButton = (props: any) => {
    const focused = props.accessibilityState?.selected;
    
    return (
      <Pressable
        {...props}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? (isDark ? '#2A2A2A' : '#F3F3F3') : 'transparent',
          borderRadius: 12,
          marginHorizontal: 4,
          paddingVertical: 4,
          transition: 'all 0.2s ease',
        }}
      >
        {props.children}
      </Pressable>
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8467C',
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 16,
          marginHorizontal: 20,
          height: Platform.OS === 'ios' ? 70 : 60,
          borderRadius: 15,
          paddingBottom: Platform.OS === 'ios' ? 8 : 8,
          paddingTop: 8,
          paddingLeft: 8,
          paddingRight: 8,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tabHomeTitle,
          tabBarButton: (props) => <TabBarButton {...props} focused={props.accessibilityState?.selected} />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? (isDoctor ? 'calendar' : 'home') : (isDoctor ? 'calendar-outline' : 'home-outline')} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: isDoctor ? 'Directorio' : 'Médicos',
          tabBarButton: (props) => <TabBarButton {...props} focused={props.accessibilityState?.selected} />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? (isDoctor ? 'people' : 'medical') : (isDoctor ? 'people-outline' : 'medical-outline')} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensajes',
          tabBarButton: (props) => <TabBarButton {...props} focused={props.accessibilityState?.selected} />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarButton: (props) => <TabBarButton {...props} focused={props.accessibilityState?.selected} />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
