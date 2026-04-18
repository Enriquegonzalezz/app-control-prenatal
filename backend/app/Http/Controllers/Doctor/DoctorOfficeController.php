<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\DoctorOffice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class DoctorOfficeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $doctor  = $request->user()->doctorProfile;
        $offices = $doctor->offices()->where('is_active', true)->orderBy('created_at')->get();

        return response()->json([
            'status' => 'success',
            'data'   => $offices,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'    => ['required', 'string', 'max:150'],
            'type'    => ['required', 'in:office,home'],
            'address' => ['nullable', 'string', 'max:500'],
            'city'    => ['nullable', 'string', 'max:100'],
            'state'   => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'phone'   => ['nullable', 'string', 'max:30'],
        ]);

        $doctor = $request->user()->doctorProfile;
        $office = $doctor->offices()->create(array_merge($data, ['is_active' => true]));

        return response()->json([
            'status'  => 'success',
            'message' => 'Ubicación creada correctamente.',
            'data'    => $office,
        ], Response::HTTP_CREATED);
    }

    public function destroy(Request $request, DoctorOffice $office): JsonResponse
    {
        if ($office->doctor_id !== $request->user()->doctorProfile?->id) {
            abort(Response::HTTP_FORBIDDEN, 'No puedes eliminar una ubicación que no te pertenece.');
        }

        $office->delete();

        return response()->json([
            'status' => 'success',
            'data'   => null,
        ]);
    }
}
