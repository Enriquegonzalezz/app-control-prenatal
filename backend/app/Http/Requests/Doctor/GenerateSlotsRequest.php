<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

final class GenerateSlotsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [
            'from'  => ['required', 'date_format:Y-m-d'],
            'until' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }
}
