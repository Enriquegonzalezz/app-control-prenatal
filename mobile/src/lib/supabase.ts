import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Cliente Supabase usado EXCLUSIVAMENTE para Realtime (Broadcast + Presence).
 *
 * La autenticación de la app es vía Laravel Sanctum; aquí no hay sesión de
 * Supabase Auth, por eso se desactiva la persistencia/refresh de sesión.
 * Los canales que usamos son públicos (topic = UUID), de modo que la anon key
 * es suficiente y no se accede a tablas con RLS.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export const isRealtimeConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
