<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class ExperienceTag extends Model
{
    use HasUuids;

    protected $table = 'experience_tags';

    public const UPDATED_AT = null;

    protected $fillable = ['name', 'icon', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function experiences(): BelongsToMany
    {
        return $this->belongsToMany(
            Experience::class,
            'experience_tag_map',
            'tag_id',
            'experience_id',
        );
    }
}
