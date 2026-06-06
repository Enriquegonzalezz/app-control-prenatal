import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { FcmDeviceType } from '@/lib/api';

/**
 * Notificaciones push (FCM).
 *
 * El backend envía vía FCM v1 (Edge Function `send-push-notification`) usando el
 * **token nativo del dispositivo**. En Android, `getDevicePushTokenAsync()` devuelve
 * directamente el token FCM. Requiere un build de desarrollo/producción (NO Expo Go)
 * y `google-services.json` configurado en `app.json`.
 */

// Mostrar la notificación también cuando la app está en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Debe coincidir con `channel_id: "appointments"` que usa la Edge Function.
export const APPOINTMENTS_CHANNEL = 'appointments';

let lastDeviceToken: string | null = null;

export function getLastDeviceToken(): string | null {
  return lastDeviceToken;
}

function currentDeviceType(): FcmDeviceType {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(APPOINTMENTS_CHANNEL, {
    name: 'Citas',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E8467C',
    sound: 'default',
  });
}

/**
 * Pide permisos, configura el canal y obtiene el token nativo de push.
 * Devuelve `null` si no es un dispositivo físico, no hay permisos, o falla.
 */
export async function getPushToken(): Promise<{ token: string; deviceType: FcmDeviceType } | null> {
  // Push no funciona en simuladores/emuladores ni en web.
  if (!Device.isDevice || Platform.OS === 'web') return null;

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (!data) return null;
    lastDeviceToken = data;
    return { token: data, deviceType: currentDeviceType() };
  } catch {
    return null;
  }
}
