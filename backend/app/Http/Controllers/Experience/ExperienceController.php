<?php

declare(strict_types=1);

namespace App\Http\Controllers\Experience;

use App\Http\Controllers\Controller;
use App\Http\Requests\Experience\StoreExperienceRequest;
use App\Http\Requests\Experience\UpdateExperienceRequest;
use App\Models\Experience;
use App\Services\ExperienceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class ExperienceController extends Controller
{
    public function __construct(
        private readonly ExperienceService $experienceService,
    ) {}

    /**
     * Lista experiencias.
     *  - ?doctor_id=uuid  → experiencias publicadas de ese médico (pública)
     *  - sin parámetro    → experiencias del paciente autenticado
     */
    public function index(Request $request): JsonResponse
    {
        if ($request->has('doctor_id')) {
            $experiences = $this->experienceService->listForDoctor(
                (string) $request->query('doctor_id'),
                (int) $request->query('limit', 20),
            );
        } else {
            $experiences = $this->experienceService->listForPatient($request->user());
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Experiencias obtenidas correctamente.',
            'data'    => $experiences,
        ]);
    }

    public function store(StoreExperienceRequest $request): JsonResponse
    {
        try {
            $experience = $this->experienceService->create($request->user(), $request->validated());
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Experiencia compartida correctamente.',
            'data'    => $experience,
        ], Response::HTTP_CREATED);
    }

    public function update(UpdateExperienceRequest $request, Experience $experience): JsonResponse
    {
        try {
            $experience = $this->experienceService->update(
                $request->user(),
                $experience,
                $request->validated(),
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Experiencia actualizada correctamente.',
            'data'    => $experience,
        ]);
    }

    /**
     * Catálogo de tags disponibles.
     */
    public function tags(): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Tags obtenidos correctamente.',
            'data'    => $this->experienceService->listTags(),
        ]);
    }

    /**
     * Badges agrupados para el perfil del médico.
     */
    public function badges(Request $request): JsonResponse
    {
        $doctorId = (string) $request->query('doctor_id', '');

        if (!$doctorId) {
            return $this->errorResponse('Se requiere doctor_id.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Badges obtenidos correctamente.',
            'data'    => $this->experienceService->doctorBadges($doctorId),
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
