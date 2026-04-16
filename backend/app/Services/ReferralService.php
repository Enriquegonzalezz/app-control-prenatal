<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Referral;
use App\Models\User;
use Illuminate\Support\Collection;
use RuntimeException;

final class ReferralService
{
    /**
     * Crea un referido: un paciente recomienda un médico a otro paciente.
     *
     * @param array{doctor_id:string, patient_id?:string, notes?:string} $data
     */
    public function create(User $referredBy, array $data): Referral
    {
        // El mismo paciente no puede referirse a sí mismo
        if (isset($data['patient_id']) && $data['patient_id'] === $referredBy->id) {
            throw new RuntimeException('No puedes referirte a ti mismo.');
        }

        try {
            $referral = Referral::create([
                'doctor_id'   => $data['doctor_id'],
                'referred_by' => $referredBy->id,
                'patient_id'  => $data['patient_id'] ?? null,
                'notes'       => $data['notes'] ?? null,
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            throw new RuntimeException('Ya referiste a este médico para este paciente.');
        }

        return $referral->load(['doctor:id,name', 'referredBy:id,name', 'patient:id,name']);
    }

    /**
     * Lista los referidos hechos por el usuario (paciente que recomienda).
     *
     * @return Collection<int, Referral>
     */
    public function listByReferrer(User $user): Collection
    {
        return Referral::with(['doctor:id,name,avatar_url', 'patient:id,name'])
            ->where('referred_by', $user->id)
            ->latest()
            ->get();
    }

    /**
     * Lista los referidos recibidos por un médico.
     *
     * @return Collection<int, Referral>
     */
    public function listForDoctor(string $doctorId): Collection
    {
        return Referral::with(['referredBy:id,name', 'patient:id,name'])
            ->where('doctor_id', $doctorId)
            ->latest()
            ->get();
    }
}
