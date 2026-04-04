<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class RequestVerificationCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [];
    }
}
