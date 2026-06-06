<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class DoctorProfile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'doctor_profiles';

    protected $fillable = [
        'user_id',
        'specialty_id',
        'license_number',
        'university',
        'years_experience',
        'consultation_fee',
        'bio',
        'is_verified',
        'is_available',
        'experience_count',
        'next_available_slot',
    ];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'is_available' => 'boolean',
            'experience_count' => 'integer',
            'years_experience' => 'integer',
            'consultation_fee' => 'decimal:2',
            'next_available_slot' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }

    /**
     * Clínicas a las que el médico se ha vinculado.
     *
     * NOTA: clinic_doctors.doctor_id referencia users.id (no doctor_profiles.id),
     * por eso se usa user_id como parentKey local.
     */
    public function clinics(): BelongsToMany
    {
        return $this->belongsToMany(Clinic::class, 'clinic_doctors', 'doctor_id', 'clinic_id', 'user_id', 'id')
            ->withPivot(['branch_id', 'is_active', 'joined_at'])
            ->withTimestamps();
    }

    public function offices(): HasMany
    {
        return $this->hasMany(DoctorOffice::class, 'doctor_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'doctor_id');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(Slot::class, 'doctor_id');
    }

    /**
     * Campos del perfil profesional obligatorios para que el médico sea
     * visible/agendable por las pacientes (además de estar verificado y
     * vinculado a una clínica activa). La especialidad ya es obligatoria
     * desde el registro. `years_experience` admite 0 (recién graduado).
     */
    public function isProfileComplete(): bool
    {
        return $this->missingProfileFields() === [];
    }

    /**
     * Lista de campos que aún faltan por completar.
     *
     * @return list<string>
     */
    public function missingProfileFields(): array
    {
        $missing = [];

        if (blank($this->license_number)) {
            $missing[] = 'license_number';
        }
        if (blank($this->university)) {
            $missing[] = 'university';
        }
        if ($this->consultation_fee === null || (float) $this->consultation_fee <= 0) {
            $missing[] = 'consultation_fee';
        }
        if (blank($this->bio)) {
            $missing[] = 'bio';
        }

        return $missing;
    }
}
