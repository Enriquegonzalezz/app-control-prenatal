# Skill: Backend Laravel 11
**Archivo:** `.claude/skills/backend-laravel.md`  
**Propósito:** Instrucciones para que Claude Code genere código Laravel
siguiendo las convenciones exactas de este proyecto.

---

## Stack y Versiones

- **Laravel:** 11.x
- **PHP:** 8.2+
- **Auth:** Laravel Sanctum (tokens de API)
- **Base de datos:** Supabase PostgreSQL 17 vía PDO (pgsql)
- **Validación:** Form Requests (nunca validar en el controller)
- **Arquitectura:** Controllers delgados → Services → Models

---

## Estructura de Respuesta JSON

**SIEMPRE** retornar en este formato:

```php
// Éxito
return response()->json([
    'data'    => $result,
    'message' => 'Operación exitosa',
    'status'  => 200,
], 200);

// Error de validación
return response()->json([
    'data'    => null,
    'message' => 'Error de validación',
    'errors'  => $validator->errors(),
    'status'  => 422,
], 422);

// No autorizado
return response()->json([
    'data'    => null,
    'message' => 'No autorizado',
    'status'  => 403,
], 403);
```

---

## Convenciones de Rutas

```php
// routes/api.php — SIEMPRE versionadas
Route::prefix('v1')->group(function () {

    // Rutas públicas
    Route::post('/auth/register/patient',      [RegisterPatientController::class, 'store']);
    Route::post('/auth/login',                 [LoginController::class, 'store']);
    Route::get('/doctors/nearby',              [DoctorSearchController::class, 'nearby']);

    // Rutas autenticadas
    Route::middleware('auth:sanctum')->group(function () {

        // Solo pacientes
        Route::middleware('role:patient')->group(function () {
            Route::apiResource('/appointments', AppointmentController::class);
            Route::get('/medical-records',      [MedicalRecordController::class, 'index']);
        });

            // Médicos autenticados (verificados o no)
        Route::middleware('role:doctor')->group(function () {
            // Verificación OTP — disponible antes de is_verified
            Route::post('/doctor/verification/request-code', [VerificationController::class, 'requestCode']);
            Route::post('/doctor/verification/verify-code',  [VerificationController::class, 'verifyCode']);
            Route::get('/doctor/verification/status',        [VerificationController::class, 'status']);
        });

        // Solo médicos verificados
        Route::middleware(['role:doctor', 'doctor.verified'])->group(function () {
            Route::get('/agenda',               [AgendaController::class, 'index']);
            Route::apiResource('/schedules',    ScheduleController::class);
        });

        // Solo clinic admins
        Route::middleware('role:clinic_admin')->group(function () {
            Route::apiResource('/clinic/doctors', ClinicDoctorController::class);
            Route::apiResource('/clinic/branches', BranchController::class);
        });
    });
});
```

---

## Patrón Controller → Service

**NUNCA** poner lógica de negocio en el controller:

```php
// ✅ CORRECTO — Controller delgado
class AppointmentController extends Controller
{
    public function __construct(private AppointmentService $service) {}

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $appointment = $this->service->book($request->validated(), auth()->user());

        return response()->json([
            'data'    => AppointmentResource::make($appointment),
            'message' => 'Cita agendada exitosamente',
            'status'  => 201,
        ], 201);
    }
}

// ❌ INCORRECTO — lógica en el controller
public function store(Request $request): JsonResponse
{
    $slot = Slot::find($request->slot_id);
    if ($slot->appointment) {
        return response()->json(['error' => 'Slot ocupado'], 409);
    }
    // ... más lógica aquí = MAL
}
```

---

## Enums de PHP (mapean los ENUM de PostgreSQL)

