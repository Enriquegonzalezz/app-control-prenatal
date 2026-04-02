<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\DoctorProfile;
use App\Models\User;
use App\Models\VerifiedDoctor;
use Illuminate\Console\Command;

final class FindDoctorByCedulaCommand extends Command
{
    protected $signature = 'doctor:find {cedula : Cédula del doctor}';

    protected $description = 'Buscar doctor por cédula y mostrar toda su información';

    public function handle(): int
    {
        $cedula = $this->argument('cedula');

        $this->info("🔍 Buscando doctor con cédula: {$cedula}");
        $this->newLine();

        // Buscar en verified_doctors
        $verifiedDoctor = VerifiedDoctor::where('cedula', $cedula)->first();

        if ($verifiedDoctor) {
            $this->info('✅ DOCTOR VERIFICADO (Master Table)');
            $this->table(
                ['Campo', 'Valor'],
                [
                    ['ID', $verifiedDoctor->id],
                    ['Nombre Completo', "{$verifiedDoctor->first_name} {$verifiedDoctor->last_name}"],
                    ['Cédula', $verifiedDoctor->cedula],
                    ['Email', $verifiedDoctor->email ?? 'N/A'],
                    ['Teléfono', $verifiedDoctor->phone ?? 'N/A'],
                    ['Nº Licencia', $verifiedDoctor->license_number ?? 'N/A'],
                    ['Universidad', $verifiedDoctor->university ?? 'N/A'],
                    ['Especialidad ID', $verifiedDoctor->specialty_id ?? 'N/A'],
                    ['Activo', $verifiedDoctor->is_active ? '✓' : '✗'],
                    ['Verificado por', $verifiedDoctor->verified_by],
                    ['Fecha verificación', $verifiedDoctor->verified_at?->format('Y-m-d H:i:s')],
                ]
            );
            $this->newLine();
        } else {
            $this->warn('⚠ No encontrado en tabla de doctores verificados');
            $this->newLine();
        }

        // Buscar si está registrado como usuario
        $user = User::where('cedula', $cedula)->first();

        if ($user) {
            $this->info('👤 USUARIO REGISTRADO');
            $this->table(
                ['Campo', 'Valor'],
                [
                    ['ID', $user->id],
                    ['Nombre', $user->name],
                    ['Email', $user->email],
                    ['Rol', $user->role->value],
                    ['Teléfono', $user->phone ?? 'N/A'],
                    ['Avatar', $user->avatar_url ?? 'N/A'],
                    ['Activo', $user->is_active ? '✓' : '✗'],
                    ['Email verificado', $user->email_verified_at ? '✓' : '✗'],
                    ['Registrado', $user->created_at->format('Y-m-d H:i:s')],
                ]
            );
            $this->newLine();

            // Si es doctor, mostrar perfil
            if ($user->isDoctor()) {
                $doctorProfile = DoctorProfile::where('user_id', $user->id)
                    ->with('specialty')
                    ->first();

                if ($doctorProfile) {
                    $this->info('🩺 PERFIL DE DOCTOR');
                    $this->table(
                        ['Campo', 'Valor'],
                        [
                            ['ID Perfil', $doctorProfile->id],
                            ['Especialidad', $doctorProfile->specialty->name ?? 'N/A'],
                            ['Nº Licencia', $doctorProfile->license_number ?? 'N/A'],
                            ['Universidad', $doctorProfile->university ?? 'N/A'],
                            ['Años experiencia', $doctorProfile->years_experience ?? 'N/A'],
                            ['Tarifa consulta', $doctorProfile->consultation_fee ? "$" . $doctorProfile->consultation_fee : 'N/A'],
                            ['Bio', $doctorProfile->bio ?? 'N/A'],
                            ['Verificado', $doctorProfile->is_verified ? '✓' : '✗'],
                            ['Disponible', $doctorProfile->is_available ? '✓' : '✗'],
                            ['Experiencias', $doctorProfile->experience_count],
                            ['Próximo turno', $doctorProfile->next_available_slot?->format('Y-m-d H:i') ?? 'N/A'],
                        ]
                    );
                    $this->newLine();

                    // Clínicas vinculadas
                    $clinics = $doctorProfile->clinics()->get();
                    if ($clinics->isNotEmpty()) {
                        $this->info("🏥 CLÍNICAS VINCULADAS ({$clinics->count()})");
                        $this->table(
                            ['ID', 'Nombre', 'RIF', 'Activa'],
                            $clinics->map(fn($clinic) => [
                                $clinic->id,
                                $clinic->name,
                                $clinic->rif,
                                $clinic->is_active ? '✓' : '✗',
                            ])
                        );
                    } else {
                        $this->warn('No tiene clínicas vinculadas');
                    }
                }
            }
        } else {
            $this->warn('⚠ No está registrado como usuario en el sistema');
        }

        $this->newLine();
        return self::SUCCESS;
    }
}
