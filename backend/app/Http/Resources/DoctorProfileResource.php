<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class DoctorProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'specialty' => SpecialtyResource::make($this->whenLoaded('specialty')),
            'license_number' => $this->license_number,
            'university' => $this->university,
            'years_experience' => $this->years_experience,
            'consultation_fee' => $this->consultation_fee,
            'bio' => $this->bio,
            'is_verified' => $this->is_verified,
            'is_available' => $this->is_available,
            'experience_count' => $this->experience_count,
            'next_available_slot' => $this->next_available_slot?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
