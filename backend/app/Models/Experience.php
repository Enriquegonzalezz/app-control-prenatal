<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ExperiencePrivacy;
use App\Enums\ExperienceStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Experience extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'experiences';

    protected $fillable = [
        'appointment_id',
        'patient_id',
        'doctor_id',
        'clinic_id',
        'body',
        'privacy',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'privacy'      => ExperiencePrivacy::class,
            'status'       => ExperienceStatus::class,
            'published_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
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

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            ExperienceTag::class,
            'experience_tag_map',
            'experience_id',
            'tag_id',
        );
    }
}
