<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Models\VerifiedDoctor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class CheckDatabaseHealthCommand extends Command
{
    protected $signature = 'db:health';

    protected $description = 'Verificar la salud de la base de datos y detectar inconsistencias';

    public function handle(): int
    {
        $this->info('🏥 VERIFICACIÓN DE SALUD DE LA BASE DE DATOS');
        $this->newLine();

        $issues = 0;

        // 1. Doctores sin perfil
        $issues += $this->checkDoctorsWithoutProfile();

        // 2. Pacientes sin perfil
        $issues += $this->checkPatientsWithoutProfile();

        // 3. Doctores registrados no verificados
        $issues += $this->checkUnverifiedDoctors();

        // 4. Doctores verificados sin registro
        $issues += $this->checkVerifiedDoctorsNotRegistered();

        // 5. Tokens huérfanos
        $issues += $this->checkOrphanTokens();

        // 6. Usuarios inactivos con tokens
        $issues += $this->checkInactiveUsersWithTokens();

        $this->newLine();

        if ($issues === 0) {
            $this->info('✅ No se encontraron inconsistencias. La base de datos está saludable.');
        } else {
            $this->warn("⚠️  Se encontraron {$issues} problemas potenciales.");
        }

        return $issues === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function checkDoctorsWithoutProfile(): int
    {
        $count = User::where('role', 'doctor')
            ->whereDoesntHave('doctorProfile')
            ->count();

        if ($count > 0) {
            $this->warn("❌ {$count} doctores sin perfil de doctor");
            return 1;
        }

        $this->info('✓ Todos los doctores tienen perfil');
        return 0;
    }

    private function checkPatientsWithoutProfile(): int
    {
        $count = User::where('role', 'patient')
            ->whereDoesntHave('patientProfile')
            ->count();

        if ($count > 0) {
            $this->warn("❌ {$count} pacientes sin perfil de paciente");
            return 1;
        }

        $this->info('✓ Todos los pacientes tienen perfil');
        return 0;
    }

    private function checkUnverifiedDoctors(): int
    {
        $unverifiedDoctors = User::where('role', 'doctor')
            ->whereHas('doctorProfile', function ($query) {
                $query->where('is_verified', false);
            })
            ->get();

        if ($unverifiedDoctors->isNotEmpty()) {
            $this->warn("⚠️  {$unverifiedDoctors->count()} doctores registrados pero NO verificados:");
            $this->table(
                ['Email', 'Nombre', 'Cédula'],
                $unverifiedDoctors->map(fn($u) => [$u->email, $u->name, $u->cedula])
            );
            return 1;
        }

        $this->info('✓ Todos los doctores registrados están verificados');
        return 0;
    }

    private function checkVerifiedDoctorsNotRegistered(): int
    {
        $verifiedNotRegistered = VerifiedDoctor::where('is_active', true)
            ->whereDoesntHave('users')
            ->count();

        if ($verifiedNotRegistered > 0) {
            $this->info("ℹ️  {$verifiedNotRegistered} doctores verificados aún no se han registrado en la app");
        }

        return 0; // No es un error, es informativo
    }

    private function checkOrphanTokens(): int
    {
        $orphanTokens = DB::table('personal_access_tokens')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('users')
                    ->whereColumn('users.id', 'personal_access_tokens.tokenable_id');
            })
            ->count();

        if ($orphanTokens > 0) {
            $this->warn("❌ {$orphanTokens} tokens huérfanos (usuario eliminado)");
            $this->comment('Ejecute: php artisan tokens:cleanup --force');
            return 1;
        }

        $this->info('✓ No hay tokens huérfanos');
        return 0;
    }

    private function checkInactiveUsersWithTokens(): int
    {
        $count = DB::table('personal_access_tokens')
            ->join('users', 'users.id', '=', 'personal_access_tokens.tokenable_id')
            ->where('users.is_active', false)
            ->count();

        if ($count > 0) {
            $this->warn("⚠️  {$count} tokens de usuarios inactivos");
            $this->comment('Considere revocar estos tokens');
            return 1;
        }

        $this->info('✓ No hay tokens de usuarios inactivos');
        return 0;
    }
}
