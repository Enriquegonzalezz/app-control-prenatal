<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpsertFcmTokenRequest;
use App\Models\FcmToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class FcmTokenController extends Controller
{
    /**
     * POST /api/v1/user/fcm-token
     *
     * Registra o actualiza el token FCM del dispositivo actual.
     * Si el token ya existe para otro usuario, lo reasigna al usuario actual
     * (manejo de tokens reciclados por el sistema operativo).
     */
    public function upsert(UpsertFcmTokenRequest $request): JsonResponse
    {
        $user  = $request->user();
        $token = $request->validated('token');
        $type  = $request->validated('device_type', 'unknown');

        FcmToken::updateOrCreate(
            ['token' => $token],
            [
                'user_id'      => $user->id,
                'device_type'  => $type,
                'is_active'    => true,
                'last_used_at' => now(),
            ],
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Token FCM registrado.',
            'data'    => null,
        ]);
    }

    /**
     * DELETE /api/v1/user/fcm-token
     *
     * Desregistra el token FCM (llamar al cerrar sesión).
     */
    public function destroy(Request $request): JsonResponse
    {
        $token = $request->input('token');

        if ($token) {
            FcmToken::where('token', $token)
                ->where('user_id', $request->user()->id)
                ->update(['is_active' => false]);
        } else {
            // Sin token específico → desactivar todos los del usuario
            FcmToken::where('user_id', $request->user()->id)
                ->update(['is_active' => false]);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Token FCM desregistrado.',
            'data'    => null,
        ]);
    }
}
