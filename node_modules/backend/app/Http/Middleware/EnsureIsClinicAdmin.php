<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureIsClinicAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isClinicAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado. Solo administradores de clínica pueden acceder a este recurso.',
            ], 403);
        }

        return $next($request);
    }
}
