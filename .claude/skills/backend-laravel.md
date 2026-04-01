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

Laravel interactúa con Supabase **únicamente vía PDO/Eloquent** (conexión
PostgreSQL estándar). Para operaciones que requieren las APIs de Supabase
(Storage, Auth, Realtime), usar el cliente HTTP de Laravel:

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
