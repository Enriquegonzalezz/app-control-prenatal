<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', function () {
        return response()->json([
            'status' => 'success',
            'message' => 'API is running',
            'timestamp' => now(),
        ]);
    });

    Route::post('/auth/register', RegisterController::class)->name('auth.register');
    Route::post('/auth/login', LoginController::class)->name('auth.login');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', LogoutController::class)->name('auth.logout');

        Route::get('/user', [ProfileController::class, 'show'])->name('user.profile');

        Route::middleware('doctor')->prefix('doctor')->group(function (): void {
            Route::get('/profile', [ProfileController::class, 'doctorProfile'])->name('doctor.profile');
        });

        Route::middleware('patient')->prefix('patient')->group(function (): void {
            Route::get('/profile', [ProfileController::class, 'patientProfile'])->name('patient.profile');
        });

        Route::middleware('clinic_admin')->prefix('clinic')->group(function (): void {
            // Clinic admin routes will be added here
        });
    });
});
