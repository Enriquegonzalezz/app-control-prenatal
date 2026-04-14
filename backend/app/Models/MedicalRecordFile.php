<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FileCategory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class MedicalRecordFile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'medical_record_files';

    public const UPDATED_AT = null; // tabla solo tiene created_at

    protected $fillable = [
        'medical_record_id',
        'patient_id',
        'uploaded_by',
        'file_name',
        'storage_path',
        'mime_type',
        'file_size_bytes',
        'category',
    ];

    protected function casts(): array
    {
        return [
            'category'        => FileCategory::class,
            'file_size_bytes' => 'integer',
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

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