```php
// app/Enums/UserRole.php
enum UserRole: string
{
    case Patient     = 'patient';
    case Doctor      = 'doctor';
    case ClinicAdmin = 'clinic_admin';
    case Superadmin  = 'superadmin';
}

// app/Enums/AppointmentStatus.php
enum AppointmentStatus: string
{
    case Pending    = 'pending';
    case Confirmed  = 'confirmed';
    case InProgress = 'in_progress';
    case Completed  = 'completed';
    case Cancelled  = 'cancelled';
    case NoShow     = 'no_show';
}

// app/Enums/ExperienceStatus.php — [Δ-2] NUNCA crear RatingStatus
enum ExperienceStatus: string
{
    case Pending   = 'pending';
    case Published = 'published';
    case Reported  = 'reported';
    case Hidden    = 'hidden';
}

// app/Enums/VerificationStatus.php — [Δ-5] OTP de médicos
enum VerificationStatus: string
{
    case Pending  = 'pending';
    case CodeSent = 'code_sent';
    case Verified = 'verified';
    case Failed   = 'failed';
    case Expired  = 'expired';
}
```

---

## Middleware de Roles

```php
// app/Http/Middleware/EnsureIsClinicAdmin.php
public function handle(Request $request, Closure $next): Response
{
    if (auth()->user()?->role !== UserRole::ClinicAdmin->value) {
        return response()->json([
            'data'    => null,
            'message' => 'Solo administradores de clínica pueden acceder',
            'status'  => 403,
        ], 403);
    }
    return $next($request);
}
```

---

## Interacción con Supabase

Laravel interactúa con Supabase de dos formas:

1. **PDO/Eloquent** — para queries SQL directos a la base de datos.
2. **HTTP con `SUPABASE_KEY`** — para llamar APIs REST de Supabase: Storage, Auth, Realtime y **Edge Functions**.

```php
// app/Services/StorageService.php
private function getSupabaseClient(): PendingRequest
{
    return Http::withHeaders([
        'Authorization' => 'Bearer ' . config('services.supabase.service_key'),
        'apikey'        => config('services.supabase.service_key'),
    ])->baseUrl(config('services.supabase.url'));
}

public function generateSignedUrl(string $path): string
{
    $response = $this->getSupabaseClient()
        ->post("/storage/v1/object/sign/medical-files/{$path}", [
            'expiresIn' => 900, // 15 minutos
        ]);

    return $response->json('signedURL');
}
```

---

## Llamar Edge Functions de Supabase desde Laravel

Las Edge Functions se invocan via HTTP con el `SUPABASE_KEY` (service_role) como
Bearer token. La función valida el JWT (`verify_jwt: true`) y ejecuta la lógica
Deno/TypeScript.

```php
// Patrón general — llamar una Edge Function
$response = Http::withToken(env('SUPABASE_KEY'))
    ->post(env('SUPABASE_URL') . '/functions/v1/{function-name}', [
        'param1' => $value1,
        'param2' => $value2,
    ]);

if (! $response->successful()) {
    throw new \RuntimeException("Edge Function error: HTTP {$response->status()}");
}

$data = $response->json();
```

### Edge Function: `resend-email`

Envía emails transaccionales via **Resend API**. Requiere el secret
`RESEND_API_KEY` configurado en Supabase. URL: `{SUPABASE_URL}/functions/v1/resend-email`

```php
// Cómo enviar un email desde un Job/Service de Laravel
$response = Http::withToken(env('SUPABASE_KEY'))
    ->post(env('SUPABASE_URL') . '/functions/v1/resend-email', [
        'to'      => $emailAddress,
        'subject' => 'Asunto del correo',
        'html'    => '<p>Contenido HTML</p>',
        'text'    => 'Contenido texto plano (fallback)',
    ]);
```

**Payload de la Edge Function `resend-email`:**

| Campo     | Tipo              | Requerido | Descripción                        |
|-----------|-------------------|-----------|------------------------------------|
| `to`      | `string\|string[]`| ✅        | Destinatario(s)                    |
| `subject` | `string`          | ✅        | Asunto del correo                  |
| `html`    | `string`          | ⚠️ uno   | Cuerpo HTML                        |
| `text`    | `string`          | ⚠️ uno   | Cuerpo texto plano (al menos uno)  |

