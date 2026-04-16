<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalRecord\StoreVitalSignRequest;
use App\Models\MedicalRecord;
use App\Services\MedicalRecordService;
use App\Services\VitalSignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class VitalSignController extends Controller
{
    public function __construct(
        private readonly VitalSignService $vitalSignService,
        private readonly MedicalRecordService $medicalRecordService,
    ) {}

    public function index(Request $request, MedicalRecord $medicalRecord): JsonResponse
    {
        $this->medicalRecordService->authorizeAccess($request->user(), $medicalRecord);

        $vitalSigns = $this->vitalSignService->listForRecord($medicalRecord);

        return response()->json([
            'status'  => 'success',
            'message' => 'Signos vitales obtenidos correctamente.',
            'data'    => $vitalSigns,
        ]);
    }

    public function store(StoreVitalSignRequest $request, MedicalRecord $medicalRecord): JsonResponse
    {
        $vitalSign = $this->vitalSignService->create(
            $request->user(),
            $medicalRecord,
            $request->validated(),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Signos vitales registrados correctamente.',
            'data'    => $vitalSign,
        ], Response::HTTP_CREATED);
    }
}
