# Skill: Frontend React Native + NativeWind
**Archivo:** `.claude/skills/frontend-react-native.md`  
**Propósito:** Instrucciones para que Claude Code genere componentes React
Native siguiendo las convenciones de diseño y arquitectura de este proyecto.

---

## Stack y Versiones

- **Framework:** React Native con Expo (SDK 51+)
- **Styling:** NativeWind v4 (Tailwind CSS para RN)
- **Navegación:** Expo Router v3 (file-based routing)
- **Estado:** Zustand (authStore, themeStore, chatStore, searchStore)
- **Animaciones:** React Native Reanimated 3
- **Mapas:** react-native-maps
- **Gráficas:** victory-native
- **Cliente Supabase:** @supabase/supabase-js

---

## Sistema de Temas Dark/Light [Δ-3]

### Regla principal
**TODOS** los componentes deben tener variante dark. Sin excepción.

```tsx
// ✅ CORRECTO — siempre incluir dark:
<View className="bg-white dark:bg-slate-900 flex-1">
  <Text className="text-slate-800 dark:text-slate-200 text-base">
    Contenido
  </Text>
  <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
    <Text className="text-slate-600 dark:text-slate-400 text-sm">
      Subtexto
    </Text>
  </View>
</View>

// ❌ INCORRECTO — sin dark mode
<View style={{ backgroundColor: '#FFFFFF' }}>
  <Text style={{ color: '#1A3C5E' }}>Contenido</Text>
</View>
```

### Tokens Semánticos (usar SIEMPRE estos, nunca colores hardcoded)

| Token | Light | Dark | Clase NativeWind |
|-------|-------|------|-----------------|
| Fondo principal | `#FFFFFF` | `#0F172A` | `bg-white dark:bg-slate-900` |
| Superficie | `#F8FAFC` | `#1E293B` | `bg-slate-50 dark:bg-slate-800` |
| Superficie elevada | `#FFFFFF` | `#334155` | `bg-white dark:bg-slate-700` |
| Texto primario | `#1A3C5E` | `#E2E8F0` | `text-blue-900 dark:text-slate-200` |
| Texto secundario | `#666666` | `#94A3B8` | `text-gray-500 dark:text-slate-400` |
| Primario (brand) | `#1A3C5E` | `#5BA3D9` | `text-blue-900 dark:text-blue-400` |
| Accent teal | `#2E86AB` | `#5BC0DE` | usar `colors.ts` |
| Accent rosa | `#A23B72` | `#D4779B` | usar `colors.ts` |
| Borde | `#E2E8F0` | `#334155` | `border-slate-200 dark:border-slate-700` |
| Error | `#C0392B` | `#E74C3C` | `text-red-700 dark:text-red-500` |
| Éxito | `#2D8659` | `#52C41A` | `text-green-700 dark:text-green-500` |

---

## Estructura de Componentes

### Componente base con dark mode

```tsx
// src/shared/components/Card.tsx
import { View, Text } from 'react-native';

interface CardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Card({ title, subtitle, children }: CardProps) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm
                     border border-slate-100 dark:border-slate-700 mb-3">
      <Text className="text-slate-900 dark:text-slate-100 text-lg font-semibold mb-1">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-slate-500 dark:text-slate-400 text-sm mb-3">
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}
```

### Botón primario

```tsx
// src/shared/components/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ label, onPress, loading, variant = 'primary' }: ButtonProps) {
  const variants = {
    primary:   'bg-blue-900 dark:bg-blue-500 active:opacity-80',
    secondary: 'bg-slate-100 dark:bg-slate-700 active:opacity-80',
    ghost:     'bg-transparent active:opacity-60',
  };

  const textVariants = {
    primary:   'text-white dark:text-white font-semibold',
    secondary: 'text-slate-800 dark:text-slate-200 font-medium',
    ghost:     'text-blue-900 dark:text-blue-400 font-medium',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className={`${variants[variant]} rounded-xl py-4 px-6
                  items-center justify-center min-h-[48px]`}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : '#1A3C5E'} />
        : <Text className={textVariants[variant]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}
```

---

## Área Táctil Mínima

