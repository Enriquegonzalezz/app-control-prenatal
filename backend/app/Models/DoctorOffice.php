<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class DoctorOffice extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'doctor_offices';

    protected $fillable = [
        'doctor_id',
        'name',
        'type',
        'address',
        'city',
        'state',
        'country',
        'phone',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class, 'doctor_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'office_id');
    }

    public function slots(): HasMany
    {
        return $this->hasMany(Slot::class, 'office_id');
    }
}
