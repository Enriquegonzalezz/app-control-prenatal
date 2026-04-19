<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class MedicalRecord extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'medical_records';

    protected $fillable = [
        // Legacy (doctor-note flow)
        'patient_id',
        'doctor_id',
        'clinic_id',
        'appointment_id',
        'specialty_id',
        'title',
        'notes',
        'diagnosis',
        'specialty_context',
        // New (document-upload flow)
        'uploader_id',
        'uploader_role',
        'category_id',
        'subcategory_id',
        'document_date',
        'description',
        'visibility',
        'storage_path',
        'file_type',
        'file_size_kb',
    ];

    protected function casts(): array
    {
        return [
            'specialty_context' => 'array',
            'document_date'     => 'date:Y-m-d',
        ];
    }

    // ── Relationships ──────────────────────────────────────────

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
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

    public function category(): BelongsTo
    {
        return $this->belongsTo(RecordCategory::class, 'category_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(RecordSubcategory::class, 'subcategory_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(RecordTag::class, 'medical_record_tags', 'medical_record_id', 'tag_id');
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(MedicalRecordFile::class);
    }

    // ── Helpers ───────────────────────────────────────────────

    /** Auto-generates a title from category + subcategory if none is set. */
    public function getDisplayTitleAttribute(): string
    {
        if ($this->title) {
            return $this->title;
        }

        $parts = array_filter([
            $this->category?->name,
            $this->subcategory?->name,
        ]);

        return $parts ? implode(' — ', $parts) : 'Documento médico';
    }
}