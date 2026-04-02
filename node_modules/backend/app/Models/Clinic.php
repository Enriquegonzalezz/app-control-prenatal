<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Clinic extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'rif',
        'logo_url',
        'phone',
        'email',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function branches(): HasMany
    {
        return $this->hasMany(ClinicBranch::class);
    }

    public function admins(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'clinic_admins')
            ->withTimestamps();
    }

    public function doctors(): BelongsToMany
    {
        return $this->belongsToMany(DoctorProfile::class, 'clinic_doctors', 'clinic_id', 'doctor_id')
            ->withPivot(['branch_id', 'is_active', 'joined_at'])
            ->withTimestamps();
    }
}
