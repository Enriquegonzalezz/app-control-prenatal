<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

final class RecordTag extends Model
{
    use HasUuids;

    protected $table = 'record_tags';
    public    $timestamps = false;

    protected $fillable = ['name', 'color', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}