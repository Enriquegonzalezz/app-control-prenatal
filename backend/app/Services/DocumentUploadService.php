<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

final class DocumentUploadService
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

    private const SIGNED_URL_TTL = 900; // 15 min

    private const BUCKET = 'medical-files';

    public function __construct(
        private readonly MedicalRecordService $recordService,
    ) {}

    /**
     * Full pipeline: validate → upload to Storage → create medical_record → attach tags + appointment pivot.
     *
     * @param array{
     *   patient_id:     string,
     *   category_id:    string,
     *   subcategory_id: string,
     *   document_date:  string,
     *   description:    string,
     *   visibility:     string,
     *   tag_ids?:       string[],
     *   appointment_id?: string,
     *   doctor_id?:     string,
     * } $data
     */
    public function upload(User $uploader, UploadedFile $file, array $data): MedicalRecord
    {
        $this->assertCanUpload($uploader, $data['patient_id']);
        $this->validateFile($file);

        $storagePath = $this->buildStoragePath($data['patient_id'], $file);
        $this->uploadToStorage($storagePath, $file);

        return DB::transaction(function () use ($uploader, $file, $data, $storagePath): MedicalRecord {
            $record = MedicalRecord::create([
                'patient_id'     => $data['patient_id'],
                'uploader_id'    => $uploader->id,
                'uploader_role'  => $uploader->role->value === 'doctor' ? 'doctor' : 'patient',
                'doctor_id'      => $data['doctor_id'] ?? ($uploader->role->value === 'doctor' ? $uploader->id : null),
                'category_id'    => $data['category_id'],
                'subcategory_id' => $data['subcategory_id'],
                'document_date'  => $data['document_date'],
                'description'    => $data['description'],
                'visibility'     => $data['visibility'],
                'storage_path'   => $storagePath,
                'file_type'      => $file->getMimeType() ?? $file->getClientMimeType(),
                'file_size_kb'   => (int) ceil($file->getSize() / 1024),
                'title'          => null, // derived via getDisplayTitleAttribute
                'appointment_id' => $data['appointment_id'] ?? null,
            ]);

            // Attach tags (pivot)
            if (!empty($data['tag_ids'])) {
                $record->tags()->sync($data['tag_ids']);
            }

            // Appointment pivot
            if (!empty($data['appointment_id'])) {
                DB::table('appointment_files')->insertOrIgnore([
                    'appointment_id'    => $data['appointment_id'],
                    'medical_record_id' => $record->id,
                    'created_at'        => now(),
                ]);
            }

            return $record->load(['category', 'subcategory', 'tags', 'uploader', 'patient', 'doctor']);
        });
    }

    /**
     * Generates a 15-minute signed URL for a medical record's file.
     */
    public function getSignedUrl(User $requester, MedicalRecord $record): string
    {
        $this->recordService->authorizeAccess($requester, $record);

        if (!$record->storage_path) {
            throw new RuntimeException('Este registro no tiene archivo adjunto.');
        }

        return $this->createSignedUrl($record->storage_path);
    }

    // ── Private helpers ───────────────────────────────────────

    private function assertCanUpload(User $uploader, string $patientId): void
    {
        $role = $uploader->role->value;

        if ($role === 'patient') {
            // Patient can only upload to their own record
            if ((string) $uploader->id !== $patientId) {
                throw new RuntimeException('Solo puedes subir documentos a tu propio historial.');
            }
            return;
        }

        if ($role === 'doctor') {
            // Doctor must have an active relationship with the patient
            $exists = \App\Models\DoctorPatientRelationship::where('doctor_id', $uploader->id)
                ->where('patient_id', $patientId)
                ->where('status', \App\Enums\RelationshipStatus::ACTIVE->value)
                ->exists();

            if (!$exists) {
                throw new RuntimeException('No tienes una relación activa con este paciente.');
            }
            return;
        }

        throw new RuntimeException('Tu rol no permite subir archivos al historial médico.');
    }

    private function validateFile(UploadedFile $file): void
    {
        // getMimeType() uses finfo (content-based); can return null on some environments.
        // Fall back to the client-declared type so valid files from mobile apps aren't
        // rejected when finfo fails (e.g. empty result on Windows dev servers).
        $detectedMime = $file->getMimeType();
        $clientMime   = $file->getClientMimeType();

        $allowed = in_array($detectedMime, self::ALLOWED_MIMES, true)
                || in_array($clientMime, self::ALLOWED_MIMES, true);

        if (!$allowed) {
            throw new RuntimeException(
                'Tipo de archivo no permitido. Se aceptan PDF, JPG, PNG, WEBP y DICOM.'
            );
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw new RuntimeException('El archivo supera el límite de 20 MB.');
        }
    }

    private function buildStoragePath(string $patientId, UploadedFile $file): string
    {
        $ext = $file->getClientOriginalExtension() ?: 'bin';
        return "{$patientId}/documents/" . Str::uuid() . ".{$ext}";
    }

    private function uploadToStorage(string $storagePath, UploadedFile $file): void
    {
        $url = config('services.supabase.url')
            . '/storage/v1/object/'
            . self::BUCKET . '/'
            . $storagePath;

        $mime = $file->getMimeType() ?? 'application/octet-stream';

        $response = Http::withToken(config('services.supabase.key'))
            ->withHeaders(['Content-Type' => $mime])
            ->withBody($file->getContent(), $mime)
            ->post($url);

        if ($response->failed()) {
            throw new RuntimeException('Error al subir el archivo al storage: ' . $response->body());
        }
    }

    private function createSignedUrl(string $storagePath): string
    {
        $url = config('services.supabase.url')
            . '/storage/v1/object/sign/'
            . self::BUCKET . '/'
            . $storagePath;

        $response = Http::withToken(config('services.supabase.key'))
            ->post($url, ['expiresIn' => self::SIGNED_URL_TTL]);

        if ($response->failed()) {
            throw new RuntimeException('Error al generar la URL firmada.');
        }

        $signedPath = $response->json('signedURL');

        if (!$signedPath) {
            throw new RuntimeException('Respuesta inesperada de Supabase Storage.');
        }

        return config('services.supabase.url') . $signedPath;
    }
}