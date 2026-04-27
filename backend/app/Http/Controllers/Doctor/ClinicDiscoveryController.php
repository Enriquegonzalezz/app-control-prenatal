<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ClinicDiscoveryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search'   => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $doctor  = $request->user()->doctorProfile;
        $search  = $request->query('search');
        $perPage = (int) ($request->query('per_page', 15));

        $linkedIds = DB::table('clinic_doctors')
            ->where('doctor_id', $doctor->id)
            ->pluck('clinic_id');

        $query = DB::table('clinics as c')
            ->leftJoin('clinic_branches as cb', 'cb.clinic_id', '=', 'c.id')
            ->where('c.is_active', true)
            ->whereNotIn('c.id', $linkedIds)
            ->select(
                'c.id',
                'c.name',
                'c.logo_url',
                'c.phone',
                'c.email',
                DB::raw('COUNT(cb.id) as branch_count'),
            )
            ->groupBy('c.id', 'c.name', 'c.logo_url', 'c.phone', 'c.email')
            ->orderBy('c.name');

        if ($search !== null && $search !== '') {
            $query->where('c.name', 'ilike', "%{$search}%");
        }

        return response()->json([
            'status' => 'success',
            'data'   => $query->paginate($perPage),
        ]);
    }
}
