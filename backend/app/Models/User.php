<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ThemePreference;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

final class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasUuids;

    protected $fillable = [
        'name',
        'email',
        'password',
        'cedula',
        'role',
        'phone',
        'avatar_url',
        'theme_preference',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'role' => UserRole::class,
            'theme_preference' => ThemePreference::class,
        ];
    }

    public function doctorProfile(): HasOne
    {
        return $this->hasOne(DoctorProfile::class);
    }

    public function patientProfile(): HasOne
    {
        return $this->hasOne(PatientProfile::class);
    }

    public function isDoctor(): bool
    {
        return $this->role === UserRole::DOCTOR;
    }

    public function isPatient(): bool
    {
        return $this->role === UserRole::PATIENT;
    }

    public function isClinicAdmin(): bool
    {
        return $this->role === UserRole::CLINIC_ADMIN;
    }
}
