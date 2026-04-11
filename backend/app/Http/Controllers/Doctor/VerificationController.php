<?php

declare(strict_types=1);

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Doctor\RequestVerificationCodeRequest;
use App\Http\Requests\Doctor\VerifyCodeRequest;
use App\Services\DoctorVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class VerificationController extends Controller
{
    public function __construct(
        private readonly DoctorVerificationService $verificationService
    ) {}

    /**
     * POST /api/v1/doctor/verification/request-code
     *
     * Solicita un nuevo código OTP. El código se envía al canal oficial
     * registrado en `verified_doctors`, no al email de registro del usuario.
     */
    public function requestCode(RequestVerificationCodeRequest $request): JsonResponse
    {
        try {
            $result = $this->verificationService->requestCode(
                $request->user(),
                $request->ip() ?? '',
                $request->userAgent() ?? '',
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Código de verificación enviado.',
                'data'    => $result,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al enviar el código de verificación.',
                'data'    => null,
            ], 500);
        }
    }

    /**
     * POST /api/v1/doctor/verification/verify-code
     *
     * Verifica el código OTP ingresado. Si es válido, activa is_verified = true
     * en el perfil del médico y desbloquea todas sus funcionalidades.
     */
    public function verifyCode(VerifyCodeRequest $request): JsonResponse
    {
        try {
            $this->verificationService->verifyCode(
                $request->user(),
                $request->validated('code'),
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Verificación completada. Ya puedes acceder a todas las funcionalidades.',
                'data'    => ['is_verified' => true],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'data'    => null,
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Error al verificar el código.',
                'data'    => null,
            ], 500);
        }
    }

    /**
     * GET /api/v1/doctor/verification/status
     *
     * Retorna el estado actual de verificación del médico autenticado.
     */
    public function status(Request $request): JsonResponse
    {
        $status = $this->verificationService->getStatus($request->user());

        return response()->json([
            'status'  => 'success',
            'message' => 'Estado de verificación obtenido.',
            'data'    => $status,
        ]);
    }
}
