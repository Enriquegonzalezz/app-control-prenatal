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
     * Lists medical records with optional filters.
     *
     * Filters (all optional, passed as query params):
     *   patient_id, category_id, subcategory_id, tag_ids[] (array),
     *   date_from (Y-m-d), date_to (Y-m-d),
     *   doctor_id, has_appointment (0|1),
     *   visibility (shared|private),
     *   uploaded_by_me (0|1)  — "subido por mí"
     *
     * @return Collection<int, MedicalRecord>
     */
    public function listForUser(User $user, array $filters = []): Collection
    {
        $query = MedicalRecord::with([
            'doctor:id,name,avatar_url',
            'patient:id,name',
            'category:id,name,slug,icon,color',
            'subcategory:id,name,slug',
            'tags:id,name,color',
        ])->orderBy('document_date', 'desc')->orderBy('created_at', 'desc');

        $role = $user->role->value;

        if ($role === 'patient') {
            $query->where('patient_id', $user->id);

            // Patient can only see 'shared' records from others; their own records always visible.
            // (All records belonging to the patient, but if uploaded by a doctor, only shared ones)
            $query->where(function ($q) use ($user): void {
                $q->where('uploader_id', $user->id)       // patient uploaded themselves
                  ->orWhere('visibility', 'shared');        // or doctor uploaded, shared
            });

        } elseif ($role === 'doctor') {
            $patientId = $filters['patient_id'] ?? null;

            if ($patientId) {
                $this->assertActiveRelationship($user, $patientId);
                $query->where('patient_id', $patientId)
                      ->where('visibility', 'shared');
            } else {
                // Doctor sees all shared records of their active patients
                $activePatientIds = DoctorPatientRelationship::where('doctor_id', $user->id)
                    ->where('status', RelationshipStatus::ACTIVE->value)
                    ->pluck('patient_id');

                $query->whereIn('patient_id', $activePatientIds)
                      ->where('visibility', 'shared');
            }
        } else {
            return collect();
        }

        // ── Apply filters ──────────────────────────────────────

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['subcategory_id'])) {
            $query->where('subcategory_id', $filters['subcategory_id']);
        }

        if (!empty($filters['tag_ids']) && is_array($filters['tag_ids'])) {
            $query->whereHas('tags', fn ($q) => $q->whereIn('record_tags.id', $filters['tag_ids']));
        }

        if (!empty($filters['date_from'])) {
            $query->where('document_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('document_date', '<=', $filters['date_to']);
        }

        if (!empty($filters['doctor_id'])) {
            $query->where('doctor_id', $filters['doctor_id']);
        }

        if (isset($filters['has_appointment'])) {
            if ((bool) $filters['has_appointment']) {
                $query->whereNotNull('appointment_id');
            } else {
                $query->whereNull('appointment_id');
            }
        }

        if (!empty($filters['visibility']) && $role === 'patient') {
            $query->where('visibility', $filters['visibility']);
        }

        if (!empty($filters['uploaded_by_me'])) {
            $query->where('uploader_id', $user->id);
        }

        return $query->get();
    }

    /**
     * Returns a single record loaded with all relationships.
     */
    public function findForUser(User $user, MedicalRecord $record): MedicalRecord
    {
        $this->authorizeAccess($user, $record);

        return $record->load([
            'doctor:id,name,avatar_url',
            'patient:id,name',
            'category:id,name,slug,icon,color',
            'subcategory:id,name,slug',
            'tags:id,name,color',
            'appointment',
            'vitalSigns',
            'files',
        ]);
    }

    /**
     * Creates a clinical note (doctor-originated medical record, legacy flow).
     *
     * @param array<string, mixed> $data
     */
    public function create(User $doctor, array $data): MedicalRecord
    {
        $this->assertActiveRelationship($doctor, $data['patient_id']);

        return MedicalRecord::create([
            'patient_id'        => $data['patient_id'],
            'doctor_id'         => $doctor->id,
            'uploader_id'       => $doctor->id,
            'uploader_role'     => 'doctor',
            'clinic_id'         => $data['clinic_id'] ?? null,
            'appointment_id'    => $data['appointment_id'] ?? null,
            'specialty_id'      => $data['specialty_id'] ?? null,
            'title'             => $data['title'],
            'notes'             => $data['notes'] ?? null,
            'diagnosis'         => $data['diagnosis'] ?? null,
            'specialty_context' => $data['specialty_context'] ?? [],
            'visibility'        => 'shared',
        ]);
    }

    /**
     * Updates a clinical note (doctor who created it only).
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

        return $record->fresh(['doctor', 'patient', 'specialty', 'category', 'subcategory', 'tags']);
    }

    // ── Helpers ───────────────────────────────────────────────

    public function authorizeAccess(User $user, MedicalRecord $record): void
    {
        $role = $user->role->value;

        // Patient: owns the record
        if ($role === 'patient' && (string) $record->patient_id === (string) $user->id) {
            // Private records: only the patient who uploaded can see
            if ($record->visibility === 'private' && (string) $record->uploader_id !== (string) $user->id) {
                abort(403, 'Este registro es privado.');
            }
            return;
        }

        // Doctor: must have active relationship + record must be shared
        if ($role === 'doctor') {
            $hasRelationship = DoctorPatientRelationship::where('doctor_id', $user->id)
                ->where('patient_id', $record->patient_id)
                ->where('status', RelationshipStatus::ACTIVE->value)
                ->exists();

            if ($hasRelationship && $record->visibility === 'shared') {
                return;
            }

            // Doctor is the uploader of the record
            if ((string) $record->uploader_id === (string) $user->id) {
                return;
            }
        }

        abort(403, 'No tienes acceso a este registro médico.');
    }

    private function assertActiveRelationship(User $doctor, string $patientId): void
    {
        $exists = DoctorPatientRelationship::where('doctor_id', $doctor->id)
            ->where('patient_id', $patientId)
            ->where('status', RelationshipStatus::ACTIVE->value)
            ->exists();

        if (!$exists) {
            throw new RuntimeException('No existe una relación activa con este paciente.');
        }
    }
}