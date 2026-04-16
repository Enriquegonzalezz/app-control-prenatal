<?php

declare(strict_types=1);

namespace App\Enums;

enum AppointmentStatus: string
{
    case PENDING     = 'pending';
    case CONFIRMED   = 'confirmed';
    case IN_PROGRESS = 'in_progress';
    case COMPLETED   = 'completed';
    case CANCELLED   = 'cancelled';
    case NO_SHOW     = 'no_show';

    public function isCancellable(): bool
    {
        return in_array($this, [self::PENDING, self::CONFIRMED], true);
    }

    public function isActive(): bool
    {
        return ! in_array($this, [self::CANCELLED, self::NO_SHOW, self::COMPLETED], true);
    }
}
