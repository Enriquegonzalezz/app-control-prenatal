<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RelationshipStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DoctorPatientRelationship extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'doctor_patient_relationships';

    protected $fillable = [
        'doctor_id',
        'patient_id',
        'status',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'status'     => RelationshipStatus::class,
            'started_at' => 'datetime',
            'ended_at'   => 'datetime',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }
}
