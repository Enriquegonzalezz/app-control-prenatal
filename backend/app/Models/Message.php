<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MessageType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Message extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'messages';

    public const UPDATED_AT = null; // sin updated_at

    protected $fillable = [
        'relationship_id',
        'sender_id',
        'content_encrypted',
        'type',
        'read_at',
    ];

    protected $hidden = [
        'content_encrypted', // se expone solo el campo 'content' desencriptado
    ];

    protected function casts(): array
    {
        return [
            'type'    => MessageType::class,
            'read_at' => 'datetime',
        ];
    }

    public function relationship(): BelongsTo
    {
        return $this->belongsTo(DoctorPatientRelationship::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
