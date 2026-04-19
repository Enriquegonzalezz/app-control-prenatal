<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\FileCategory;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordFile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

final class MedicalFileService
{
    private const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/dicom',
        'application/octet-stream', // DICOM fallback
    ];

    private const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

    private const SIGNED_URL_TTL = 900; // 15 minutos

    private const BUCKET = 'medical-files';

    public function __construct(
        private readonly MedicalRecordService $medicalRecordService,
    ) {}

    /**
     * Valida, sube y registra un archivo en el historial médico.
     */
    public function upload(
        User $uploader,
        MedicalRecord $record,
        UploadedFile $file,
        FileCategory $category,
    ): MedicalRecordFile {
        $this->medicalRecordService->authorizeAccess($uploader, $record);

        $this->validateFile($file);

        $storagePath = $this->buildStoragePath(
            $record->patient_id,
            $category,
            $file->getClientOriginalExtension() ?: 'bin',
        );

        $this->uploadToStorage($storagePath, $file);

        return MedicalRecordFile::create([
            'medical_record_id' => $record->id,
            'patient_id'        => $record->patient_id,
            'uploaded_by'       => $uploader->id,
            'file_name'         => $file->getClientOriginalName(),
            'storage_path'      => $storagePath,
            'mime_type'         => $file->getMimeType() ?? $file->getClientMimeType(),
            'file_size_bytes'   => $file->getSize(),
            'category'          => $category,
        ]);
    }

    /**
     * Genera una Signed URL de 15 minutos para un archivo.
     * Solo el paciente propietario o un médico asignado activo puede obtenerla.
     */
    public function getSignedUrl(User $requester, MedicalRecordFile $fileRecord): string
    {
        // Reusar la autorización del registro padre
        $this->medicalRecordService->authorizeAccess($requester, $fileRecord->medicalRecord);

        return $this->createSignedUrl($fileRecord->storage_path);
    }

    /**
     * Lista los archivos de un registro médico (sin URLs: el cliente las solicita individualmente).
     */
    public function listForRecord(MedicalRecord $record): \Illuminate\Support\Collection
    {
        return $record->files()
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // ── privados ──────────────────────────────────────────────

    private function validateFile(UploadedFile $file): void
    {
        $detectedMime = $file->getMimeType();
        $clientMime   = $file->getClientMimeType();

        $allowed = in_array($detectedMime, self::ALLOWED_MIMES, true)
                || in_array($clientMime, self::ALLOWED_MIMES, true);

        if (!$allowed) {
            throw new RuntimeException(
                'Tipo de archivo no permitido. Se aceptan PDF, JPEG, PNG, WEBP y DICOM.'
            );
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw new RuntimeException('El archivo supera el límite de 20 MB.');
        }
    }

    /**
     * Ruta dentro del bucket: {patient_uuid}/{category}/{uuid}.{ext}
     */
    private function buildStoragePath(string $patientId, FileCategory $category, string $ext): string
    {
        return "{$patientId}/{$category->folder()}/" . Str::uuid() . ".{$ext}";
    }

    /**
     * Sube el archivo a Supabase Storage vía REST API.
     */
    private function uploadToStorage(string $storagePath, UploadedFile $file): void
    {
        $url = config('services.supabase.url')
            . '/storage/v1/object/'
            . self::BUCKET . '/'
            . $storagePath;

        $mime = $file->getMimeType() ?? $file->getClientMimeType() ?? 'application/octet-stream';

        $response = $this->supabaseHttp()
            ->withHeaders(['Content-Type' => $mime])
            ->withBody($file->getContent(), $mime)
            ->post($url);

        if ($response->failed()) {
            throw new RuntimeException(
                'Error al subir el archivo [' . $response->status() . ']: ' . $response->body()
            );
        }
    }

    /**
     * Solicita una URL firmada de 15 minutos a Supabase Storage.
     */
    private function createSignedUrl(string $storagePath): string
    {
        $base = rtrim((string) config('services.supabase.url'), '/');

        $url = $base . '/storage/v1/object/sign/' . self::BUCKET . '/' . $storagePath;

        $response = $this->supabaseHttp()
            ->post($url, ['expiresIn' => self::SIGNED_URL_TTL]);

        if ($response->failed()) {
            throw new RuntimeException('Error al generar la URL firmada [' . $response->status() . ']: ' . $response->body());
        }

        // Supabase may return 'signedURL' (older) or 'signedUrl' (newer) — handle both.
        $signedPath = $response->json('signedURL') ?? $response->json('signedUrl');

        if (!$signedPath) {
            throw new RuntimeException('Respuesta inesperada de Supabase Storage: ' . $response->body());
        }

        // If Supabase already returns a full URL, use it directly.
        if (str_starts_with($signedPath, 'http')) {
            return $signedPath;
        }

        return $base . $signedPath;
    }

    private function supabaseHttp(): \Illuminate\Http\Client\PendingRequest
    {
        $key = config('services.supabase.key');

        if (empty($key)) {
            throw new RuntimeException(
                'Supabase service_role key no configurada. Revisa SUPABASE_SERVICE_KEY en las variables de entorno.'
            );
        }

        return Http::withToken($key)
            ->withHeaders(['apikey' => $key]);
    }
}
