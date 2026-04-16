<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SlotStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Slot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'slots';

    protected $fillable = [
        'doctor_id',
        'branch_id',
        'schedule_id',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at'   => 'datetime',
            'status'    => SlotStatus::class,
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class, 'doctor_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(ClinicBranch::class, 'branch_id');
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class, 'schedule_id');
    }
}
