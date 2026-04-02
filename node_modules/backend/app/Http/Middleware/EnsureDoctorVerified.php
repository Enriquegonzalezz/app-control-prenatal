<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDoctorVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->isDoctor()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado. Solo médicos pueden acceder a este recurso.',
            ], 403);
        }

        $doctorProfile = $user->doctorProfile;

        if (!$doctorProfile || !$doctorProfile->is_verified) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado. Tu cuenta de médico aún no está verificada.',
            ], 403);
        }

        return $next($request);
    }
}
