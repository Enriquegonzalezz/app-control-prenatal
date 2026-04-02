<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Clinic;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\Specialty;
use App\Models\User;
use App\Models\VerifiedDoctor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class ShowSystemStatsCommand extends Command
{
    protected $signature = 'app:stats {--detailed : Mostrar estadísticas detalladas}';

    protected $description = 'Mostrar estadísticas generales del sistema';

    public function handle(): int
    {
        $this->info('📊 ESTADÍSTICAS DEL SISTEMA - Control Prenatal');
        $this->newLine();

        // Usuarios
        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();
        $inactiveUsers = $totalUsers - $activeUsers;
        $verifiedEmails = User::whereNotNull('email_verified_at')->count();

        $this->info('👥 USUARIOS');
        $this->table(
            ['Métrica', 'Cantidad', 'Porcentaje'],
            [
                ['Total usuarios', $totalUsers, '100%'],
                ['Activos', $activeUsers, $this->percentage($activeUsers, $totalUsers)],
                ['Inactivos', $inactiveUsers, $this->percentage($inactiveUsers, $totalUsers)],
                ['Emails verificados', $verifiedEmails, $this->percentage($verifiedEmails, $totalUsers)],
            ]
        );
        $this->newLine();

        // Por Rol
        $patients = User::where('role', UserRole::PATIENT)->count();
        $doctors = User::where('role', UserRole::DOCTOR)->count();
        $clinicAdmins = User::where('role', UserRole::CLINIC_ADMIN)->count();

        $this->info('🎭 DISTRIBUCIÓN POR ROL');
        $this->table(
            ['Rol', 'Cantidad', 'Porcentaje'],
            [
                ['Pacientes', $patients, $this->percentage($patients, $totalUsers)],
                ['Doctores', $doctors, $this->percentage($doctors, $totalUsers)],
                ['Admin Clínica', $clinicAdmins, $this->percentage($clinicAdmins, $totalUsers)],
            ]
        );
        $this->newLine();

        // Doctores
        $totalDoctorProfiles = DoctorProfile::count();
        $verifiedDoctors = DoctorProfile::where('is_verified', true)->count();
        $availableDoctors = DoctorProfile::where('is_available', true)->count();
        $doctorsInMasterTable = VerifiedDoctor::where('is_active', true)->count();

        $this->info('🩺 DOCTORES');
        $this->table(
            ['Métrica', 'Cantidad'],
            [
                ['Total perfiles doctor', $totalDoctorProfiles],
                ['Verificados', $verifiedDoctors],
                ['Disponibles', $availableDoctors],
                ['En tabla maestra', $doctorsInMasterTable],
                ['Doctores sin registrarse', $doctorsInMasterTable - $doctors],
            ]
        );
        $this->newLine();

        // Especialidades
        $totalSpecialties = Specialty::count();
        $activeSpecialties = Specialty::where('is_active', true)->count();

        $this->info('🏥 ESPECIALIDADES');
        $this->table(
            ['Métrica', 'Cantidad'],
            [
                ['Total especialidades', $totalSpecialties],
                ['Activas', $activeSpecialties],
            ]
        );

        if ($this->option('detailed')) {
            $specialtyStats = DB::table('doctor_profiles')
                ->join('specialties', 'doctor_profiles.specialty_id', '=', 'specialties.id')
                ->select('specialties.name', DB::raw('count(*) as total'))
                ->groupBy('specialties.name')
                ->orderBy('total', 'desc')
                ->get();

            if ($specialtyStats->isNotEmpty()) {
                $this->newLine();
                $this->info('📈 DOCTORES POR ESPECIALIDAD');
                $this->table(
                    ['Especialidad', 'Doctores'],
                    $specialtyStats->map(fn($stat) => [$stat->name, $stat->total])
                );
            }
        }
        $this->newLine();

        // Clínicas
        $totalClinics = Clinic::count();
        $activeClinics = Clinic::where('is_active', true)->count();

        $this->info('🏥 CLÍNICAS');
        $this->table(
            ['Métrica', 'Cantidad'],
            [
                ['Total clínicas', $totalClinics],
                ['Activas', $activeClinics],
                ['Inactivas', $totalClinics - $activeClinics],
            ]
        );
        $this->newLine();

        // Pacientes
        $totalPatientProfiles = PatientProfile::count();
        $patientsWithBloodType = PatientProfile::whereNotNull('blood_type')->count();

        $this->info('🤰 PACIENTES');
        $this->table(
            ['Métrica', 'Cantidad'],
            [
                ['Total perfiles paciente', $totalPatientProfiles],
                ['Con tipo de sangre', $patientsWithBloodType],
                ['Con contacto emergencia', PatientProfile::whereNotNull('emergency_contact_name')->count()],
            ]
        );
        $this->newLine();

        // Tokens (Sanctum)
        $activeTokens = DB::table('personal_access_tokens')->count();
        $this->info("🔑 Tokens activos: {$activeTokens}");
        $this->newLine();

        return self::SUCCESS;
    }

    private function percentage(int $value, int $total): string
    {
        if ($total === 0) {
            return '0%';
        }

        return round(($value / $total) * 100, 1) . '%';
    }
}
