<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envía notificaciones push FCM delegando a la Edge Function `send-push-notification`.
 *
 * Las credenciales Firebase viven como Supabase Secret (FIREBASE_CREDENTIALS_JSON),
 * nunca en el .env de Laravel. Laravel solo necesita SUPABASE_URL y SUPABASE_KEY.
 *
 * La Edge Function usa SubtleCrypto nativo de Deno (JWT RS256) para autenticarse
 * contra Google OAuth2 y llamar a la FCM v1 HTTP API.
 */
final class FcmService
{
    private string $edgeFunctionUrl;

    public function __construct()
    {
        $supabaseUrl = rtrim((string) config('services.supabase.url'), '/');
        $this->edgeFunctionUrl = "{$supabaseUrl}/functions/v1/send-push-notification";
    }

    /**
     * Envía una notificación a uno o varios tokens FCM.
     *
     * @param  string|string[]       $tokens  Token(s) FCM de destino
     * @param  string                $title   Título visible en la notificación
     * @param  string                $body    Cuerpo del mensaje
     * @param  array<string,string>  $data    Payload de datos extra (key-value strings)
     */
    public function send(
        string|array $tokens,
        string $title,
        string $body,
        array $data = [],
    ): void {
        $tokens = array_values(array_filter((array) $tokens));
        if ($tokens === []) {
            return;
        }

        try {
            $response = Http::withToken((string) config('services.supabase.key'))
                ->timeout(15)
                ->post($this->edgeFunctionUrl, [
                    'tokens' => $tokens,
                    'title'  => $title,
                    'body'   => $body,
                    'data'   => array_map('strval', $data),
                ]);

            if ($response->failed()) {
                Log::warning('FCM Edge Function returned error', [
                    'status'  => $response->status(),
                    'body'    => $response->json(),
                    'tokens'  => count($tokens),
                ]);
            }
        } catch (\Throwable $e) {
            // FCM falla de forma silenciosa — nunca interrumpe el flujo de negocio.
            Log::warning('FCM Edge Function call failed', [
                'error'  => $e->getMessage(),
                'tokens' => count($tokens),
            ]);
        }
    }
}
