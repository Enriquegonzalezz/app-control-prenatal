<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use App\Enums\SlotStatus;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class UpdateSlotStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', new Enum(SlotStatus::class)],
        ];
    }
}
