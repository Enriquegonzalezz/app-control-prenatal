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
    /**
     * Lista todos los médicos activos sin filtro geoespacial con paginación.
     * Muestra tanto verificados como no verificados (marcados en el response).
     *
     * @return array{data: Collection, pagination: array}
     */
    public function listAllDoctors(
        int $perPage = self::DEFAULT_LIMIT,
        ?string $search = null,
        ?string $specialtyId = null,
    ): array {
        $perPage = min(max($perPage, 1), self::MAX_LIMIT);

        $query = DB::table('doctor_profiles as dp')
            ->join('users as u', 'u.id', '=', 'dp.user_id')
            ->join('specialties as sp', 'sp.id', '=', 'dp.specialty_id')
            ->leftJoin('clinic_doctors as cd', fn ($j) => $j->on('cd.doctor_id', '=', 'u.id')->where('cd.is_active', true))
            ->leftJoin('clinics as c', 'c.id', '=', 'cd.clinic_id')
            ->leftJoin('clinic_branches as cb', 'cb.id', '=', 'cd.branch_id')
            ->where('u.is_active', true)
            ->where('dp.is_verified', true)
            ->when($specialtyId, fn ($q) => $q->where('dp.specialty_id', $specialtyId))
            ->when($search, function ($q) use ($search) {
                $term = '%' . mb_strtolower($search) . '%';
                $q->where(function ($inner) use ($term) {
                    $inner->whereRaw('LOWER(u.name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(c.name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(sp.name) LIKE ?', [$term]);
                });
            })
            ->select([
                'dp.id as doctor_profile_id',
                'dp.is_verified',
                'dp.is_available',
                'dp.consultation_fee',
                'dp.years_experience',
                'dp.bio',
                'u.id as user_id',
                'u.name as full_name',
                'u.avatar_url',
                'sp.id as specialty_id',
                'sp.name as specialty_name',
                'sp.slug as specialty_slug',
                'c.id as clinic_id',
                'c.name as clinic_name',
                'c.logo_url as clinic_logo_url',
                'cb.id as branch_id',
                'cb.name as branch_name',
                'cb.address as branch_address',
                'cb.phone as branch_phone',
            ])
            ->orderByDesc('dp.is_verified')
            ->orderBy('u.name');

        $paginator = $query->paginate($perPage);

        $doctors = collect($paginator->items())->map(fn (object $row): array => [
            'doctor_profile_id'   => $row->doctor_profile_id,
            'user_id'             => $row->user_id,
            'full_name'           => $row->full_name,
            'avatar_url'          => $row->avatar_url ?? null,
            'specialty' => [
                'id'   => $row->specialty_id,
                'name' => $row->specialty_name,
                'slug' => $row->specialty_slug,
            ],
            'clinic' => [
                'id'       => $row->clinic_id ?? '',
                'name'     => $row->clinic_name ?? 'Sin clínica',
                'logo_url' => $row->clinic_logo_url ?? null,
            ],
            'branch' => [
                'id'      => $row->branch_id ?? '',
                'name'    => $row->branch_name ?? '',
                'address' => $row->branch_address ?? '',
                'phone'   => $row->branch_phone ?? '',
            ],
            'distance_m'          => null,
            'is_available'        => (bool) $row->is_available,
            'is_verified'         => (bool) $row->is_verified,
            'next_available_slot' => null,
            'consultation_fee'    => $row->consultation_fee !== null ? (float) $row->consultation_fee : null,
            'years_experience'    => (int) ($row->years_experience ?? 0),
            'bio'                 => $row->bio ?? null,
        ]);

        return [
            'data' => $doctors,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
        ];
    }

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
