<?php

declare(strict_types=1);

namespace App\Http\Requests\Doctor;

use App\Enums\DayOfWeek;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

final class UpdateScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::DOCTOR;
    }

    public function rules(): array
    {
        return [
            'branch_id' => [
                'sometimes',
                'uuid',
                Rule::exists('clinic_branches', 'id')->where('is_active', true),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null) {
                        return;
                    }
                    $parentActive = DB::table('clinic_branches as cb')
                        ->join('clinics as c', 'c.id', '=', 'cb.clinic_id')
                        ->where('cb.id', $value)
                        ->where('c.is_active', true)
                        ->exists();
                    if (! $parentActive) {
                        $fail('La clínica a la que pertenece esta sede está inactiva.');
                    }
                },
            ],
            'day_of_week'           => ['sometimes', new Enum(DayOfWeek::class)],
            'start_time'            => ['sometimes', 'date_format:H:i'],
            'end_time'              => ['sometimes', 'date_format:H:i', 'after:start_time'],
            'slot_duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:240'],
            'is_active'             => ['sometimes', 'boolean'],
        ];
    }
}
