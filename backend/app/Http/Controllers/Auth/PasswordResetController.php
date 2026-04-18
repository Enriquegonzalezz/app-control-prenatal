<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

final class PasswordResetController extends Controller
{
    /**
     * Solicita un código OTP para resetear contraseña.
     * Envía código por email (simulado en logs por ahora).
     */
    public function requestReset(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email inválido.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Por seguridad, no revelar si el email existe o no
            return response()->json([
                'status'  => 'success',
                'message' => 'Si el email existe, recibirás un código de verificación.',
            ], 200);
        }

        // Generar código OTP de 6 dígitos
        $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Guardar código en la tabla users (reutilizamos verification_code)
        $user->update([
            'verification_code'    => $code,
            'verification_sent_at' => now(),
        ]);

        // TODO: Enviar email real con el código
        // Por ahora solo logueamos
        \Log::info("Password reset OTP for {$user->email}: {$code}");

        return response()->json([
            'status'  => 'success',
            'message' => 'Si el email existe, recibirás un código de verificación.',
            'data'    => [
                'email' => $user->email,
                // Solo para testing - ELIMINAR en producción
                'debug_code' => config('app.debug') ? $code : null,
            ],
        ], 200);
    }

    /**
     * Valida el código OTP y resetea la contraseña.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'                => 'required|email',
            'code'                 => 'required|string|size:6',
            'password'             => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Datos inválidos.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        // En modo desarrollo, aceptar cualquier código para facilitar testing
        $isDebugMode = config('app.debug');
        
        if (!$isDebugMode) {
            // Validar código solo en producción
            if ($user->verification_code !== $request->code) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Código de verificación incorrecto.',
                ], 422);
            }

            // Validar que el código no haya expirado (15 minutos)
            if ($user->verification_sent_at && $user->verification_sent_at->diffInMinutes(now()) > 15) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'El código ha expirado. Solicita uno nuevo.',
                ], 422);
            }
        }

        // Actualizar contraseña y limpiar código
        $user->update([
            'password'             => Hash::make($request->password),
            'verification_code'    => null,
            'verification_sent_at' => null,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
        ], 200);
    }
}
