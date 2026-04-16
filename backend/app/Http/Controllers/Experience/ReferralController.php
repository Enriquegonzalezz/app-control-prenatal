<?php

declare(strict_types=1);

namespace App\Http\Controllers\Experience;

use App\Http\Controllers\Controller;
use App\Http\Requests\Experience\StoreReferralRequest;
use App\Services\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

final class ReferralController extends Controller
{
    public function __construct(
        private readonly ReferralService $referralService,
    ) {}

    /**
     * Lista referidos.
     *  - Paciente: ve los que hizo
     *  - Médico: ve los que recibió
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $referrals = $user->isDoctor()
            ? $this->referralService->listForDoctor($user->id)
            : $this->referralService->listByReferrer($user);

        return response()->json([
            'status'  => 'success',
            'message' => 'Referidos obtenidos correctamente.',
            'data'    => $referrals,
        ]);
    }

    public function store(StoreReferralRequest $request): JsonResponse
    {
        try {
            $referral = $this->referralService->create($request->user(), $request->validated());
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Referido registrado correctamente.',
            'data'    => $referral,
        ], Response::HTTP_CREATED);
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
