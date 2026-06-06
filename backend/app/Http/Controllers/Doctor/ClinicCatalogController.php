<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo de clínicas verificadas (activas) con sus sedes activas.
 *
 * Alimenta el dropdown de creación de horarios: el médico SOLO puede crear
 * slots en una clínica que exista y esté activa en la base de datos. No se
 * permite escribir clínicas a mano (no más consultorios propios libres).
 *
 * A diferencia de /doctor/clinics/discover, este catálogo incluye también las
 * clínicas a las que el médico ya está vinculado (puede crear horarios en ellas).
 */
final class ClinicCatalogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $search = $request->query('search');

        $clinics = DB::table('clinics as c')
            ->where('c.is_active', true)
            ->when($search, fn ($q) => $q->where('c.name', 'ilike', "%{$search}%"))
            ->orderBy('c.name')
            ->limit(300)
            ->get(['c.id', 'c.name', 'c.logo_url']);

        $clinicIds = $clinics->pluck('id');

        $branches = DB::table('clinic_branches as cb')
            ->whereIn('cb.clinic_id', $clinicIds)
            ->where('cb.is_active', true)
            ->orderBy('cb.name')
            ->get(['cb.id', 'cb.clinic_id', 'cb.name', 'cb.address', 'cb.phone']);

        $branchesByClinic = $branches->groupBy('clinic_id');

        $data = $clinics->map(fn (object $c): array => [
            'id'       => $c->id,
            'name'     => $c->name,
            'logo_url' => $c->logo_url,
            'branches' => ($branchesByClinic[$c->id] ?? collect())
                ->map(fn (object $b): array => [
                    'id'      => $b->id,
                    'name'    => $b->name,
                    'address' => $b->address,
                    'phone'   => $b->phone,
                ])
                ->values(),
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => $data,
        ]);
    }
}
