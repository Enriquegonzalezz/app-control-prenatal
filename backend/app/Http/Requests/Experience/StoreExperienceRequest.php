<?php

declare(strict_types=1);

namespace App\Http\Requests\Experience;

use App\Enums\ExperiencePrivacy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class StoreExperienceRequest extends FormRequest
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
            'appointment_id' => ['required', 'uuid', 'exists:appointments,id'],
            'body'           => ['required', 'string', 'min:50', 'max:1000'],
            'privacy'        => ['nullable', new Enum(ExperiencePrivacy::class)],
            'tag_ids'        => ['nullable', 'array', 'max:5'],
            'tag_ids.*'      => ['uuid', 'exists:experience_tags,id'],
        ];
    }
}
