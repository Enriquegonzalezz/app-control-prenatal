import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { directoryApi, NearbyDoctor } from '@/lib/api';
import { useEffectiveTheme } from '@/store/themeStore';

function formatDistance(meters: number | null): string | null {
  if (meters === null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatFee(fee: number | null): string {
  if (!fee) return 'Consultar';
  return `$${fee.toFixed(0)}`;
}

function SkeletonCard({ isDark }: { isDark: boolean }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const bg = isDark ? '#2A2A2A' : '#E5E7EB';
  return (
    <Animated.View style={{ opacity: anim, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: bg, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <View style={{ height: 14, backgroundColor: bg, borderRadius: 7, width: '70%', marginBottom: 8 }} />
          <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '45%' }} />
        </View>
      </View>
      <View style={{ height: 11, backgroundColor: bg, borderRadius: 6, width: '55%', marginBottom: 10 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ height: 26, backgroundColor: bg, borderRadius: 13, width: 64 }} />
        <View style={{ height: 26, backgroundColor: bg, borderRadius: 13, width: 56 }} />
      </View>
    </Animated.View>
  );
}

function DoctorCard({ doctor, isDark }: { doctor: NearbyDoctor; isDark: boolean }) {
  const initials = doctor.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const dist = formatDistance(doctor.distance_m);
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const border = isDark ? '#2D2D2D' : '#F3F4F6';

  return (
    <Pressable
      style={{ backgroundColor: cardBg, borderRadius: 16, marginHorizontal: 16, marginBottom: 10, padding: 16, borderWidth: 1, borderColor: border }}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${doctor.full_name}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8467C18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#E8467C' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', flex: 1 }} numberOfLines={1}>
              {doctor.full_name}
            </Text>
            {doctor.is_verified === false && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#D97706' }}>PENDIENTE</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>
            {doctor.specialty.name}
          </Text>
        </View>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: doctor.is_available ? '#10B981' : '#D1D5DB' }} />
      </View>

      {(doctor.clinic.name && doctor.clinic.name !== 'Sin clínica') ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="business-outline" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }} numberOfLines={1}>
            {doctor.clinic.name}{doctor.branch.name ? ` · ${doctor.branch.name}` : ''}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {dist && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Ionicons name="location-outline" size={11} color="#3B82F6" style={{ marginRight: 3 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#3B82F6' }}>{dist}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#3D1A2B' : '#FFF0F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
          <Ionicons name="cash-outline" size={11} color="#E8467C" style={{ marginRight: 3 }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#E8467C' }}>{formatFee(doctor.consultation_fee)}</Text>
        </View>
        {doctor.years_experience > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#252525' : '#F9FAFB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Ionicons name="ribbon-outline" size={11} color="#6B7280" style={{ marginRight: 3 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>{doctor.years_experience}a exp.</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <View style={{ backgroundColor: '#E8467C', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Ver perfil</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function DoctorsScreen() {
  const theme = useEffectiveTheme();
  const isDark = theme === 'dark';

  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [hasGps, setHasGps] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 1️⃣ Cargar primera página o refrescar
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setApiError(null);
    try {
      const res = await directoryApi.listDoctors({ per_page: 20, page: 1 });
      setDoctors(res.data?.doctors ?? []);
      setCurrentPage(res.data?.pagination.current_page ?? 1);
      setLastPage(res.data?.pagination.last_page ?? 1);
      setTotal(res.data?.pagination.total ?? 0);
    } catch {
      setApiError('No se pudo conectar al servidor. Verifica tu red.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 2️⃣ Cargar siguiente página (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || currentPage >= lastPage) return;
    setLoadingMore(true);
    try {
      const res = await directoryApi.listDoctors({ per_page: 20, page: currentPage + 1 });
      setDoctors((prev) => [...prev, ...(res.data?.doctors ?? [])]);
      setCurrentPage(res.data?.pagination.current_page ?? currentPage);
      setLastPage(res.data?.pagination.last_page ?? lastPage);
    } catch {
      // Silenciar errores en loadMore para no interrumpir UX
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, lastPage, loadingMore]);

  // 3️⃣ GPS como mejora: enriquece distancias y reordena por cercanía
  const enrichWithGps = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const res = await directoryApi.nearbyDoctors({ lat: latitude, lng: longitude, radius_m: 50000, limit: 50 });
      const nearbyMap = new Map((res.data?.doctors ?? []).map((d) => [d.doctor_profile_id, d]));
      setDoctors((prev) =>
        prev.map((d) => {
          const nearby = nearbyMap.get(d.doctor_profile_id);
          return nearby ? { ...d, distance_m: nearby.distance_m } : d;
        })
      );
      setHasGps(true);
    } catch { /* GPS opcional */ }
  }, []);

  useEffect(() => {
    loadAll();
    enrichWithGps();
  }, [loadAll, enrichWithGps]);

  const filtered = doctors.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      q === '' ||
      d.full_name.toLowerCase().includes(q) ||
      d.specialty.name.toLowerCase().includes(q) ||
      d.clinic.name.toLowerCase().includes(q);
    // Por defecto solo disponibles; "Ver todos" quita el filtro
    const matchAvail = showAll || d.is_available;
    return matchSearch && matchAvail;
  });

  // Ordenar: GPS (distancia) cuando disponible, si no alfabético
  const sorted = hasGps
    ? [...filtered].sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity))
    : filtered;

  const inputBg     = isDark ? '#2A2A2A' : '#FFFFFF';
  const inputBorder = isDark ? '#3A3A3A' : '#E5E7EB';
  const inputText   = isDark ? '#F9FAFB' : '#111827';
  const placeholder = isDark ? '#6B7280' : '#9CA3AF';
  const surfaceBg   = isDark ? '#111111' : '#F5F5F5';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surfaceBg }} edges={['top']}>
      {/* Header + search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#F3F4F6' : '#111827' }}>Médicos</Text>
          {hasGps && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1C2A23' : '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Ionicons name="locate" size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>Cercanos primero</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
          {loading ? 'Cargando directorio...' : `${sorted.length} médico${sorted.length !== 1 ? 's' : ''} disponible${sorted.length !== 1 ? 's' : ''}`}
        </Text>

        {/* Search bar */}
        <View style={{ backgroundColor: inputBg, borderColor: inputBorder, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, marginBottom: 10 }}>
          <Ionicons name="search" size={16} color={placeholder} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, especialidad..."
            placeholderTextColor={placeholder}
            style={{ flex: 1, fontSize: 14, color: inputText }}
            returnKeyType="search"
            accessibilityLabel="Buscar médicos"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={placeholder} />
            </Pressable>
          )}
        </View>

        {/* Filter chip */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setShowAll(false)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: !showAll ? '#10B981' : (isDark ? '#2A2A2A' : '#F3F3F3'), borderWidth: 1, borderColor: !showAll ? '#10B981' : (isDark ? '#3A3A3A' : '#E5E7EB'), gap: 4 }}
            accessibilityRole="radio"
          >
            <Ionicons name="checkmark-circle" size={13} color={!showAll ? '#fff' : '#9CA3AF'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: !showAll ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280') }}>Disponibles</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowAll(true)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: showAll ? '#E8467C' : (isDark ? '#2A2A2A' : '#F3F3F3'), borderWidth: 1, borderColor: showAll ? '#E8467C' : (isDark ? '#3A3A3A' : '#E5E7EB'), gap: 4 }}
            accessibilityRole="radio"
          >
            <Ionicons name="people" size={13} color={showAll ? '#fff' : '#9CA3AF'} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: showAll ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280') }}>Ver todos</Text>
          </Pressable>
        </View>
      </View>

      {/* API error */}
      {apiError && !loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', textAlign: 'center', marginBottom: 8 }}>Error de conexión</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>{apiError}</Text>
          <Pressable onPress={() => loadAll()} style={{ backgroundColor: '#E8467C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* List */}
      {!apiError && (
        <FlatList
          data={loading ? [] : sorted}
          keyExtractor={(item) => item.doctor_profile_id}
          renderItem={({ item }) => <DoctorCard doctor={item} isDark={isDark} />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadAll(true).then(() => enrichWithGps()); }}
              tintColor="#E8467C"
            />
          }
          ListHeaderComponent={
            loading ? (
              <View>
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} isDark={isDark} />)}
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C', opacity: 0.6 }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C', opacity: 0.8 }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8467C' }} />
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Cargando más...</Text>
              </View>
            ) : currentPage >= lastPage && doctors.length > 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {total} médico{total !== 1 ? 's' : ''} en total
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
                <Ionicons name="person-outline" size={48} color="#E8467C" style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F3F4F6' : '#111827', textAlign: 'center' }}>Sin resultados</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>
                  {search ? 'Prueba con otro nombre o especialidad' : 'No hay médicos registrados aún'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
