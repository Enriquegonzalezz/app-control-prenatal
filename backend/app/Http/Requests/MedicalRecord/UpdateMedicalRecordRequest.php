<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalRecord;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateMedicalRecordRequest extends FormRequest
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
            'title'             => ['sometimes', 'string', 'max:255'],
            'notes'             => ['nullable', 'string', 'max:5000'],
            'diagnosis'         => ['nullable', 'string', 'max:5000'],
            'specialty_context' => ['nullable', 'array'],
        ];
    }
}
