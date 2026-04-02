<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case PATIENT = 'patient';
    case DOCTOR = 'doctor';
    case CLINIC_ADMIN = 'clinic_admin';
}
