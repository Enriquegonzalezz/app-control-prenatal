<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;

final class TestMailCommand extends Command
{
    protected $signature = 'mail:test {to? : Email destino (default: MAIL_FROM_ADDRESS)}';
    protected $description = 'Envía un email de prueba para verificar la configuración SMTP';

    public function handle(): int
    {
        $to = $this->argument('to') ?? config('mail.from.address');

        $this->info('Configuración actual:');
        $this->table(['Variable', 'Valor'], [
            ['MAIL_MAILER',       config('mail.default')],
            ['MAIL_HOST',         config('mail.mailers.smtp.host')],
            ['MAIL_PORT',         config('mail.mailers.smtp.port')],
            ['MAIL_SCHEME',       config('mail.mailers.smtp.scheme') ?? '(none)'],
            ['MAIL_USERNAME',     config('mail.mailers.smtp.username')],
            ['MAIL_PASSWORD',     str_repeat('*', strlen((string) config('mail.mailers.smtp.password'))) . ' (' . strlen((string) config('mail.mailers.smtp.password')) . ' chars)'],
            ['MAIL_FROM_ADDRESS', config('mail.from.address')],
            ['MAIL_EHLO_DOMAIN',  config('mail.mailers.smtp.local_domain') ?? '(none)'],
            ['OTP_EMAIL_TRANSPORT', env('OTP_EMAIL_TRANSPORT', '(not set)')],
        ]);

        $this->info("Enviando a: {$to} ...");

        try {
            Mail::html(
                '<h1>Test OK</h1><p>La configuración SMTP funciona correctamente en Railway.</p>',
                function (Message $message) use ($to): void {
                    $message->to($to)->subject('[Control Prenatal] Test SMTP — ' . now()->toDateTimeString());
                }
            );

            $this->info('✓ Email enviado correctamente.');
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('✗ Falló el envío:');
            $this->error($e->getMessage());
            $this->newLine();
            $this->line('<fg=yellow>Traza completa:</>');
            $this->line($e->getTraceAsString());
            return self::FAILURE;
        }
    }
}
