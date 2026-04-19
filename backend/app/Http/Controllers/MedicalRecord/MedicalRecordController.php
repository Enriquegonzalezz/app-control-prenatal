<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalRecord\StoreMedicalRecordRequest;
use App\Http\Requests\MedicalRecord\UpdateMedicalRecordRequest;
use App\Http\Requests\MedicalRecord\UploadDocumentRequest;
use App\Models\DoctorPatientRelationship;
use App\Models\MedicalRecord;
use App\Models\RecordCategory;
use App\Models\RecordTag;
use App\Services\DocumentUploadService;
use App\Services\MedicalRecordService;
use App\Enums\RelationshipStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class MedicalRecordController extends Controller
{
    public function __construct(
        private readonly MedicalRecordService  $medicalRecordService,
        private readonly DocumentUploadService $documentUploadService,
    ) {}

    /**
     * GET /medical-records
     * Returns records for the authenticated user with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $records = $this->medicalRecordService->listForUser(
            $request->user(),
            $request->query(),
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Registros médicos obtenidos correctamente.',
            'data'    => $records,
        ]);
    }

    /**
     * GET /medical-records/catalog
     * Returns categories (with subcategories), tags, and the patient's related doctors.
     * Used by the upload form to populate dropdowns.
     */
    public function catalog(Request $request): JsonResponse
    {
        $categories = RecordCategory::with('subcategories')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'icon', 'color', 'sort_order']);

        $tags = RecordTag::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'color']);

        $user = $request->user();
        $doctors = collect();

        if ($user->role->value === 'patient') {
            $doctors = DoctorPatientRelationship::with('doctor:id,name,avatar_url')
                ->where('patient_id', $user->id)
                ->where('status', RelationshipStatus::ACTIVE->value)
                ->get()
                ->pluck('doctor')
                ->filter();
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Catálogo obtenido correctamente.',
            'data'    => compact('categories', 'tags', 'doctors'),
        ]);
    }

    /**
     * POST /medical-records/upload
     * Validates, uploads file to Supabase Storage, and creates a MedicalRecord.
     */
    public function upload(UploadDocumentRequest $request): JsonResponse
    {
        try {
            $record = $this->documentUploadService->upload(
                $request->user(),
                $request->file('file'),
                $request->validated(),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Documento subido correctamente.',
            'data'    => $record,
        ], Response::HTTP_CREATED);
    }

    /**
     * GET /medical-records/{medicalRecord}/signed-url
     * Returns a 15-minute signed URL for a document-type medical record.
     */
    public function signedUrl(Request $request, MedicalRecord $medicalRecord): JsonResponse
    {
        try {
            $url = $this->documentUploadService->getSignedUrl($request->user(), $medicalRecord);
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'URL firmada generada.',
            'data'    => ['url' => $url],
        ]);
    }

    /**
     * POST /medical-records
     * Creates a clinical note (doctor-originated, legacy flow).
     */
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