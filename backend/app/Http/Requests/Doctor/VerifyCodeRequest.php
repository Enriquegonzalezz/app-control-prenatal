<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class VerifyCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'digits:6'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'El código de verificación es obligatorio.',
            'code.digits'   => 'El código debe ser exactamente 6 dígitos numéricos.',
        ];
    }
}
