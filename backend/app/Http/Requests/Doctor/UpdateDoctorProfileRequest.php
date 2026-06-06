<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateDoctorProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [
            'license_number'   => ['required', 'string', 'max:50'],
            'university'       => ['required', 'string', 'max:150'],
            'years_experience' => ['required', 'integer', 'min:0', 'max:70'],
            'consultation_fee' => ['required', 'numeric', 'min:1', 'max:100000'],
            'bio'              => ['required', 'string', 'min:20', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'license_number.required'   => 'El número de colegiatura (MPPS) es obligatorio.',
            'university.required'       => 'Indica la universidad donde te graduaste.',
            'years_experience.required' => 'Indica tus años de experiencia (0 si recién egresaste).',
            'years_experience.integer'  => 'Los años de experiencia deben ser un número entero.',
            'consultation_fee.required' => 'Indica el precio de la consulta.',
            'consultation_fee.min'      => 'El precio de la consulta debe ser mayor a 0.',
            'bio.required'              => 'Escribe una breve descripción profesional.',
            'bio.min'                   => 'La descripción debe tener al menos 20 caracteres.',
            'bio.max'                   => 'La descripción no puede superar los 1000 caracteres.',
        ];
    }
}
