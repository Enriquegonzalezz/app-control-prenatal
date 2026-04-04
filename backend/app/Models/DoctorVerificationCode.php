<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VerificationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DoctorVerificationCode extends Model
{
    use HasUuids;

    protected $table = 'doctor_verification_codes';

    /**
     * La tabla tiene created_at pero no updated_at.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'verified_doctor_id',
        'code',
        'channel',
        'destination',
        'status',
        'attempts',
        'max_attempts',
        'expires_at',
        'verified_at',
        'ip_address',
        'user_agent',
    ];

    /** @var array<string, string> */
    protected $hidden = ['code'];

    protected function casts(): array
    {
        return [
            'status'       => VerificationStatus::class,
            'expires_at'   => 'datetime',
            'verified_at'  => 'datetime',
            'created_at'   => 'datetime',
            'attempts'     => 'integer',
            'max_attempts' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifiedDoctor(): BelongsTo
    {
        return $this->belongsTo(VerifiedDoctor::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function hasAttemptsLeft(): bool
    {
        return $this->attempts < $this->max_attempts;
    }

    /**
     * Un código es usable si está enviado, no expiró y tiene intentos restantes.
     */
    public function isUsable(): bool
    {
        return $this->status === VerificationStatus::CODE_SENT
            && ! $this->isExpired()
            && $this->hasAttemptsLeft();
    }
}
