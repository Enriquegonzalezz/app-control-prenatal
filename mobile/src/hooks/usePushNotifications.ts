import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { fcmTokenApi } from '@/lib/api';
import { getPushToken } from '@/lib/push';

/**
 * Registra el token push del dispositivo cuando el usuario está autenticado y
 * maneja la navegación al tocar una notificación. Se monta una vez en el layout raíz.
 */
export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Registrar el token FCM con el backend al autenticarse.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let cancelled = false;

    (async () => {
      const result = await getPushToken();
      if (cancelled || !result) return;
      try {
        await fcmTokenApi.register(token, result.token, result.deviceType);
      } catch {
        /* best-effort: si falla, se reintenta al próximo arranque */
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, token]);

  // Al tocar una notificación de cita, llevar a la pantalla de citas.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string } | undefined;
      if (typeof data?.type === 'string' && data.type.startsWith('appointment_')) {
        router.push('/appointments');
      }
    });
    return () => sub.remove();
  }, []);
}
