<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalRecord;

use Illuminate\Foundation\Http\FormRequest;

final class StoreMedicalRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->value === 'doctor';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'patient_id'        => ['required', 'uuid', 'exists:users,id'],
            'clinic_id'         => ['required', 'uuid', 'exists:clinics,id'],
            'appointment_id'    => ['nullable', 'uuid', 'exists:appointments,id'],
            'specialty_id'      => ['required', 'uuid', 'exists:specialties,id'],
            'title'             => ['required', 'string', 'max:255'],
            'notes'             => ['nullable', 'string', 'max:5000'],
            'diagnosis'         => ['nullable', 'string', 'max:5000'],
            'specialty_context' => ['nullable', 'array'],
        ];
    }
}
