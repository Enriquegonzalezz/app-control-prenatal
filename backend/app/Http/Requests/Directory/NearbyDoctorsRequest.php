<?php

declare(strict_types=1);

namespace App\Http\Requests\Directory;

use App\Services\DirectoryService;
use Illuminate\Foundation\Http\FormRequest;

final class NearbyDoctorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat'          => ['required', 'numeric', 'between:-90,90'],
            'lng'          => ['required', 'numeric', 'between:-180,180'],
            'radius'       => ['sometimes', 'integer', 'min:100', 'max:' . DirectoryService::MAX_RADIUS_M],
            'specialty_id' => ['sometimes', 'nullable', 'uuid', 'exists:specialties,id'],
            'limit'        => ['sometimes', 'integer', 'min:1', 'max:' . DirectoryService::MAX_LIMIT],
        ];
    }

    public function messages(): array
    {
        return [
            'lat.required' => 'La latitud es obligatoria.',
            'lng.required' => 'La longitud es obligatoria.',
            'lat.between'  => 'La latitud debe estar entre -90 y 90.',
            'lng.between'  => 'La longitud debe estar entre -180 y 180.',
            'specialty_id.exists' => 'La especialidad indicada no existe.',
        ];
    }
}
