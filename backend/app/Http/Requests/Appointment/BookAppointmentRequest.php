<?php

declare(strict_types=1);

namespace App\Http\Requests\Appointment;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class BookAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::PATIENT;
    }

    public function rules(): array
    {
        return [
            'slot_id'       => ['required', 'uuid', 'exists:slots,id'],
            'patient_notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
