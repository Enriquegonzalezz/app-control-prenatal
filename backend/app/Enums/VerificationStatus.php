<?php

declare(strict_types=1);

namespace App\Enums;

enum VerificationStatus: string
{
    case PENDING   = 'pending';
    case CODE_SENT = 'code_sent';
    case VERIFIED  = 'verified';
    case FAILED    = 'failed';
    case EXPIRED   = 'expired';
}
