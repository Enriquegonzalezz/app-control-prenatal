<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class RecordSubcategory extends Model
{
    use HasUuids;

    protected $table = 'record_subcategories';
    public    $timestamps = false;

    protected $fillable = ['category_id', 'name', 'slug', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(RecordCategory::class, 'category_id');
    }
}