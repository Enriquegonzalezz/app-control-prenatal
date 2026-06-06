<?php

use App\Http\Controllers\Appointment\AppointmentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\User\FcmTokenController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Directory\DirectoryController;
use App\Http\Controllers\Doctor\ClinicCatalogController;
use App\Http\Controllers\Doctor\ClinicDiscoveryController;
use App\Http\Controllers\Doctor\DoctorClinicLinkController;
use App\Http\Controllers\Doctor\DoctorOfficeController;
use App\Http\Controllers\Doctor\ScheduleController;
use App\Http\Controllers\Doctor\SlotController;
use App\Http\Controllers\Doctor\VerificationController;
use App\Http\Controllers\Chat\ChatController;
use App\Http\Controllers\Experience\ExperienceController;
use App\Http\Controllers\Experience\ReferralController;
use App\Http\Controllers\MedicalRecord\MedicalFileController;
use App\Http\Controllers\MedicalRecord\MedicalRecordController;
use App\Http\Controllers\MedicalRecord\VitalSignController;
use App\Http\Controllers\HealthTipController;
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

    // ── TEMPORAL: test de email — eliminar antes de producción ──────
    Route::get('/_debug/mail-test', function (\Illuminate\Http\Request $request) {
        if ($request->query('token') !== env('DEBUG_TOKEN', 'prenatal-debug-2026')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $to        = $request->query('to', config('mail.from.address'));
        $transport = $request->query('transport', env('OTP_EMAIL_TRANSPORT', 'smtp'));

        $config = [
            'OTP_TRANSPORT'      => env('OTP_EMAIL_TRANSPORT', '(not set)'),
            'MAIL_HOST'          => config('mail.mailers.smtp.host'),
            'MAIL_PORT'          => config('mail.mailers.smtp.port'),
            'MAIL_SCHEME'        => config('mail.mailers.smtp.scheme') ?? '(none)',
            'MAIL_USERNAME'      => config('mail.mailers.smtp.username'),
            'MAIL_PASSWORD_LEN'  => strlen((string) config('mail.mailers.smtp.password')) . ' chars',
            'SUPABASE_URL'       => env('SUPABASE_URL') ? 'set' : 'NOT SET',
            'SUPABASE_KEY'       => env('SUPABASE_KEY') ? 'set' : 'NOT SET',
        ];

        if ($transport === 'resend') {
            $url = rtrim((string) env('SUPABASE_URL'), '/') . '/functions/v1/resend-email';
            try {
                $response = \Illuminate\Support\Facades\Http::withToken((string) env('SUPABASE_KEY'))
                    ->timeout(15)
                    ->post($url, [
                        'to'      => $to,
                        'subject' => '[Control Prenatal] Resend Test — ' . now(),
                        'html'    => '<h1>Test OK ✓</h1><p>Resend via Edge Function funciona correctamente.</p>',
                    ]);
                $body = $response->json();
                if ($response->successful()) {
                    return response()->json(['status' => 'ok', 'transport' => 'resend', 'sent_to' => $to, 'resend_id' => $body['id'] ?? null, 'config' => $config]);
                }
                return response()->json(['status' => 'error', 'transport' => 'resend', 'message' => 'Edge Function returned ' . $response->status(), 'body' => $body, 'config' => $config], 500);
            } catch (\Throwable $e) {
                return response()->json(['status' => 'error', 'transport' => 'resend', 'message' => $e->getMessage(), 'config' => $config], 500);
            }
        }

        try {
            \Illuminate\Support\Facades\Mail::html(
                '<h1>Test OK ✓</h1><p>SMTP funciona correctamente desde Railway.</p>',
                function (\Illuminate\Mail\Message $msg) use ($to): void {
                    $msg->to($to)->subject('[Control Prenatal] SMTP Test — ' . now());
                }
            );
            return response()->json(['status' => 'ok', 'transport' => 'smtp', 'sent_to' => $to, 'config' => $config]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'transport' => 'smtp', 'message' => $e->getMessage(), 'config' => $config], 500);
        }
    });

    Route::post('/auth/register', RegisterController::class)->name('auth.register');
    Route::post('/auth/login', LoginController::class)->name('auth.login');
    
    // Password reset — público, no requiere autenticación
    Route::post('/password/forgot', [PasswordResetController::class, 'requestReset'])->name('password.forgot');
    Route::post('/password/reset',  [PasswordResetController::class, 'resetPassword'])->name('password.reset');

    // Tips de salud — públicos, sin autenticación
    Route::get('/health-tips',        [HealthTipController::class, 'index'])->name('health-tips.index');
    Route::get('/health-tips/weekly', [HealthTipController::class, 'weeklyTip'])->name('health-tips.weekly');

    // Directorio público: lista todos los médicos activos (sin geo)
    Route::get('/doctors', [DirectoryController::class, 'index'])->name('doctors.index');
    // Directorio geoespacial público: filtra por proximidad con coordenadas GPS
    Route::get('/doctors/nearby', [DirectoryController::class, 'nearby'])->name('doctors.nearby');

    // Experiencias públicas — no requieren autenticación (perfil médico visible para todos)
    Route::get('/experience-tags',    [ExperienceController::class, 'tags'])->name('experience-tags.index');
    Route::get('/experience-badges',  [ExperienceController::class, 'badges'])->name('experience-badges');
    Route::get('/experiences',        [ExperienceController::class, 'index'])->name('experiences.index');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', LogoutController::class)->name('auth.logout');

        Route::get('/user', [ProfileController::class, 'show'])->name('user.profile');

        // Token FCM — registrar/desregistrar token de dispositivo para push notifications
        Route::post('/user/fcm-token',   [FcmTokenController::class, 'upsert'])->name('user.fcm-token.upsert');
        Route::delete('/user/fcm-token', [FcmTokenController::class, 'destroy'])->name('user.fcm-token.destroy');

        Route::middleware('doctor')->prefix('doctor')->group(function (): void {
            Route::get('/profile',     [ProfileController::class, 'doctorProfile'])->name('doctor.profile');
            Route::patch('/profile',   [ProfileController::class, 'updateDoctorProfile'])->name('doctor.profile.update');
            Route::get('/clinic-info', [ProfileController::class, 'doctorClinicInfo'])->name('doctor.clinic-info');

            // Verificación OTP — disponible para médicos aún no verificados (Δ-5)
            Route::prefix('verification')->group(function (): void {
                Route::post('/request-code', [VerificationController::class, 'requestCode'])->name('doctor.verification.request');
                Route::post('/verify-code',  [VerificationController::class, 'verifyCode'])->name('doctor.verification.verify');
                Route::get('/status',        [VerificationController::class, 'status'])->name('doctor.verification.status');
            });

            // Consultorios propios del médico — accesibles a médicos verificados
            Route::middleware('doctor_verified')->group(function (): void {
                Route::get('/offices',              [DoctorOfficeController::class, 'index'])->name('doctor.offices.index');
                Route::post('/offices',             [DoctorOfficeController::class, 'store'])->name('doctor.offices.store');
                Route::delete('/offices/{office}',  [DoctorOfficeController::class, 'destroy'])->name('doctor.offices.destroy');
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

                Route::get('/clinics/discover', [ClinicDiscoveryController::class, 'index'])->name('doctor.clinics.discover');

                // Catálogo completo de clínicas verificadas (con sedes) para el dropdown de horarios
                Route::get('/clinics/catalog', [ClinicCatalogController::class, 'index'])->name('doctor.clinics.catalog');

                // Vinculación auto-iniciada del médico a una clínica
                Route::get('/clinics',                  [DoctorClinicLinkController::class, 'index'])->name('doctor.clinics.index');
                Route::post('/clinics/{clinic}/link',   [DoctorClinicLinkController::class, 'store'])->name('doctor.clinics.link');
                Route::delete('/clinics/{clinic}/link', [DoctorClinicLinkController::class, 'destroy'])->name('doctor.clinics.unlink');
            });
        });

        Route::middleware('patient')->prefix('patient')->group(function (): void {
            Route::get('/profile', [ProfileController::class, 'patientProfile'])->name('patient.profile');
        });

        // Citas — accesibles a pacientes, médicos (verificados) y clínicas.
        // Las acciones específicas se autorizan en el service/controller por rol.
        Route::prefix('appointments')->group(function (): void {
            Route::get('/slots',                    [AppointmentController::class, 'availableSlots'])->name('appointments.slots');
            Route::get('/',                         [AppointmentController::class, 'index'])->name('appointments.index');
            Route::get('/{appointment}',            [AppointmentController::class, 'show'])->name('appointments.show');

            // Paciente reserva
            Route::post('/',                        [AppointmentController::class, 'book'])->name('appointments.book');

            // Paciente o médico cancelan
            Route::post('/{appointment}/cancel',    [AppointmentController::class, 'cancel'])->name('appointments.cancel');

            // Médico confirma / completa / no-show / reagenda (requiere médico verificado)
            Route::middleware('doctor_verified')->group(function (): void {
                Route::post('/{appointment}/confirm',    [AppointmentController::class, 'confirm'])->name('appointments.confirm');
                Route::post('/{appointment}/complete',   [AppointmentController::class, 'complete'])->name('appointments.complete');
                Route::post('/{appointment}/no-show',    [AppointmentController::class, 'noShow'])->name('appointments.no-show');
                Route::post('/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])->name('appointments.reschedule');
            });
        });

        Route::middleware('clinic_admin')->prefix('clinic')->group(function (): void {
            // Clinic admin routes will be added here
        });

        // ── Chat cifrado (Sprint 5) ───────────────────────────────
        Route::prefix('chat')->group(function (): void {
            Route::get('/',                                             [ChatController::class, 'conversations'])->name('chat.conversations');
            Route::get('/with/{user}',                                  [ChatController::class, 'findRelationship'])->name('chat.find-relationship');
            Route::post('/with/{user}',                                 [ChatController::class, 'startConversation'])->name('chat.start');
            Route::get('/{relationship}/messages',                      [ChatController::class, 'messages'])->name('chat.messages');
            Route::post('/{relationship}/messages',                     [ChatController::class, 'send'])->name('chat.send');
            Route::post('/{relationship}/read',                         [ChatController::class, 'markRead'])->name('chat.read');
        });

        // ── Experiencias (Sprint 5) — acciones autenticadas ──────
        Route::post('/experiences',                                     [ExperienceController::class, 'store'])->name('experiences.store');
        Route::patch('/experiences/{experience}',                       [ExperienceController::class, 'update'])->name('experiences.update');

        // ── Referidos (Sprint 5) ──────────────────────────────────
        Route::get('/referrals',                                        [ReferralController::class, 'index'])->name('referrals.index');
        Route::post('/referrals',                                       [ReferralController::class, 'store'])->name('referrals.store');

        // ── Historial médico (Sprint 4) ───────────────────────────
        // Acceso: paciente ve el suyo; médico ve los de sus pacientes activos.
        Route::prefix('medical-records')->group(function (): void {
            // Catalog (categories + subcategories + tags + related doctors) — for upload form
            Route::get('/catalog',                                   [MedicalRecordController::class, 'catalog'])->name('medical-records.catalog');

            // Document upload (patient or doctor with active relationship)
            Route::post('/upload',                                   [MedicalRecordController::class, 'upload'])->name('medical-records.upload');

            Route::get('/',                                          [MedicalRecordController::class, 'index'])->name('medical-records.index');
            Route::post('/',                                         [MedicalRecordController::class, 'store'])->name('medical-records.store');
            Route::get('/{medicalRecord}',                           [MedicalRecordController::class, 'show'])->name('medical-records.show');
            Route::patch('/{medicalRecord}',                         [MedicalRecordController::class, 'update'])->name('medical-records.update');

            // Signed URL for document-type records
            Route::get('/{medicalRecord}/signed-url',                [MedicalRecordController::class, 'signedUrl'])->name('medical-records.signed-url');

            // Signos vitales
            Route::get('/{medicalRecord}/vital-signs',               [VitalSignController::class, 'index'])->name('medical-records.vital-signs.index');
            Route::post('/{medicalRecord}/vital-signs',              [VitalSignController::class, 'store'])->name('medical-records.vital-signs.store');

            // Archivos (upload + signed URL)
            Route::get('/{medicalRecord}/files',                     [MedicalFileController::class, 'index'])->name('medical-records.files.index');
            Route::post('/{medicalRecord}/files',                    [MedicalFileController::class, 'store'])->name('medical-records.files.store');
            Route::get('/{medicalRecord}/files/{file}/signed-url',   [MedicalFileController::class, 'signedUrl'])->name('medical-records.files.signed-url');
        });
    });
});
