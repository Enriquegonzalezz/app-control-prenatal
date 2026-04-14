<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

final class UpsertFcmTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'token'       => ['required', 'string', 'min:10', 'max:4096'],
            'device_type' => ['sometimes', 'string', 'in:android,ios,web,unknown'],
        ];
    }
}
