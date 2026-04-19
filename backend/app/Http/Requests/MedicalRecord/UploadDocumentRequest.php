<?php

declare(strict_types=1);

namespace App\Http\Requests\MedicalRecord;

use Illuminate\Foundation\Http\FormRequest;

final class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role + relationship checks handled in DocumentUploadService
    }

    public function rules(): array
    {
        return [
            'patient_id'     => ['required', 'uuid', 'exists:users,id'],
            'category_id'    => ['required', 'uuid', 'exists:record_categories,id'],
            'subcategory_id' => ['required', 'uuid', 'exists:record_subcategories,id'],
            'document_date'  => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'description'    => ['required', 'string', 'min:10', 'max:1000'],
            'visibility'     => ['required', 'in:shared,private'],
            'file'           => ['required', 'file', 'max:20480'], // 20 MB
            'tag_ids'        => ['sometimes', 'array'],
            'tag_ids.*'      => ['uuid', 'exists:record_tags,id'],
            'appointment_id' => ['sometimes', 'nullable', 'uuid', 'exists:appointments,id'],
            'doctor_id'      => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'description.min'           => 'La descripción debe tener al menos 10 caracteres.',
            'document_date.before_or_equal' => 'La fecha del documento no puede ser futura.',
            'file.max'                  => 'El archivo no puede superar los 20 MB.',
            'visibility.in'             => 'La visibilidad debe ser "shared" o "private".',
        ];
    }
}