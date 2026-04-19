<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class RecordCategory extends Model
{
    use HasUuids;

    protected $table = 'record_categories';
    public    $timestamps = false;

    protected $fillable = ['name', 'slug', 'icon', 'color', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(RecordSubcategory::class, 'category_id')
            ->where('is_active', true)
            ->orderBy('sort_order');
    }
}