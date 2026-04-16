<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalRecord;

use App\Enums\FileCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class UploadMedicalFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Paciente y médico pueden subir archivos
        return in_array($this->user()?->role->value, ['patient', 'doctor'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file'     => [
                'required',
                'file',
                'max:10240',   // 10 MB en kilobytes
                'mimes:pdf,jpeg,jpg,png,webp',
            ],
            'category' => ['required', new Enum(FileCategory::class)],
        ];
    }
}
