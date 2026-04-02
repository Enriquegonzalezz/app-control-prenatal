<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Specialty extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'specialties';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function doctors(): HasMany
    {
        return $this->hasMany(DoctorProfile::class);
    }

    public function verifiedDoctors(): HasMany
    {
        return $this->hasMany(VerifiedDoctor::class);
    }
}
