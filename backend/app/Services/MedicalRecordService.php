<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\RelationshipStatus;
use App\Models\DoctorPatientRelationship;
use App\Models\MedicalRecord;
use App\Models\User;
use Illuminate\Support\Collection;
use RuntimeException;

final class MedicalRecordService
{
    /**
     * Lista registros médicos según el rol del usuario:
     *   - Paciente: ve sus propios registros.
     *   - Médico: ve registros de sus pacientes activos.
     *
     * @return Collection<int, MedicalRecord>
     */
    public function listForUser(User $user, ?string $patientId = null): Collection
    {
        $query = MedicalRecord::with(['doctor', 'patient', 'specialty'])
            ->orderBy('created_at', 'desc');

        if ($user->role->value === 'patient') {
            $query->where('patient_id', $user->id);
        } elseif ($user->role->value === 'doctor') {
            // Médico solo ve registros de sus pacientes activos
            $query->where('doctor_id', $user->id);

            if ($patientId) {
                $this->assertActiveRelationship($user, $patientId);
                $query->where('patient_id', $patientId);
            }
        } else {
            // clinic_admin u otro rol: sin acceso a registros médicos
            return collect();
        }

        return $query->get();
    }

    /**
     * Devuelve un registro médico solo si el usuario tiene acceso.
     */
    public function findForUser(User $user, MedicalRecord $record): MedicalRecord
    {
        $this->authorizeAccess($user, $record);

        return $record->load(['doctor', 'patient', 'specialty', 'appointment', 'vitalSigns', 'files']);
    }

    /**
     * Crea un nuevo registro médico.
     * Solo un médico con relación activa con el paciente puede crear.
     *
     * @param array{patient_id:string, clinic_id:string, appointment_id?:string,
     *             specialty_id:string, title:string, notes?:string,
     *             diagnosis?:string, specialty_context?:array<string,mixed>} $data
     */
    public function create(User $doctor, array $data): MedicalRecord
    {
        $this->assertActiveRelationship($doctor, $data['patient_id']);

        return MedicalRecord::create([
            'patient_id'        => $data['patient_id'],
            'doctor_id'         => $doctor->id,
            'clinic_id'         => $data['clinic_id'],
            'appointment_id'    => $data['appointment_id'] ?? null,
            'specialty_id'      => $data['specialty_id'],
            'title'             => $data['title'],
            'notes'             => $data['notes'] ?? null,
            'diagnosis'         => $data['diagnosis'] ?? null,
            'specialty_context' => $data['specialty_context'] ?? [],
        ]);
    }

    /**
     * Actualiza notas/diagnóstico de un registro médico.
     * Solo el médico que lo creó puede actualizarlo.
     *
     * @param array<string, mixed> $data
     */
    public function update(User $doctor, MedicalRecord $record, array $data): MedicalRecord
    {
        if ($record->doctor_id !== $doctor->id) {
            throw new RuntimeException('No tienes permiso para modificar este registro.');
        }

        $record->fill(array_intersect_key($data, array_flip([
            'title', 'notes', 'diagnosis', 'specialty_context',
        ])))->save();

        return $record->fresh(['doctor', 'patient', 'specialty']);
    }

    // ── helpers ──────────────────────────────────────────────

    public function authorizeAccess(User $user, MedicalRecord $record): void
    {
        $isPatient = $user->role->value === 'patient' && $record->patient_id === $user->id;
        $isDoctor  = $user->role->value === 'doctor'  && $record->doctor_id  === $user->id;

        if (!$isPatient && !$isDoctor) {
            abort(403, 'No tienes acceso a este registro médico.');
        }
    }

    private function assertActiveRelationship(User $doctor, string $patientId): void
    {
        $exists = DoctorPatientRelationship::where('doctor_id', $doctor->id)
            ->where('patient_id', $patientId)
            ->where('status', RelationshipStatus::ACTIVE->value)
            ->exists();

        if (!$exists) {
            throw new RuntimeException(
                'No existe una relación activa con este paciente.'
            );
        }
    }
}
