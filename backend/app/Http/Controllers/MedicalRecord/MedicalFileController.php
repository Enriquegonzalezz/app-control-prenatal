<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecord;

use App\Enums\FileCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\MedicalRecord\UploadMedicalFileRequest;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordFile;
use App\Services\MedicalFileService;
use App\Services\MedicalRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class MedicalFileController extends Controller
{
    public function __construct(
        private readonly MedicalFileService $medicalFileService,
        private readonly MedicalRecordService $medicalRecordService,
    ) {}

    public function index(Request $request, MedicalRecord $medicalRecord): JsonResponse
    {
        $this->medicalRecordService->authorizeAccess($request->user(), $medicalRecord);

        $files = $this->medicalFileService->listForRecord($medicalRecord);

        return response()->json([
            'status'  => 'success',
            'message' => 'Archivos del registro obtenidos correctamente.',
            'data'    => $files,
        ]);
    }

    public function store(UploadMedicalFileRequest $request, MedicalRecord $medicalRecord): JsonResponse
    {
        try {
            $file = $this->medicalFileService->upload(
                $request->user(),
                $medicalRecord,
                $request->file('file'),
                FileCategory::from($request->validated('category')),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Archivo subido correctamente.',
            'data'    => $file,
        ], Response::HTTP_CREATED);
    }

    /**
     * Genera una Signed URL de 15 minutos para descargar el archivo.
     */
    public function signedUrl(Request $request, MedicalRecord $medicalRecord, MedicalRecordFile $file): JsonResponse
    {
        // Verificar que el archivo pertenece al registro indicado
        if ($file->medical_record_id !== $medicalRecord->id) {
            return $this->errorResponse('Archivo no encontrado en este registro.', Response::HTTP_NOT_FOUND);
        }

        try {
            $url = $this->medicalFileService->getSignedUrl($request->user(), $file);
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'URL firmada generada correctamente.',
            'data'    => [
                'url'        => $url,
                'expires_in' => 900,
            ],
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