Todo elemento interactivo debe tener al menos `48dp` de área táctil
(requisito WCAG y del roadmap):

```tsx
// ✅ CORRECTO
<TouchableOpacity className="min-h-[48px] min-w-[48px] items-center justify-center">
  <Icon />
</TouchableOpacity>

// ❌ INCORRECTO — área táctil demasiado pequeña
<TouchableOpacity>
  <Icon size={16} />
</TouchableOpacity>
```

---

## Estructura de Carpetas (respetar SIEMPRE)

```
src/
├── app/                        ← Expo Router (file-based)
│   ├── (tabs)/
│   │   ├── index.tsx           ← Home
│   │   ├── search.tsx          ← Directorio
│   │   ├── history.tsx         ← Historial
│   │   ├── chat.tsx            ← Chat
│   │   └── profile.tsx         ← Perfil
│   └── (auth)/
│       ├── login.tsx
│       └── register.tsx
├── features/                   ← Una carpeta por dominio
│   ├── auth/
│   ├── directory/
│   ├── appointments/
│   ├── medical-history/
│   ├── chat/
│   ├── experiences/            ← [Δ-2] NUNCA llamar "ratings"
│   ├── clinic-panel/           ← [Δ-1]
│   └── profile/
├── shared/
│   ├── components/             ← Button, Card, Input, Badge, Avatar...
│   ├── hooks/                  ← useApi, useTheme, useSpecialty...
│   ├── services/               ← api.ts, supabase.ts, storage.ts
│   └── theme/                  ← colors.ts, darkMapStyle.ts
└── store/                      ← Zustand stores
    ├── authStore.ts
    ├── themeStore.ts
    ├── chatStore.ts
    └── searchStore.ts
```

---

## Hook useTheme

```tsx
// src/shared/hooks/useTheme.ts
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';

export function useTheme() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const preference = useThemeStore(s => s.preference);

  return {
    isDark: colorScheme === 'dark',
    colorScheme,
    toggleColorScheme,
    preference,
  };
}
```

---

## Mapa con Dark Style

```tsx
// src/features/directory/MapView.tsx
import MapView from 'react-native-maps';
import { darkMapStyle } from '@/shared/theme/darkMapStyle';
import { useTheme } from '@/shared/hooks/useTheme';

export function DoctorMapView() {
  const { isDark } = useTheme();

  return (
    <MapView
      className="flex-1"
      customMapStyle={isDark ? darkMapStyle : []}
      showsUserLocation
      showsMyLocationButton
    >
      {/* markers */}
    </MapView>
  );
}
```

---

## Skeleton Loaders

```tsx
// src/shared/components/DoctorCardSkeleton.tsx
import Animated, { useAnimatedStyle, withRepeat,
                    withTiming, useSharedValue } from 'react-native-reanimated';
import { useEffect } from 'react';

export function DoctorCardSkeleton() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animStyle}
      className="bg-slate-200 dark:bg-slate-700 rounded-2xl h-24 mb-3" />
  );
}
```

---

## Lo que NUNCA hacer en React Native

```tsx
// ❌ NUNCA — estrellas o rating en ningún componente
<StarRating value={doctor.rating} />
<Text>{doctor.rating_avg} ⭐</Text>
// ✅ CORRECTO
<Text>{doctor.experience_count} experiencias compartidas</Text>

// ❌ NUNCA — colores hardcoded
style={{ backgroundColor: '#1A3C5E' }}
// ✅ CORRECTO
className="bg-blue-900 dark:bg-blue-500"

// ❌ NUNCA — campo hardcoded de especialidad
if (specialty === 'ginecobstetricia') showGestationalWeeks();
// ✅ CORRECTO
const schema = useSpecialty(doctor.specialty_id);
renderDynamicFields(schema);

// ❌ NUNCA — componente sin dark mode
<View style={{ backgroundColor: 'white' }}>

// ❌ NUNCA — exposer service key en frontend
const supabase = createClient(url, SERVICE_KEY); // MAL
// ✅ CORRECTO — solo anon key en frontend
const supabase = createClient(url, ANON_KEY);
```
