<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Specialty;
use App\Models\VerifiedDoctor;
use Illuminate\Console\Command;

final class VerifyDoctorCommand extends Command
{
    protected $signature = 'doctor:verify
                            {cedula : Cédula del doctor}
                            {first_name : Primer nombre}
                            {last_name : Apellido}
                            {--license= : Número de licencia médica}
                            {--email= : Email del doctor}
                            {--phone= : Teléfono del doctor}
                            {--university= : Universidad de graduación}
                            {--specialty= : ID de la especialidad}';

    protected $description = 'Agregar un doctor a la tabla de verificados (super-admin)';

    public function handle(): int
    {
        $cedula = $this->argument('cedula');

        // Verificar si ya existe
        $existing = VerifiedDoctor::where('cedula', $cedula)->first();
        if ($existing) {
            $this->error("❌ Ya existe un doctor verificado con cédula: {$cedula}");
            $this->info("Doctor existente: {$existing->first_name} {$existing->last_name}");

            if (!$this->confirm('¿Desea actualizar la información?')) {
                return self::FAILURE;
            }

            return $this->updateDoctor($existing);
        }

        // Mostrar especialidades disponibles
        if (!$this->option('specialty')) {
            $this->showSpecialties();
        }

        // Crear nuevo doctor verificado
        $data = [
            'cedula' => $cedula,
            'first_name' => $this->argument('first_name'),
            'last_name' => $this->argument('last_name'),
            'license_number' => $this->option('license'),
            'email' => $this->option('email'),
            'phone' => $this->option('phone'),
            'university' => $this->option('university'),
            'specialty_id' => $this->option('specialty'),
            'verified_by' => 'admin',
            'is_active' => true,
        ];

        // Confirmar datos
        $this->info('📋 DATOS A REGISTRAR:');
        $this->table(
            ['Campo', 'Valor'],
            collect($data)->map(fn($value, $key) => [$key, $value ?? 'N/A'])->values()
        );

        if (!$this->confirm('¿Confirma el registro de este doctor?', true)) {
            $this->warn('Operación cancelada');
            return self::FAILURE;
        }

        try {
            $doctor = VerifiedDoctor::create($data);

            $this->info("✅ Doctor verificado exitosamente!");
            $this->info("ID: {$doctor->id}");
            $this->info("Nombre: {$doctor->first_name} {$doctor->last_name}");
            $this->info("Cédula: {$doctor->cedula}");
            $this->newLine();
            $this->comment('El doctor ahora puede registrarse en la app y será automáticamente asignado como DOCTOR.');

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("❌ Error al crear doctor verificado: {$e->getMessage()}");
            return self::FAILURE;
        }
    }

    private function updateDoctor(VerifiedDoctor $doctor): int
    {
        $updates = [];

        if ($this->option('license')) {
            $updates['license_number'] = $this->option('license');
        }
        if ($this->option('email')) {
            $updates['email'] = $this->option('email');
        }
        if ($this->option('phone')) {
            $updates['phone'] = $this->option('phone');
        }
        if ($this->option('university')) {
            $updates['university'] = $this->option('university');
        }
        if ($this->option('specialty')) {
            $updates['specialty_id'] = $this->option('specialty');
        }

        if (empty($updates)) {
            $this->warn('No hay cambios para actualizar');
            return self::FAILURE;
        }

        $doctor->update($updates);

        $this->info("✅ Doctor actualizado exitosamente!");
        $this->table(
            ['Campo', 'Nuevo Valor'],
            collect($updates)->map(fn($value, $key) => [$key, $value])->values()
        );

        return self::SUCCESS;
    }

    private function showSpecialties(): void
    {
        $specialties = Specialty::where('is_active', true)->get();

        if ($specialties->isEmpty()) {
            $this->warn('No hay especialidades activas');
            return;
        }

        $this->newLine();
        $this->info('🏥 ESPECIALIDADES DISPONIBLES:');
        $this->table(
            ['ID', 'Nombre', 'Slug'],
            $specialties->map(fn($s) => [$s->id, $s->name, $s->slug])
        );
        $this->newLine();
    }
}
