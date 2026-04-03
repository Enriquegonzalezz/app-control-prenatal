<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

final class SendVerificationCodeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Reintentos en caso de fallo (p.ej. servidor de correo caído).
     */
    public int $tries = 3;

    /**
     * Espera 60 segundos entre reintentos.
     */
    public int $backoff = 60;

    /**
     * @param string $code        Código OTP en texto plano (6 dígitos).
     * @param string $channel     Canal de envío: 'email' | 'sms'.
     * @param string $destination Destino real sin enmascarar.
     * @param string $doctorName  Nombre completo del médico para personalizar.
     */
    public function __construct(
        private readonly string $code,
        private readonly string $channel,
        private readonly string $destination,
        private readonly string $doctorName,
    ) {}

    public function handle(): void
    {
        match ($this->channel) {
            'email' => $this->sendEmail(),
            'sms'   => $this->sendSms(),
            default => throw new \InvalidArgumentException("Canal no soportado: {$this->channel}"),
        };
    }

    private function sendEmail(): void
    {
        Mail::raw(
            $this->buildEmailText(),
            fn ($message) => $message
                ->to($this->destination)
                ->subject('Código de verificación médica — Control Prenatal')
        );
    }

    private function sendSms(): void
    {
        // TODO: Integrar proveedor SMS (Twilio, AWS SNS, etc.)
        // Ejemplo con Twilio:
        // $twilio = new \Twilio\Rest\Client(config('services.twilio.sid'), config('services.twilio.token'));
        // $twilio->messages->create($this->destination, [
        //     'from' => config('services.twilio.from'),
        //     'body' => "Tu código de verificación es: {$this->code}. Expira en 15 minutos.",
        // ]);
        Log::warning('SendVerificationCodeJob: canal SMS no configurado.', [
            'destination' => substr($this->destination, 0, 4) . '***',
            'channel'     => 'sms',
        ]);
    }

    private function buildEmailText(): string
    {
        return <<<TEXT
        Hola, Dr(a). {$this->doctorName}:

        Tu código de verificación médica es:

            {$this->code}

        Este código expira en 15 minutos.

        Si no solicitaste este código, ignora este mensaje.

        — Equipo Control Prenatal
        TEXT;
    }
}
