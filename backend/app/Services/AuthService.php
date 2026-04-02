<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\User;
use App\Models\VerifiedDoctor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class AuthService
{
    public function __construct(
        private readonly VerificationService $verificationService
    ) {}

    public function register(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $verifiedDoctor = $this->verificationService->checkDoctorByCedula($data['cedula']);

            $role = $verifiedDoctor ? UserRole::DOCTOR : UserRole::PATIENT;

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'cedula' => $data['cedula'],
                'role' => $role,
                'phone' => $data['phone'] ?? null,
                'is_active' => true,
            ]);

            if ($role === UserRole::DOCTOR) {
                $this->createDoctorProfile($user, $verifiedDoctor);
            } else {
                $this->createPatientProfile($user);
            }

            return $user->fresh(['doctorProfile', 'patientProfile']);
        });
    }

    protected function createDoctorProfile(User $user, VerifiedDoctor $verifiedDoctor): void
    {
        DoctorProfile::create([
            'user_id' => $user->id,
            'specialty_id' => $verifiedDoctor->specialty_id,
            'license_number' => $verifiedDoctor->license_number,
            'university' => $verifiedDoctor->university,
            'is_verified' => true,
            'is_available' => true,
            'experience_count' => 0,
        ]);
    }

    protected function createPatientProfile(User $user): void
    {
        PatientProfile::create([
            'user_id' => $user->id,
        ]);
    }

    public function login(string $email, string $password): ?array
    {
        $user = User::where('email', $email)
            ->where('is_active', true)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return null;
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user->load($user->isDoctor() ? 'doctorProfile.specialty' : 'patientProfile'),
            'token' => $token,
        ];
    }
}
