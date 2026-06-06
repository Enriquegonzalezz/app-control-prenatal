<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Emite eventos a Supabase Realtime vía el endpoint REST de Broadcast.
 *
 * No usamos `postgres_changes`: los mensajes están cifrados en BD y la app móvil
 * se autentica con Sanctum (sin JWT de Supabase), por lo que RLS bloquearía la
 * escucha directa. En su lugar, tras persistir en Laravel, empujamos el payload
 * ya descifrado a un canal público de Broadcast (topic = UUID de la relación).
 *
 * Es best-effort: si Supabase falla, se loguea pero NUNCA se rompe la petición
 * principal (el dato ya quedó guardado en la BD; el realtime es una mejora de UX).
 */
final class SupabaseRealtimeService
{
    /**
     * Envía un evento de Broadcast a un canal público de Supabase Realtime.
     *
     * @param string               $topic   Nombre del canal (ej. "chat:<relationship_id>").
     * @param string               $event   Nombre del evento (ej. "new_message").
     * @param array<string, mixed> $payload Datos a entregar a los suscriptores.
     */
    public function broadcast(string $topic, string $event, array $payload): void
    {
        $url = rtrim((string) config('services.supabase.url'), '/') . '/realtime/v1/api/broadcast';
        $key = (string) config('services.supabase.key');

        if ($url === '/realtime/v1/api/broadcast' || $key === '') {
            Log::warning('SupabaseRealtime: faltan SUPABASE_URL o SUPABASE_KEY; broadcast omitido.', [
                'topic' => $topic,
                'event' => $event,
            ]);

            return;
        }

        try {
            $response = Http::withHeaders([
                'apikey'        => $key,
                'Authorization' => 'Bearer ' . $key,
                'Content-Type'  => 'application/json',
            ])->timeout(5)->post($url, [
                'messages' => [
                    [
                        'topic'   => $topic,
                        'event'   => $event,
                        'payload' => $payload,
                        'private' => false,
                    ],
                ],
            ]);

            if (! $response->successful()) {
                Log::warning('SupabaseRealtime: broadcast no exitoso.', [
                    'topic'  => $topic,
                    'event'  => $event,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('SupabaseRealtime: excepción al emitir broadcast.', [
                'topic'   => $topic,
                'event'   => $event,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
