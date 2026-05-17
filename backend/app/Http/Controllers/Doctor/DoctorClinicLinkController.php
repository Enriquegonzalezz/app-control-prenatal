<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Vinculación auto-iniciada por el médico hacia una clínica.
 *
 * Modelo de negocio: las clínicas NO registran ni vinculan médicos.
 * Cada médico (ya verificado via OTP) selecciona desde la app la(s)
 * clínica(s) donde atiende, opcionalmente especificando la sede.
 */
final class DoctorClinicLinkController extends Controller
{
    /**
     * Listar clínicas a las que el médico autenticado está vinculado.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $links = DB::table('clinic_doctors as cd')
            ->join('clinics as c', 'c.id', '=', 'cd.clinic_id')
            ->leftJoin('clinic_branches as cb', 'cb.id', '=', 'cd.branch_id')
            ->where('cd.doctor_id', $userId)
            ->select(
                'c.id as clinic_id',
                'c.name as clinic_name',
                'c.logo_url',
                'cb.id as branch_id',
                'cb.name as branch_name',
                'cb.address as branch_address',
                'cd.is_active',
                'cd.joined_at',
            )
            ->orderBy('c.name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $links,
        ]);
    }

    /**
     * Vincula al médico autenticado a una clínica.
     * Opcionalmente acepta branch_id para indicar la sede de atención.
     */
    public function store(Request $request, Clinic $clinic): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => ['nullable', 'uuid'],
        ]);

        if (! $clinic->is_active) {
            return response()->json([
                'status'  => 'error',
                'message' => 'La clínica seleccionada no está activa.',
            ], 422);
        }

        $userId = $request->user()->id;

        // Validar sede si se envió
        if (! empty($data['branch_id'])) {
            $branch = DB::table('clinic_branches')
                ->where('id', $data['branch_id'])
                ->where('clinic_id', $clinic->id)
                ->where('is_active', true)
                ->first();

            if (! $branch) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'La sede no pertenece a esta clínica o no está activa.',
                ], 422);
            }
        }

        // Idempotente: si ya existe, reactivar; si no, crear.
        $exists = DB::table('clinic_doctors')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $userId)
            ->exists();

        if ($exists) {
            DB::table('clinic_doctors')
                ->where('clinic_id', $clinic->id)
                ->where('doctor_id', $userId)
                ->update([
                    'branch_id'  => $data['branch_id'] ?? null,
                    'is_active'  => true,
                    'updated_at' => now(),
                ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Vinculación actualizada.',
            ]);
        }

        DB::table('clinic_doctors')->insert([
            'clinic_id'  => $clinic->id,
            'doctor_id'  => $userId,
            'branch_id'  => $data['branch_id'] ?? null,
            'is_active'  => true,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Te has vinculado a la clínica exitosamente.',
        ], 201);
    }

    /**
     * Desvincula al médico autenticado de una clínica.
     */
    public function destroy(Request $request, Clinic $clinic): JsonResponse
    {
        $userId = $request->user()->id;

        $deleted = DB::table('clinic_doctors')
            ->where('clinic_id', $clinic->id)
            ->where('doctor_id', $userId)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No estás vinculado a esa clínica.',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Te has desvinculado de la clínica.',
        ]);
    }
}
