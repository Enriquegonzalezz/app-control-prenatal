<?php

declare(strict_types=1);

namespace App\Enums;

enum ExperienceStatus: string
{
    case PENDING   = 'pending';
    case PUBLISHED = 'published';
    case REPORTED  = 'reported';
    case HIDDEN    = 'hidden';

    public function isVisible(): bool
    {
        return $this === self::PUBLISHED;
    }

    public function isEditable(): bool
    {
        return $this === self::PENDING;
    }
}
