<?php

declare(strict_types=1);

namespace App\Enums;

enum FileCategory: string
{
    case LAB          = 'lab';
    case ULTRASOUND   = 'ultrasound';
    case PRESCRIPTION = 'prescription';
    case OTHER        = 'other';

    public function folder(): string
    {
        return $this->value;
    }
}
