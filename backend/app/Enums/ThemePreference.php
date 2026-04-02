<?php

declare(strict_types=1);

namespace App\Enums;

enum ThemePreference: string
{
    case LIGHT = 'light';
    case DARK = 'dark';
    case SYSTEM = 'system';
}
