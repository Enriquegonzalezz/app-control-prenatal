<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\VerificationStatus;
use App\Jobs\SendVerificationCodeJob;
use App\Models\DoctorVerificationCode;
use App\Models\User;
use App\Models\VerifiedDoctor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class DoctorVerificationService
{
    private const MAX_DAILY_CODES   = 5;
    private const COOLDOWN_SECONDS  = 60;
    private const EXPIRY_MINUTES    = 15;
    private const MAX_ATTEMPTS      = 3;

    /**
     * Solicita un nuevo código OTP para el médico autenticado.
     *
     * El código se envía al canal oficial de `verified_doctors` (NO al email de registro).
     * Se hashea con bcrypt antes de almacenar.
     *
     * @return array{channel: string, destination: string, expires_in: int}
     *
     * @throws \RuntimeException Si el médico ya está verificado, no existe en la tabla maestra,
     *                           superó el rate limit o está en período de cooldown.
     */
    public function requestCode(User $user, string $ipAddress = '', string $userAgent = ''): array
    {
        // 1. Verificar que el médico no esté ya verificado
        if ($user->doctorProfile?->is_verified) {
            throw new \RuntimeException('Tu cuenta ya está verificada. No necesitas un código.');
        }

        // 2. Obtener registro en la tabla maestra por cédula
        $verifiedDoctor = VerifiedDoctor::where('cedula', $user->cedula)
            ->where('is_active', true)
            ->first();

        if (! $verifiedDoctor) {
            throw new \RuntimeException(
                'No se encontró información de verificación para tu cédula. Contacta al administrador.'
            );
        }

        // 3. Rate limiting: máximo MAX_DAILY_CODES solicitudes por día
        $todayCount = DoctorVerificationCode::where('user_id', $user->id)
            ->whereDate('created_at', today())
            ->count();

        if ($todayCount >= self::MAX_DAILY_CODES) {
            throw new \RuntimeException(
                'Has alcanzado el límite diario de solicitudes de código. Intenta nuevamente mañana.'
            );
        }

        // 4. Cooldown: esperar COOLDOWN_SECONDS segundos desde la última solicitud
        $lastCode = DoctorVerificationCode::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->first();

        if ($lastCode) {
            $elapsed   = (int) $lastCode->created_at->diffInSeconds(now());
            $remaining = self::COOLDOWN_SECONDS - $elapsed;

            if ($remaining > 0) {
                throw new \RuntimeException(
                    "Debe esperar {$remaining} segundos antes de solicitar otro código."
                );
            }
        }

        // 5. Determinar canal de envío (email preferido sobre SMS)
        [$channel, $realDestination, $maskedDestination] = $this->resolveChannel($verifiedDoctor);

        // 6. Invalidar códigos anteriores activos
        DoctorVerificationCode::where('user_id', $user->id)
            ->whereIn('status', [
                VerificationStatus::CODE_SENT->value,
                VerificationStatus::PENDING->value,
            ])
            ->update(['status' => VerificationStatus::EXPIRED->value]);

        // 7. Generar OTP de 6 dígitos (con padding de ceros)
        $plainCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // 8. Almacenar hasheado con bcrypt
        DoctorVerificationCode::create([
            'user_id'            => $user->id,
            'verified_doctor_id' => $verifiedDoctor->id,
            'code'               => Hash::make($plainCode),
            'channel'            => $channel,
            'destination'        => $maskedDestination,   // Enmascarado en DB (audit)
            'status'             => VerificationStatus::CODE_SENT->value,
            'attempts'           => 0,
            'max_attempts'       => self::MAX_ATTEMPTS,
            'expires_at'         => now()->addMinutes(self::EXPIRY_MINUTES),
            'ip_address'         => $ipAddress ?: null,
            'user_agent'         => $userAgent ?: null,
        ]);

        // 9. Despachar job (envía al destino REAL, no al enmascarado)
        SendVerificationCodeJob::dispatch(
            $plainCode,
            $channel,
            $realDestination,
            "{$verifiedDoctor->first_name} {$verifiedDoctor->last_name}"
        );

        return [
            'channel'     => $channel,
            'destination' => $maskedDestination,
            'expires_in'  => self::EXPIRY_MINUTES * 60,
        ];
    }

    /**
     * Verifica el código OTP ingresado por el médico.
     *
     * Si es correcto: marca is_verified = true en doctor_profiles y el código como 'verified'.
     * Si es incorrecto: incrementa intentos; si agota todos → status = 'failed'.
     *
     * @throws \RuntimeException Si no hay código activo, se superaron los intentos o el código es inválido.
     */
    public function verifyCode(User $user, string $inputCode): bool
    {
        $record = DoctorVerificationCode::where('user_id', $user->id)
            ->where('status', VerificationStatus::CODE_SENT->value)
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->first();

        if (! $record) {
            throw new \RuntimeException(
                'No hay un código activo o ha expirado. Solicita uno nuevo.'
            );
        }

        if (! $record->hasAttemptsLeft()) {
            throw new \RuntimeException(
                'Has excedido el número de intentos permitidos. Solicita un nuevo código.'
            );
        }

        // Verificar hash
        if (! Hash::check($inputCode, $record->code)) {
            $record->increment('attempts');
            $record->refresh();

            if ($record->attempts >= $record->max_attempts) {
                $record->update(['status' => VerificationStatus::FAILED->value]);
                throw new \RuntimeException(
                    'Código incorrecto. Has agotado todos los intentos. Solicita un nuevo código.'
                );
            }

            $remaining = $record->max_attempts - $record->attempts;
            throw new \RuntimeException(
                "Código incorrecto. Te quedan {$remaining} " . ($remaining === 1 ? 'intento' : 'intentos') . '.'
            );
        }

        // Código válido: actualizar en una transacción atómica
        DB::transaction(function () use ($record, $user): void {
            $record->update([
                'status'      => VerificationStatus::VERIFIED->value,
                'verified_at' => now(),
            ]);

            $user->doctorProfile()->update(['is_verified' => true]);
        });

        return true;
    }

    /**
     * Retorna el estado actual de verificación del médico.
     *
     * @return array{is_verified: bool, status: string, pending_code: bool, ...}
     */
    public function getStatus(User $user): array
    {
        $profile = $user->doctorProfile;

        if ($profile?->is_verified) {
            return [
                'is_verified'  => true,
                'status'       => VerificationStatus::VERIFIED->value,
                'pending_code' => false,
            ];
        }

        $activeCode = DoctorVerificationCode::where('user_id', $user->id)
            ->where('status', VerificationStatus::CODE_SENT->value)
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->first();

        return [
            'is_verified'   => false,
            'status'        => $activeCode
                ? VerificationStatus::CODE_SENT->value
                : VerificationStatus::PENDING->value,
            'pending_code'  => (bool) $activeCode,
            'channel'       => $activeCode?->channel,
            'destination'   => $activeCode?->destination,
            'expires_at'    => $activeCode?->expires_at,
            'attempts_left' => $activeCode
                ? ($activeCode->max_attempts - $activeCode->attempts)
                : null,
        ];
    }

    /**
     * Determina el canal de envío desde la tabla maestra.
     * Prioridad: email > sms.
     *
     * @return array{string, string, string} [channel, realDestination, maskedDestination]
     *
     * @throws \RuntimeException Si no hay email ni teléfono en verified_doctors.
     */
    private function resolveChannel(VerifiedDoctor $verifiedDoctor): array
    {
        if ($verifiedDoctor->email) {
            return ['email', $verifiedDoctor->email, $this->maskEmail($verifiedDoctor->email)];
        }

        if ($verifiedDoctor->phone) {
            return ['sms', $verifiedDoctor->phone, $this->maskPhone($verifiedDoctor->phone)];
        }

        throw new \RuntimeException(
            'No hay canal de contacto registrado para esta cédula. Contacta al administrador.'
        );
    }

    /**
     * Enmascara un email: john.doe@gmail.com → j***@gm***.com
     */
    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);

        $parts      = explode('.', $domain);
        $tld        = array_pop($parts);
        $domainBase = implode('.', $parts);

        $maskedLocal  = substr($local, 0, 1) . '***';
        $maskedDomain = substr($domainBase, 0, 2) . '***';

        return "{$maskedLocal}@{$maskedDomain}.{$tld}";
    }

    /**
     * Enmascara un teléfono: +584141234567 → +58***4567
     */
    private function maskPhone(string $phone): string
    {
        $prefix = str_starts_with($phone, '+') ? '+' : '';
        $digits = preg_replace('/\D/', '', $phone);

        return $prefix . substr($digits, 0, 2) . '***' . substr($digits, -4);
    }
}
