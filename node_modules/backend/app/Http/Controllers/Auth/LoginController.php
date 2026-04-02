<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;

final class LoginController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    public function __invoke(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->input('email'),
            $request->input('password')
        );

        if (!$result) {
            return response()->json([
                'status' => 'error',
                'message' => 'Credenciales inválidas o usuario inactivo.',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Inicio de sesión exitoso.',
            'data' => [
                'user' => UserResource::make($result['user']),
                'token' => $result['token'],
                'role' => $result['user']->role->value,
            ],
        ], 200);
    }
}
