<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class SendVerificationCodeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Reintentos en caso de fallo (p.ej. Edge Function no disponible).
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
        $url = rtrim((string) env('SUPABASE_URL'), '/') . '/functions/v1/resend-email';

        $response = Http::withToken((string) env('SUPABASE_KEY'))
            ->post($url, [
                'to'      => $this->destination,
                'subject' => 'Código de verificación médica — Control Prenatal',
                'html'    => $this->buildEmailHtml(),
                'text'    => $this->buildEmailText(),
            ]);

        if (! $response->successful()) {
            Log::error('SendVerificationCodeJob: Edge Function resend-email falló.', [
                'status'      => $response->status(),
                'body'        => $response->json(),
                'destination' => substr($this->destination, 0, 3) . '***',
            ]);

            throw new \RuntimeException(
                "Error al enviar email via Edge Function: HTTP {$response->status()}"
            );
        }

        Log::info('SendVerificationCodeJob: email enviado via Resend.', [
            'resend_id'   => $response->json('id'),
            'destination' => substr($this->destination, 0, 3) . '***',
        ]);
    }

    private function sendSms(): void
    {
        // TODO: Integrar proveedor SMS (Twilio, AWS SNS, etc.)
        Log::warning('SendVerificationCodeJob: canal SMS no configurado.', [
            'destination' => substr($this->destination, 0, 4) . '***',
            'channel'     => 'sms',
        ]);
    }

    private function buildEmailHtml(): string
    {
        $name = htmlspecialchars($this->doctorName, ENT_QUOTES, 'UTF-8');
        $code = htmlspecialchars($this->code, ENT_QUOTES, 'UTF-8');

        return <<<HTML
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de verificación médica</title>
        </head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:#0f172a;padding:28px 40px;text-align:center;">
                      <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Control Prenatal</p>
                      <h1 style="margin:6px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Verificación Médica</h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 40px;">
                      <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hola, <strong>Dr(a). {$name}</strong>:</p>
                      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                        Recibimos una solicitud para verificar tu cuenta como médico en la plataforma.
                        Usa el código a continuación para completar tu verificación.
                      </p>
                      <!-- OTP Box -->
                      <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px;">
                        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Tu código</p>
                        <p style="margin:0;color:#0f172a;font-size:40px;font-weight:700;letter-spacing:12px;">{$code}</p>
                      </div>
                      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                        ⏱ Este código expira en <strong>15 minutos</strong>.
                      </p>
                      <p style="margin:0;color:#64748b;font-size:13px;">
                        Si no solicitaste este código, ignora este mensaje.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                      <p style="margin:0;color:#94a3b8;font-size:12px;">
                        Equipo Control Prenatal — Universidad José Antonio Páez
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        HTML;
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
