<?php

declare(strict_types=1);

namespace App\Enums;

enum RelationshipStatus: string
{
    case PENDING    = 'pending';
    case ACTIVE     = 'active';
    case COMPLETED  = 'completed';
    case TERMINATED = 'terminated';
}
