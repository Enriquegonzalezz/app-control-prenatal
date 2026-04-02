<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'doctor' => \App\Http\Middleware\EnsureIsDoctor::class,
            'patient' => \App\Http\Middleware\EnsureIsPatient::class,
            'clinic_admin' => \App\Http\Middleware\EnsureIsClinicAdmin::class,
            'doctor_verified' => \App\Http\Middleware\EnsureDoctorVerified::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
