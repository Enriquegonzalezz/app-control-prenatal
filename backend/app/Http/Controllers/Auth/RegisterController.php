<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;

final class RegisterController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    public function __invoke(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->register($request->validated());

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'Usuario registrado exitosamente.',
                'data' => [
                    'user' => UserResource::make($user),
                    'token' => $token,
                    'role' => $user->role->value,
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al registrar el usuario.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
