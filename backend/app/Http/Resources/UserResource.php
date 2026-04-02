<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'cedula' => $this->cedula,
            'role' => $this->role->value,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_url,
            'theme_preference' => $this->theme_preference->value,
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'doctor_profile' => DoctorProfileResource::make($this->whenLoaded('doctorProfile')),
            'patient_profile' => PatientProfileResource::make($this->whenLoaded('patientProfile')),
        ];
    }
}
