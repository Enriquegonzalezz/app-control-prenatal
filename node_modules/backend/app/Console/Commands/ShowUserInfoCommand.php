<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class ShowUserInfoCommand extends Command
{
    protected $signature = 'user:info {email : Email del usuario}';

    protected $description = 'Mostrar información completa de un usuario por email';

    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("❌ Usuario no encontrado con email: {$email}");
            return self::FAILURE;
        }

        $this->info("👤 INFORMACIÓN DEL USUARIO");
        $this->newLine();

        // Información básica
        $this->table(
            ['Campo', 'Valor'],
            [
                ['ID', $user->id],
                ['Nombre', $user->name],
                ['Email', $user->email],
                ['Cédula', $user->cedula ?? 'N/A'],
                ['Rol', $user->role->value],
                ['Teléfono', $user->phone ?? 'N/A'],
                ['Avatar', $user->avatar_url ?? 'N/A'],
                ['Tema', $user->theme_preference->value],
                ['Activo', $user->is_active ? '✓' : '✗'],
                ['Email verificado', $user->email_verified_at ? '✓ ' . $user->email_verified_at->format('Y-m-d H:i:s') : '✗'],
                ['Registrado', $user->created_at->format('Y-m-d H:i:s')],
                ['Última actualización', $user->updated_at->format('Y-m-d H:i:s')],
            ]
        );
        $this->newLine();

        // Perfil específico según rol
        if ($user->isDoctor()) {
            $doctorProfile = $user->doctorProfile()->with('specialty')->first();
            if ($doctorProfile) {
                $this->info('🩺 PERFIL DE DOCTOR');
                $this->table(
                    ['Campo', 'Valor'],
                    [
                        ['Especialidad', $doctorProfile->specialty->name ?? 'N/A'],
                        ['Nº Licencia', $doctorProfile->license_number ?? 'N/A'],
                        ['Universidad', $doctorProfile->university ?? 'N/A'],
                        ['Años experiencia', $doctorProfile->years_experience ?? 'N/A'],
                        ['Tarifa consulta', $doctorProfile->consultation_fee ? "$" . $doctorProfile->consultation_fee : 'N/A'],
                        ['Verificado', $doctorProfile->is_verified ? '✓' : '✗'],
                        ['Disponible', $doctorProfile->is_available ? '✓' : '✗'],
                        ['Experiencias', $doctorProfile->experience_count],
                    ]
                );
                $this->newLine();
            }
        } elseif ($user->isPatient()) {
            $patientProfile = $user->patientProfile;
            if ($patientProfile) {
                $this->info('🤰 PERFIL DE PACIENTE');
                $this->table(
                    ['Campo', 'Valor'],
                    [
                        ['Fecha nacimiento', $patientProfile->date_of_birth?->format('Y-m-d') ?? 'N/A'],
                        ['Tipo de sangre', $patientProfile->blood_type ?? 'N/A'],
                        ['Dirección', $patientProfile->address ?? 'N/A'],
                        ['Contacto emergencia', $patientProfile->emergency_contact_name ?? 'N/A'],
                        ['Teléfono emergencia', $patientProfile->emergency_contact_phone ?? 'N/A'],
                    ]
                );
                $this->newLine();
            }
        }

        // Tokens activos
        $tokens = DB::table('personal_access_tokens')
            ->where('tokenable_id', $user->id)
            ->where('tokenable_type', User::class)
            ->get();

        if ($tokens->isNotEmpty()) {
            $this->info("🔑 TOKENS ACTIVOS ({$tokens->count()})");
            $this->table(
                ['ID', 'Nombre', 'Última uso', 'Creado'],
                $tokens->map(fn($token) => [
                    $token->id,
                    $token->name,
                    $token->last_used_at ?? 'Nunca',
                    $token->created_at,
                ])
            );
        } else {
            $this->warn('No tiene tokens activos');
        }

        $this->newLine();
        return self::SUCCESS;
    }
}
