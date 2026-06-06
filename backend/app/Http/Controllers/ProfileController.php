<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Doctor\UpdateDoctorProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isDoctor()) {
            $user->load('doctorProfile.specialty');
        } elseif ($user->isPatient()) {
            $user->load('patientProfile');
        }

        return response()->json([
            'status' => 'success',
            'data' => UserResource::make($user),
        ]);
    }

    public function doctorProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('doctorProfile.specialty');

        return response()->json([
            'status' => 'success',
            'data' => UserResource::make($user),
        ]);
    }

    /**
     * Actualiza el perfil profesional del médico (datos visibles para pacientes).
     * Completar estos campos es requisito para aparecer en el directorio.
     */
    public function updateDoctorProfile(UpdateDoctorProfileRequest $request): JsonResponse
    {
        $user    = $request->user();
        $profile = $user->doctorProfile;

        if (! $profile) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Perfil de médico no encontrado.',
                'data'    => null,
            ], Response::HTTP_NOT_FOUND);
        }

        $profile->update($request->validated());

        $user->load('doctorProfile.specialty');

        return response()->json([
            'status'  => 'success',
            'message' => 'Perfil profesional actualizado correctamente.',
            'data'    => UserResource::make($user),
        ]);
    }

    /**
     * Devuelve las clínicas y ramas asociadas al médico autenticado.
     * Usado para obtener el branch_id al crear horarios.
     */
    public function doctorClinicInfo(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctorProfile;

        if (! $doctor) {
            return response()->json(['status' => 'error', 'message' => 'Perfil de médico no encontrado.', 'data' => null], 404);
        }

        $rows = DB::table('clinic_doctors as cd')
            ->join('clinics as c', 'c.id', '=', 'cd.clinic_id')
            ->leftJoin('clinic_branches as cb', 'cb.id', '=', 'cd.branch_id')
            ->where('cd.doctor_id', $doctor->id)
            ->where('cd.is_active', true)
            ->where('c.is_active', true)
            ->where(function ($q) {
                $q->whereNull('cb.id')
                  ->orWhere('cb.is_active', true);
            })
            ->select(
                'c.id as clinic_id',
                'c.name as clinic_name',
                'cb.id as branch_id',
                'cb.name as branch_name',
                'cb.address'
            )
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $rows,
        ]);
    }

    public function patientProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('patientProfile');

        return response()->json([
            'status' => 'success',
            'data' => UserResource::make($user),
        ]);
    }
}
