<?php

declare(strict_types=1);

namespace App\Http\Requests\Appointment;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class CompleteAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [
            'doctor_notes' => ['sometimes', 'nullable', 'string', 'max:4000'],
        ];
    }
}
