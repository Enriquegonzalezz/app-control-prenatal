<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AppointmentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Appointment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'appointments';

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'clinic_id',
        'branch_id',
        'slot_id',
        'status',
        'scheduled_at',
        'duration_minutes',
        'consultation_fee',
        'patient_notes',
        'doctor_notes',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
        'confirmed_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status'           => AppointmentStatus::class,
            'scheduled_at'     => 'datetime',
            'duration_minutes' => 'integer',
            'consultation_fee' => 'decimal:2',
            'cancelled_at'     => 'datetime',
            'confirmed_at'     => 'datetime',
            'completed_at'     => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(ClinicBranch::class, 'branch_id');
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(Slot::class);
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }
}
