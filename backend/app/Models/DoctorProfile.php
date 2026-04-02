<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    public function clinics(): BelongsToMany
    {
        return $this->belongsToMany(Clinic::class, 'clinic_doctors', 'doctor_id', 'clinic_id')
            ->withPivot(['branch_id', 'is_active', 'joined_at'])
            ->withTimestamps();
    }
}
