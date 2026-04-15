<?php

declare(strict_types=1);

namespace App\Http\Requests\Experience;

use Illuminate\Foundation\Http\FormRequest;

final class StoreReferralRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->value === 'patient';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'doctor_id'  => ['required', 'uuid', 'exists:users,id'],
            'patient_id' => ['nullable', 'uuid', 'exists:users,id'],
            'notes'      => ['nullable', 'string', 'max:500'],
        ];
    }
}
