import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { directoryApi, NearbyDoctor } from '@/lib/api';
import { useEffectiveTheme } from '@/store/themeStore';

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
];

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatFee(fee: number | null): string {
  if (!fee) return 'Consultar';
  return `$${fee.toFixed(0)}`;
}

function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={{ opacity: anim }} className="bg-card-light dark:bg-card-dark rounded-2xl mx-6 mb-4 p-4 border border-subtle-light dark:border-subtle-dark">
      <View className="flex-row items-center mb-3">
        <View className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-700 mr-3" />
        <View className="flex-1">
          <View className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-3/4 mb-2" />
          <View className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md w-1/2" />
        </View>
        <View className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </View>
      <View className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md w-2/3 mb-3" />
      <View className="flex-row gap-2">
        <View className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded-full w-16" />
        <View className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded-full w-14" />
        <View className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded-full w-20" />
      </View>
    </Animated.View>
  );
}

function DoctorCard({ doctor }: { doctor: NearbyDoctor }) {
  const initials = doctor.full_name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Pressable
      className="bg-card-light dark:bg-card-dark rounded-2xl mx-6 mb-4 p-4 border border-subtle-light dark:border-subtle-dark active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${doctor.full_name}`}
    >
      {/* Top row: avatar + name + availability dot */}
      <View className="flex-row items-center mb-3">
        <View className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 items-center justify-center mr-3 overflow-hidden">
          {doctor.avatar_url ? (
            <Image
              source={{ uri: doctor.avatar_url }}
              className="w-14 h-14"
              accessibilityLabel={`Foto de ${doctor.full_name}`}
            />
          ) : (
            <Text className="text-brand font-bold text-lg">{initials}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-100" numberOfLines={1}>
            {doctor.full_name}
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {doctor.specialty.name}
          </Text>
        </View>
        <View
          className={`w-3 h-3 rounded-full ${doctor.is_available ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
          accessibilityLabel={doctor.is_available ? 'Disponible' : 'No disponible'}
        />
      </View>

      {/* Clinic + branch */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="business-outline" size={13} color="#9CA3AF" style={{ marginRight: 4 }} />
        <Text className="text-xs text-neutral-500 dark:text-neutral-400 flex-1" numberOfLines={1}>
          {doctor.clinic.name}
          {doctor.branch.name ? ` · ${doctor.branch.name}` : ''}
        </Text>
      </View>

      {/* Badges row */}
      <View className="flex-row items-center gap-2 mb-4">
        <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
          <Ionicons name="location-outline" size={12} color="#3B82F6" style={{ marginRight: 3 }} />
          <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {formatDistance(doctor.distance_m)}
          </Text>
        </View>
        <View className="flex-row items-center bg-pink-50 dark:bg-pink-900/20 px-3 py-1.5 rounded-full">
          <Ionicons name="cash-outline" size={12} color="#E8467C" style={{ marginRight: 3 }} />
          <Text className="text-xs font-semibold text-brand">
            {formatFee(doctor.consultation_fee)}
          </Text>
        </View>
        <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
          <Ionicons name="ribbon-outline" size={12} color="#6B7280" style={{ marginRight: 3 }} />
          <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {doctor.years_experience}a exp.
          </Text>
        </View>
      </View>

      {/* Next slot + CTA */}
      <View className="flex-row items-center justify-between">
        {doctor.next_available_slot ? (
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={13} color="#10B981" style={{ marginRight: 4 }} />
            <Text className="text-xs text-emerald-600 dark:text-emerald-400">
              Próx. disponible hoy
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View className="bg-brand px-4 py-2 rounded-full">
          <Text className="text-xs font-bold text-white">Ver perfil</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function DoctorsScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';

  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(5000);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchDoctors = useCallback(async (lat: number, lng: number, selectedRadius: number) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await directoryApi.nearbyDoctors({ lat, lng, radius_m: selectedRadius, limit: 50 });
      setDoctors(res.data?.doctors ?? []);
    } catch {
      setApiError('No se pudo conectar al servidor. Verifica tu red.');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setLocationError(null);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Activa el permiso de ubicación para encontrar médicos cerca de ti.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lng: longitude });
      await fetchDoctors(latitude, longitude, radius);
    } catch {
      setLocationError('No se pudo obtener tu ubicación. Inténtalo de nuevo.');
      setLoading(false);
    }
  }, [radius, fetchDoctors]);

  useEffect(() => {
    requestLocation();
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (coords) fetchDoctors(coords.lat, coords.lng, newRadius);
  };

  const filtered = doctors.filter((d) => {
    const matchSearch =
      search === '' ||
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.clinic.name.toLowerCase().includes(search.toLowerCase()) ||
      d.branch.address?.toLowerCase().includes(search.toLowerCase());
    const matchAvailable = !onlyAvailable || d.is_available;
    return matchSearch && matchAvailable;
  });

  const inputBg = isDark ? '#2A2A2A' : '#FFFFFF';
  const inputBorder = isDark ? '#3A3A3A' : '#E5E7EB';
  const inputText = isDark ? '#F9FAFB' : '#111827';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

  return (
    <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
      {/* ── Sticky header + filters ── */}
      <View className="px-6 pt-5 pb-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Médicos
          </Text>
          {coords && !loading && (
            <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
              <Ionicons name="locate" size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Ubicado</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Especialistas en Ginecobstetricia cerca de ti
        </Text>

        {/* Search bar */}
        <View
          style={{ backgroundColor: inputBg, borderColor: inputBorder, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 48, marginBottom: 12 }}
        >
          <Ionicons name="search" size={18} color={placeholderColor} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o clínica..."
            placeholderTextColor={placeholderColor}
            style={{ flex: 1, fontSize: 14, color: inputText, height: 48 }}
            returnKeyType="search"
            accessibilityLabel="Buscar médicos"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={placeholderColor} />
            </Pressable>
          )}
        </View>

        {/* Radius chips */}
        <View className="flex-row gap-2 mb-1">
          {RADIUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => handleRadiusChange(opt.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: radius === opt.value ? '#E8467C' : (isDark ? '#2A2A2A' : '#F3F3F3'),
                borderWidth: 1,
                borderColor: radius === opt.value ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'),
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: radius === opt.value }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: radius === opt.value ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280'),
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setOnlyAvailable(!onlyAvailable)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: onlyAvailable ? '#10B981' : (isDark ? '#2A2A2A' : '#F3F3F3'),
              borderWidth: 1,
              borderColor: onlyAvailable ? '#10B981' : (isDark ? '#3A3A3A' : '#E5E7EB'),
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: onlyAvailable }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: onlyAvailable ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280'),
              }}
            >
              Disponibles
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Location error state ── */}
      {locationError && !loading && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-5">
            <Ionicons name="location-outline" size={36} color="#E8467C" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 text-center mb-2">
            Ubicación no disponible
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
            {locationError}
          </Text>
          <Pressable
            onPress={requestLocation}
            className="bg-brand px-8 py-3 rounded-full active:opacity-80"
            accessibilityRole="button"
          >
            <Text className="text-white font-bold">Activar ubicación</Text>
          </Pressable>
        </View>
      )}

      {/* ── API error state ── */}
      {apiError && !loading && !locationError && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center mb-5">
            <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 text-center mb-2">
            Error de conexión
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
            {apiError}
          </Text>
          {coords && (
            <Pressable
              onPress={() => fetchDoctors(coords.lat, coords.lng, radius)}
              className="bg-brand px-8 py-3 rounded-full active:opacity-80"
              accessibilityRole="button"
            >
              <Text className="text-white font-bold">Reintentar</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Skeleton loading ── */}
      {loading && (
        <View className="flex-1 pt-2">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      )}

      {/* ── Results list ── */}
      {!loading && !locationError && !apiError && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.doctor_profile_id}
          renderItem={({ item }) => <DoctorCard doctor={item} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            doctors.length > 0 ? (
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 px-6 mb-3">
                {filtered.length} médico{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-20">
              <View className="w-20 h-20 rounded-full bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-5">
                <Ionicons name="person-outline" size={36} color="#E8467C" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100 text-center mb-2">
                Sin resultados
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                {search
                  ? 'Prueba con otro nombre o amplía el radio de búsqueda'
                  : 'No hay médicos disponibles en este radio. Amplía la distancia.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
