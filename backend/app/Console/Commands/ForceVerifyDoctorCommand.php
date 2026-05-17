<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Enums\VerificationStatus;
use App\Models\DoctorVerificationCode;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class ForceVerifyDoctorCommand extends Command
{
    protected $signature = 'doctor:force-verify
                            {identifier : Email o cédula del médico}
                            {--force : Omitir la confirmación interactiva}';

    protected $description = 'Marcar a un médico como verificado manualmente (bypass OTP). Usado mientras Resend no esté listo.';

    public function handle(): int
    {
        $identifier = (string) $this->argument('identifier');

        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('cedula', $identifier)
            ->with('doctorProfile.specialty')
            ->first();

        if (!$user) {
            $this->error("❌ No se encontró ningún usuario con email/cédula: {$identifier}");
            return self::FAILURE;
        }

        if ($user->role !== UserRole::DOCTOR) {
            $this->error("❌ El usuario {$user->email} no tiene rol 'doctor' (rol actual: {$user->role->value}).");
            $this->comment('Solo médicos pueden ser verificados. Verifica que la cédula esté en verified_doctors.');
            return self::FAILURE;
        }

        $profile = $user->doctorProfile;
        if (!$profile) {
            $this->error("❌ El usuario no tiene doctor_profile creado. Esto indica un problema en el registro.");
            return self::FAILURE;
        }

        if ($profile->is_verified) {
            $this->warn("⚠ El médico {$user->name} ya está verificado.");
            return self::SUCCESS;
        }

        $this->info('📋 Médico a verificar:');
        $this->table(
            ['Campo', 'Valor'],
            [
                ['Nombre',       $user->name],
                ['Email',        $user->email],
                ['Cédula',       $user->cedula],
                ['Especialidad', $profile->specialty?->name ?? 'N/A'],
                ['Licencia',     $profile->license_number ?? 'N/A'],
                ['is_verified',  $profile->is_verified ? '✓' : '✗ (se cambiará a ✓)'],
            ]
        );

        if (!$this->option('force') && !$this->confirm('¿Confirmar verificación manual?', true)) {
            $this->warn('Operación cancelada.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($user, $profile): void {
            $profile->update(['is_verified' => true]);

            // Marcar cualquier código OTP pendiente como verificado (limpieza)
            DoctorVerificationCode::query()
                ->where('user_id', $user->id)
                ->whereIn('status', [VerificationStatus::PENDING->value, VerificationStatus::CODE_SENT->value])
                ->update([
                    'status'      => VerificationStatus::VERIFIED->value,
                    'verified_at' => now(),
                ]);
        });

        $this->newLine();
        $this->info("✅ Médico verificado exitosamente: {$user->name} ({$user->email})");
        $this->comment('Ya puede acceder a todas las funcionalidades (horarios, citas, chat, historial).');

        return self::SUCCESS;
    }
}
