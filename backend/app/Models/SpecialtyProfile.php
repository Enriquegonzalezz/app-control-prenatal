<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SpecialtyProfile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'specialty_profiles';

    protected $fillable = [
        'patient_id',
        'specialty_id',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }
}
