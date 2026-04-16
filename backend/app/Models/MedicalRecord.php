<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class MedicalRecord extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'medical_records';

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'clinic_id',
        'appointment_id',
        'specialty_id',
        'title',
        'notes',
        'diagnosis',
        'specialty_context',
    ];

    protected function casts(): array
    {
        return [
            'specialty_context' => 'array',
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

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(MedicalRecordFile::class);
    }
}
