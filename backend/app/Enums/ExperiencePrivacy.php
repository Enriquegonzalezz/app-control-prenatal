<?php

declare(strict_types=1);

namespace App\Enums;

enum ExperiencePrivacy: string
{
    case FULL_NAME  = 'full_name';
    case PARTIAL    = 'partial';
    case ANONYMOUS  = 'anonymous';
}
