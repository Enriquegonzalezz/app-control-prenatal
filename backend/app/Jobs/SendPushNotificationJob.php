<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\FcmService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Job que envía una notificación push FCM de forma asíncrona.
 * Se encola para no bloquear el request HTTP del usuario.
 *
 * Reintento automático: 3 intentos con backoff exponencial.
 * Si FCM no está configurado, el servicio loguea y retorna sin excepciones.
 */
final class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30; // segundos entre reintentos

    /**
     * @param  string[]              $tokens  Tokens FCM de destino
     * @param  array<string,string>  $data    Payload de datos extra
     */
    public function __construct(
        private readonly array $tokens,
        private readonly string $title,
        private readonly string $body,
        private readonly array $data = [],
    ) {}

    public function handle(FcmService $fcm): void
    {
        $fcm->send($this->tokens, $this->title, $this->body, $this->data);
    }
}
