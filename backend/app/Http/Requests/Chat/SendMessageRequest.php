<?php

declare(strict_types=1);

namespace App\Http\Requests\Chat;

use App\Enums\MessageType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'min:1', 'max:4000'],
            'type'    => ['nullable', new Enum(MessageType::class)],
        ];
    }
}
