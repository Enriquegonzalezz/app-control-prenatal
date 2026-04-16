<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalRecord\StoreMedicalRecordRequest;
use App\Http\Requests\MedicalRecord\UpdateMedicalRecordRequest;
use App\Models\MedicalRecord;
use App\Services\MedicalRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class MedicalRecordController extends Controller
{
    public function __construct(
        private readonly MedicalRecordService $medicalRecordService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $records = $this->medicalRecordService->listForUser(
            $request->user(),
            $request->query('patient_id'),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Registros médicos obtenidos correctamente.',
            'data'    => $records,
        ]);
    }

    public function store(StoreMedicalRecordRequest $request): JsonResponse
    {
        try {
            $record = $this->medicalRecordService->create(
                $request->user(),
                $request->validated(),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Registro médico creado correctamente.',
            'data'    => $record->load(['doctor', 'patient', 'specialty']),
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, MedicalRecord $medicalRecord): JsonResponse
    {
        $record = $this->medicalRecordService->findForUser($request->user(), $medicalRecord);

        return response()->json([
            'status'  => 'success',
            'message' => 'Registro médico obtenido correctamente.',
            'data'    => $record,
        ]);
    }

    public function update(UpdateMedicalRecordRequest $request, MedicalRecord $medicalRecord): JsonResponse
    {
        try {
            $record = $this->medicalRecordService->update(
                $request->user(),
                $medicalRecord,
                $request->validated(),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_FORBIDDEN);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Registro médico actualizado correctamente.',
            'data'    => $record,
        ]);
    }

    private function errorResponse(string $message, int $status): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => $message,
            'data'    => null,
        ], $status);
    }
}