**Respuesta exitosa:** `{ "success": true, "id": "resend-message-id" }`

**Configurar el secret en Supabase (una sola vez):**
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
supabase secrets set RESEND_FROM_ADDRESS="Control Prenatal <noreply@tudominio.com>"
```

> El dominio del `FROM` debe estar **verificado en resend.com**. Para desarrollo
> se puede usar `onboarding@resend.dev` (solo permite enviar al email del owner).

---

## Variables de Entorno Requeridas (.env)

```env
# Base de datos (Supabase PostgreSQL via pooler)
DB_CONNECTION=pgsql
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.sdcvmigvumhtorhzobjj
DB_PASSWORD=

# Supabase API
SUPABASE_URL=https://sdcvmigvumhtorhzobjj.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=   # NUNCA exponer en frontend

# FCM Push Notifications
FCM_SERVER_KEY=

# Cifrado AES-256 para chat
CHAT_ENCRYPTION_KEY=    # 32 bytes, generado con: openssl rand -hex 32
```

---

## Flujo de Verificación de Médicos (Δ-5)

El registro unificado crea al médico con `is_verified = false`. La verificación
se completa en un paso separado via OTP:

```php
// ❌ INCORRECTO — al registrar, is_verified NO puede ser true
DoctorProfile::create(['user_id' => $user->id, 'is_verified' => true]);

// ✅ CORRECTO — siempre false al registro; solo DoctorVerificationService puede activarlo
DoctorProfile::create(['user_id' => $user->id, 'is_verified' => false]);

// ❌ INCORRECTO — enviar OTP al email del usuario registrado, y via SMTP directo
Mail::to($user->email)->send(new OtpMail($code));

// ✅ CORRECTO — enviar al canal oficial de verified_doctors via Edge Function Resend
$verifiedDoctor = VerifiedDoctor::where('cedula', $user->cedula)->first();
// (ver SendVerificationCodeJob::sendEmail() — usa Http::withToken() a resend-email)

// ❌ INCORRECTO — guardar OTP en plaintext
DoctorVerificationCode::create(['code' => $otp]);

// ✅ CORRECTO — siempre hash bcrypt
DoctorVerificationCode::create(['code' => Hash::make($otp)]);

// ❌ INCORRECTO — una clínica no puede verificar médicos
$doctorProfile->update(['is_verified' => true]); // desde ClinicController = MAL

// ✅ CORRECTO — solo DoctorVerificationService puede cambiar is_verified
$this->verificationService->verifyCode($user, $inputCode);
```

**`DoctorVerificationService` — métodos clave:**

```php
// Solicitar OTP (rate-limited: max 5/día, cooldown 60s)
public function requestCode(User $user): array
// Retorna: ['channel' => 'email', 'destination' => 'j***@gm***.com']

// Verificar OTP ingresado por el médico
public function verifyCode(User $user, string $code): bool
// Si válido: doctor_profiles.is_verified = true, doctor_verification_codes.status = 'verified'
// Si inválido: incrementa attempts; si >= max_attempts → status = 'failed'
```

---

## Lo que NUNCA hacer en Laravel

```php
// ❌ NUNCA — tabla ratings no existe en este proyecto
Rating::create([...]);
$doctor->rating_avg;

// ❌ NUNCA — hardcodear specialty
if ($specialty === 'ginecobstetricia') { ... }
// ✅ CORRECTO
$specialty = Specialty::find($specialtyId);
$schema = $specialty->profile_schema;

// ❌ NUNCA — URLs públicas para archivos médicos
return Storage::url($path);
// ✅ CORRECTO
return $this->storageService->generateSignedUrl($path);

// ❌ NUNCA — lógica en el controller
public function store(Request $request) {
    // validación aquí = mal
    // queries aquí = mal
}
```
