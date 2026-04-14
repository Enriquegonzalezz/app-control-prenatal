<?php

use App\Http\Controllers\Appointment\AppointmentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\User\FcmTokenController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Directory\DirectoryController;
use App\Http\Controllers\Doctor\ScheduleController;
use App\Http\Controllers\Doctor\SlotController;
use App\Http\Controllers\Doctor\VerificationController;
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

    // Directorio geoespacial público: pacientes y visitantes pueden explorar
    // médicos verificados sin autenticarse.
    Route::get('/doctors/nearby', [DirectoryController::class, 'nearby'])->name('doctors.nearby');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', LogoutController::class)->name('auth.logout');

        Route::get('/user', [ProfileController::class, 'show'])->name('user.profile');

        // Token FCM — registrar/desregistrar token de dispositivo para push notifications
        Route::post('/user/fcm-token',   [FcmTokenController::class, 'upsert'])->name('user.fcm-token.upsert');
        Route::delete('/user/fcm-token', [FcmTokenController::class, 'destroy'])->name('user.fcm-token.destroy');

        Route::middleware('doctor')->prefix('doctor')->group(function (): void {
            Route::get('/profile', [ProfileController::class, 'doctorProfile'])->name('doctor.profile');

            // Verificación OTP — disponible para médicos aún no verificados (Δ-5)
            Route::prefix('verification')->group(function (): void {
                Route::post('/request-code', [VerificationController::class, 'requestCode'])->name('doctor.verification.request');
                Route::post('/verify-code',  [VerificationController::class, 'verifyCode'])->name('doctor.verification.verify');
                Route::get('/status',        [VerificationController::class, 'status'])->name('doctor.verification.status');
            });

            // Horarios y slots — requieren médico verificado (Sprint 2)
            Route::middleware('doctor_verified')->group(function (): void {
                Route::get('/schedules',             [ScheduleController::class, 'index'])->name('doctor.schedules.index');
                Route::post('/schedules',            [ScheduleController::class, 'store'])->name('doctor.schedules.store');
                Route::patch('/schedules/{schedule}', [ScheduleController::class, 'update'])->name('doctor.schedules.update');
                Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy'])->name('doctor.schedules.destroy');
                Route::post('/schedules/{schedule}/generate-slots', [ScheduleController::class, 'generateSlots'])->name('doctor.schedules.generate-slots');

                Route::get('/slots',                  [SlotController::class, 'index'])->name('doctor.slots.index');
                Route::patch('/slots/{slot}/status',  [SlotController::class, 'updateStatus'])->name('doctor.slots.update-status');
                Route::delete('/slots/{slot}',        [SlotController::class, 'destroy'])->name('doctor.slots.destroy');
            });
        });

        Route::middleware('patient')->prefix('patient')->group(function (): void {
            Route::get('/profile', [ProfileController::class, 'patientProfile'])->name('patient.profile');
        });

        // Citas — accesibles a pacientes, médicos (verificados) y clínicas.
        // Las acciones específicas se autorizan en el service/controller por rol.
        Route::prefix('appointments')->group(function (): void {
            Route::get('/',                         [AppointmentController::class, 'index'])->name('appointments.index');
            Route::get('/{appointment}',            [AppointmentController::class, 'show'])->name('appointments.show');

            // Paciente reserva
            Route::post('/',                        [AppointmentController::class, 'book'])->name('appointments.book');

            // Paciente o médico cancelan
            Route::post('/{appointment}/cancel',    [AppointmentController::class, 'cancel'])->name('appointments.cancel');

            // Médico confirma / completa / no-show (requiere médico verificado)
            Route::middleware('doctor_verified')->group(function (): void {
                Route::post('/{appointment}/confirm',  [AppointmentController::class, 'confirm'])->name('appointments.confirm');
                Route::post('/{appointment}/complete', [AppointmentController::class, 'complete'])->name('appointments.complete');
                Route::post('/{appointment}/no-show',  [AppointmentController::class, 'noShow'])->name('appointments.no-show');
            });
        });

        Route::middleware('clinic_admin')->prefix('clinic')->group(function (): void {
            // Clinic admin routes will be added here
        });
    });
});
