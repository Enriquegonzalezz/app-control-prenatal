<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class VitalSign extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'vital_signs';

    protected $fillable = [
        'medical_record_id',
        'patient_id',
        'doctor_id',
        'recorded_at',
        'weight_kg',
        'height_cm',
        'blood_pressure_systolic',
        'blood_pressure_diastolic',
        'heart_rate_bpm',
        'temperature_c',
        'oxygen_saturation',
        'specialty_data',
    ];

    protected function casts(): array
    {
        return [
            'recorded_at'               => 'datetime',
            'weight_kg'                 => 'decimal:2',
            'height_cm'                 => 'decimal:1',
            'blood_pressure_systolic'   => 'integer',
            'blood_pressure_diastolic'  => 'integer',
            'heart_rate_bpm'            => 'integer',
            'temperature_c'             => 'decimal:1',
            'oxygen_saturation'         => 'decimal:1',
            'specialty_data'            => 'array',
        ];
    }

    public function medicalRecord(): BelongsTo
    {
        return $this->belongsTo(MedicalRecord::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
