<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\VerifiedDoctor;

final class VerificationService
{
    public function checkDoctorByCedula(string $cedula): ?VerifiedDoctor
    {
        return VerifiedDoctor::where('cedula', $cedula)
            ->where('is_active', true)
            ->first();
    }

    public function isDoctorVerified(string $cedula): bool
    {
        return VerifiedDoctor::where('cedula', $cedula)
            ->where('is_active', true)
            ->exists();
    }

    public function getVerifiedDoctorData(string $cedula): ?array
    {
        $doctor = $this->checkDoctorByCedula($cedula);

        if (!$doctor) {
            return null;
        }

        return [
            'specialty_id' => $doctor->specialty_id,
            'license_number' => $doctor->license_number,
            'university' => $doctor->university,
            'first_name' => $doctor->first_name,
            'last_name' => $doctor->last_name,
        ];
    }
}
