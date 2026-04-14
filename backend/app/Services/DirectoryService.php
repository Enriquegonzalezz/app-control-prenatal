<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class DirectoryService
{
    public const DEFAULT_RADIUS_M = 5000;
    public const MAX_RADIUS_M     = 50000;
    public const DEFAULT_LIMIT    = 20;
    public const MAX_LIMIT        = 50;

    /**
     * Busca médicos verificados cercanos a un punto geográfico.
     *
     * Delega la búsqueda al RPC `get_nearby_doctors` en Postgres, que usa el
     * índice GIST sobre `clinic_branches.location` para eficiencia.
     *
     * @return Collection<int, object>
     */
    public function findNearbyDoctors(
        float $lat,
        float $lng,
        int $radiusM = self::DEFAULT_RADIUS_M,
        ?string $specialtyId = null,
        int $limit = self::DEFAULT_LIMIT,
    ): Collection {
        $radiusM = min(max($radiusM, 100), self::MAX_RADIUS_M);
        $limit   = min(max($limit, 1), self::MAX_LIMIT);

        $rows = DB::select(
            'SELECT * FROM public.get_nearby_doctors(?, ?, ?, ?::uuid, ?)',
            [$lat, $lng, $radiusM, $specialtyId, $limit]
        );

        return collect($rows)->map(fn (object $row): array => [
            'doctor_profile_id'   => $row->doctor_profile_id,
            'user_id'             => $row->user_id,
            'full_name'           => $row->full_name,
            'avatar_url'          => $row->avatar_url,
            'specialty' => [
                'id'   => $row->specialty_id,
                'name' => $row->specialty_name,
                'slug' => $row->specialty_slug,
            ],
            'clinic' => [
                'id'       => $row->clinic_id,
                'name'     => $row->clinic_name,
                'logo_url' => $row->clinic_logo_url,
            ],
            'branch' => [
                'id'      => $row->branch_id,
                'name'    => $row->branch_name,
                'address' => $row->branch_address,
                'phone'   => $row->branch_phone,
            ],
            'distance_m'          => (float) $row->distance_m,
            'is_available'        => (bool) $row->is_available,
            'next_available_slot' => $row->next_available_slot,
            'consultation_fee'    => $row->consultation_fee !== null ? (float) $row->consultation_fee : null,
            'years_experience'    => (int) $row->years_experience,
            'bio'                 => $row->bio,
        ]);
    }
}
