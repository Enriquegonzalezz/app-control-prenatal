<?php

declare(strict_types=1);

namespace App\Enums;

enum MessageType: string
{
    case TEXT   = 'text';
    case IMAGE  = 'image';
    case FILE   = 'file';
    case SYSTEM = 'system';
}
