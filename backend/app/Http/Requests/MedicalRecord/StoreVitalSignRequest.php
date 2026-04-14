<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalRecord;

use Illuminate\Foundation\Http\FormRequest;

final class StoreVitalSignRequest extends FormRequest
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
            'recorded_at'               => ['nullable', 'date'],
            'weight_kg'                 => ['nullable', 'numeric', 'min:0', 'max:500'],
            'height_cm'                 => ['nullable', 'numeric', 'min:0', 'max:300'],
            'blood_pressure_systolic'   => ['nullable', 'integer', 'min:40', 'max:300'],
            'blood_pressure_diastolic'  => ['nullable', 'integer', 'min:20', 'max:200'],
            'heart_rate_bpm'            => ['nullable', 'integer', 'min:20', 'max:300'],
            'temperature_c'             => ['nullable', 'numeric', 'min:30', 'max:45'],
            'oxygen_saturation'         => ['nullable', 'numeric', 'min:0', 'max:100'],
            'specialty_data'            => ['nullable', 'array'],
            // Claves ginecobstetricia (opcionales, validadas como parte del array)
            'specialty_data.gestational_week'   => ['nullable', 'integer', 'min:1', 'max:45'],
            'specialty_data.fetal_heart_rate'   => ['nullable', 'integer', 'min:60', 'max:220'],
            'specialty_data.fundal_height_cm'   => ['nullable', 'numeric', 'min:0', 'max:50'],
            'specialty_data.fetal_presentation' => ['nullable', 'string', 'max:50'],
        ];
    }
}
