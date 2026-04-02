<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class VerifiedDoctor extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'verified_doctors';

    protected $fillable = [
        'cedula',
        'specialty_id',
        'license_number',
        'first_name',
        'last_name',
        'email',
        'university',
        'phone',
        'verified_at',
        'verified_by',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }
}
