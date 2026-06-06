import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isRealtimeConfigured } from '@/lib/supabase';
import { ChatMessage } from '@/lib/api';

const TYPING_TIMEOUT = 3000; // ms que dura "escribiendo…" sin nuevos pulsos
const TYPING_THROTTLE = 1500; // ms mínimos entre emisiones de "typing"

interface ChatRealtimeOptions {
  relationshipId: string | undefined;
  myUserId: string | undefined;
  onNewMessage: (msg: ChatMessage) => void;
  onMessageRead: (payload: { reader_id: string; read_at: string }) => void;
}

/**
 * Canal de Realtime de una conversación (`chat:<relationshipId>`).
 *
 * - Broadcast `new_message` / `message_read`: reenvía al screen vía callbacks.
 * - Broadcast `typing`: expone `otherTyping` con auto-reset.
 * - Presence: rastrea al usuario activo y expone `isOtherOnline`.
 *
 * Canal público (anon key); no toca tablas con RLS. Best-effort: si Realtime no
 * está configurado, el hook no hace nada y el chat sigue funcionando por REST.
 */
export function useChatRealtime({
  relationshipId,
  myUserId,
  onNewMessage,
  onMessageRead,
}: ChatRealtimeOptions) {
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageReadRef = useRef(onMessageRead);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  // Mantener callbacks frescos sin re-suscribir el canal.
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onMessageReadRef.current = onMessageRead; }, [onMessageRead]);

  useEffect(() => {
    if (!isRealtimeConfigured || !relationshipId || !myUserId) return;

    const channel = supabase.channel(`chat:${relationshipId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: myUserId },
      },
    });

    const computeOnline = () => {
      const state = channel.presenceState();
      const others = Object.keys(state).filter((k) => k !== myUserId);
      setIsOtherOnline(others.length > 0);
    };

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        onNewMessageRef.current(payload as ChatMessage);
      })
      .on('broadcast', { event: 'message_read' }, ({ payload }) => {
        onMessageReadRef.current(payload as { reader_id: string; read_at: string });
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const uid = (payload as { user_id?: string })?.user_id;
        if (uid && uid !== myUserId) {
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT);
        }
      })
      .on('presence', { event: 'sync' }, computeOnline)
      .on('presence', { event: 'join' }, computeOnline)
      .on('presence', { event: 'leave' }, computeOnline)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ user_id: myUserId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // Presencia ligada al ciclo de vida de la app: presente en foreground.
    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        channel.track({ user_id: myUserId, online_at: new Date().toISOString() });
      } else {
        channel.untrack();
      }
    });

    return () => {
      appSub.remove();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsOtherOnline(false);
      setOtherTyping(false);
    };
  }, [relationshipId, myUserId]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE) return;
    lastTypingSentRef.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: myUserId },
    });
  }, [myUserId]);

  return { isOtherOnline, otherTyping, sendTyping };
}

/**
 * Canal personal del usuario (`user:<myUserId>`). El backend emite
 * `conversation_bumped` cuando llega un mensaje nuevo en cualquier conversación,
 * para refrescar la lista sin tener que abrir el chat.
 */
export function useConversationsRealtime(
  myUserId: string | undefined,
  onBump: () => void,
) {
  const onBumpRef = useRef(onBump);
  useEffect(() => { onBumpRef.current = onBump; }, [onBump]);

  useEffect(() => {
    if (!isRealtimeConfigured || !myUserId) return;

    const channel = supabase
      .channel(`user:${myUserId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'conversation_bumped' }, () => onBumpRef.current())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myUserId]);
}
