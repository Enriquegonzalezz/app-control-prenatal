# TESTING_OTP.md — Guía de Pruebas: Verificación OTP de Médicos
**Sprint 1 — Δ-5**
**Última actualización:** Abril 2026

---

## Resumen del Flujo a Probar

```
[Registro] → role=doctor, is_verified=false
    ↓
[POST /request-code] → genera OTP, envía a email de verified_doctors
    ↓
[Revisa bandeja de samuelmolina66@gmail.com]
    ↓
[POST /verify-code] → is_verified=true, médico desbloqueado
    ↓
[GET /status] → confirmación final
```

---

## Configuración Previa

### 1. Cambiar a Cola Síncrona (para pruebas)

Editar `.env` — esto hace que los Jobs se ejecuten inmediatamente sin necesitar
`queue:work`:

```env
QUEUE_CONNECTION=sync
```

### 2. Configurar Correo

#### Opción A — Solo Log (prueba rápida de lógica, sin email real)

```env
MAIL_MAILER=log
```

El código OTP aparecerá en `storage/logs/laravel.log`. Buscar:
```
Subject: Código de verificación médica — Control Prenatal
```

#### Opción B — Gmail SMTP (email real a samuelmolina66@gmail.com) ⭐

**Paso previo: Obtener App Password de Google**
1. Ir a [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Seleccionar "Otra (nombre personalizado)" → escribir "Control Prenatal"
3. Copiar la contraseña de 16 caracteres generada (ej: `abcd efgh ijkl mnop`)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SCHEME=tls
MAIL_USERNAME=tu-cuenta@gmail.com        ← Gmail que envía (cualquiera con App Password)
MAIL_PASSWORD=abcdefghijklmnop           ← App Password sin espacios
MAIL_FROM_ADDRESS="noreply@control-prenatal.app"
MAIL_FROM_NAME="Control Prenatal"
```

> **Importante:** Si tu cuenta Gmail no tiene 2FA activado, primero actívalo en
> [https://myaccount.google.com/security](https://myaccount.google.com/security).
> Las App Passwords solo funcionan con 2FA habilitado.

Después de editar `.env`:

```bash
php artisan config:clear
```

---

## Paso 1 — Seedear Doctor de Prueba en verified_doctors

El OTP se envía al email registrado en `verified_doctors`, NO al de registro.
Necesitamos un registro con `email = 'samuelmolina66@gmail.com'`.

```bash
cd backend
php artisan tinker
```

Dentro de tinker:

```php
// Buscar la especialidad (no hardcodear UUID)
$specialty = App\Models\Specialty::where('slug', 'ginecobstetricia')->first();
echo "Specialty ID: " . $specialty->id;

// Crear doctor de prueba en tabla maestra
$vd = App\Models\VerifiedDoctor::create([
    'cedula'         => 'V00000001',
    'first_name'     => 'Samuel',
    'last_name'      => 'Molina',
    'email'          => 'samuelmolina664@gmail.com',
    'specialty_id'   => $specialty->id,
    'license_number' => 'TEST-OTP-001',
    'university'     => 'Universidad José Antonio Páez',
    'is_active'      => true,
    'verified_at'    => now(),
    'verified_by'    => 'test',
]);

echo "verified_doctor creado: " . $vd->id;
exit
```

**Verificar que se insertó:**

```bash
php artisan doctor:find V00000001
```

---

## Paso 2 — Iniciar el Servidor

```bash
# Terminal 1 — Servidor
cd backend
php artisan serve
# Escucha en http://localhost:8000
```

> Si `QUEUE_CONNECTION=database` (no sync), abrir Terminal 2:
> ```bash
> php artisan queue:work --tries=3
> ```

---

## Paso 3 — Secuencia de Pruebas (curl)

### 3.1 Health Check

```bash
curl -s http://localhost:8000/api/v1/health | jq
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2026-04-..."
}
```

---

### 3.2 Registrar como Médico

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Samuel Molina Test",
    "email": "doctortest@example.com",
    "password": "Password123!",
    "password_confirmation": "Password123!",
    "cedula": "V00000001"
  }' | jq
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente.",
  "data": {
    "user": {
      "role": "doctor",
      ...
    },
    "token": "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "role": "doctor"
  }
}
```

> Copiar el `token` para los siguientes pasos.

**Verificar `is_verified = false` (corrección Δ-5):**

```bash
php artisan tinker
>>> App\Models\User::where('cedula','V00000001')->first()->doctorProfile->is_verified
# Debe retornar: false
exit
```

---

### 3.3 Consultar Estado (antes del OTP)

```bash
export TOKEN="1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

curl -s http://localhost:8000/api/v1/doctor/verification/status \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "message": "Estado de verificación obtenido.",
  "data": {
    "is_verified": false,
    "status": "pending",
    "pending_code": false,
    "channel": null,
    "destination": null,
    "expires_at": null,
    "attempts_left": null
  }
}
```

---

### 3.4 Solicitar Código OTP ← **Aquí se envía el correo**

```bash
curl -s -X POST http://localhost:8000/api/v1/doctor/verification/request-code \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "message": "Código de verificación enviado.",
  "data": {
    "channel": "email",
    "destination": "s***@gm***.com",
    "expires_in": 900
  }
}
```

#### Si MAIL_MAILER=log — Buscar el código en el log:

```bash
# Windows PowerShell
Select-String -Path "backend\storage\logs\laravel.log" -Pattern "Tu código" -Context 0,3

# O ver las últimas líneas del log
tail -50 backend/storage/logs/laravel.log
```

Buscar algo como:
```
Subject: Código de verificación médica — Control Prenatal
...
Tu código de verificación es:

    489302
...
```

#### Si MAIL_MAILER=smtp — Revisar bandeja de samuelmolina66@gmail.com

El correo llega en ~30 segundos con asunto:
**"Código de verificación médica — Control Prenatal"**

---

### 3.5 Verificar el Código OTP

```bash
curl -s -X POST http://localhost:8000/api/v1/doctor/verification/verify-code \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "489302"}' | jq
```

*(Reemplazar `489302` con el código recibido)*

**Respuesta esperada (éxito):**
```json
{
  "status": "success",
  "message": "Verificación completada. Ya puedes acceder a todas las funcionalidades.",
  "data": {
    "is_verified": true
  }
}
```

**Respuesta si código incorrecto:**
```json
{
  "status": "error",
  "message": "Código incorrecto. Te quedan 2 intentos."
}
```

---

### 3.6 Confirmar Estado Final

```bash
curl -s http://localhost:8000/api/v1/doctor/verification/status \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "data": {
    "is_verified": true,
    "status": "verified",
    "pending_code": false
  }
}
```

---

### 3.7 Verificar en DB (tinker)

```bash
php artisan tinker
>>> $user = App\Models\User::where('cedula', 'V00000001')->first();
>>> $user->doctorProfile->is_verified      // true
>>> $user->doctorProfile->updated_at       // timestamp de verificación
>>>
>>> // Ver registro del código OTP
>>> App\Models\DoctorVerificationCode::where('user_id', $user->id)->latest()->first()
# status: "verified", verified_at: timestamp, attempts: 0
exit
```

---

## Pruebas de Casos de Error

### Rate Limiting (máx 5/día)

Solicitar código 6 veces seguidas — la 6ª debe retornar:
```json
{
  "status": "error",
  "message": "Has alcanzado el límite diario de solicitudes de código. Intenta nuevamente mañana."
}
```

### Cooldown (60 segundos)

Solicitar dos códigos en menos de 60 segundos — el 2º debe retornar:
```json
{
  "status": "error",
  "message": "Debe esperar 58 segundos antes de solicitar otro código."
}
```

### Código Expirado (15 minutos)

Esperar 15 minutos después de solicitar el código, luego intentar verificar:
```json
{
  "status": "error",
  "message": "No hay un código activo o ha expirado. Solicita uno nuevo."
}
```

### Validación de Formato

```bash
# Código con letras — debe fallar con 422
curl -s -X POST http://localhost:8000/api/v1/doctor/verification/verify-code \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "abc123"}' | jq
```

### Médico Ya Verificado

Intentar solicitar otro código después de verificarse exitosamente:
```json
{
  "status": "error",
  "message": "Tu cuenta ya está verificada. No necesitas un código."
}
```

---

## Acceso Bloqueado Sin Verificación

Las rutas con `doctor_verified` middleware deben bloquear a médicos no verificados.
*(Actualmente no hay rutas que usen ese middleware — se agregarán en Sprint 2 con agenda/slots)*

---

## Limpieza de Datos de Prueba

```bash
php artisan tinker
>>> $user = App\Models\User::where('cedula', 'V00000001')->first();
>>> App\Models\DoctorVerificationCode::where('user_id', $user->id)->delete();
>>> $user->doctorProfile->delete();
>>> $user->delete();
>>> App\Models\VerifiedDoctor::where('cedula', 'V00000001')->delete();
exit
```

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| `Connection refused` al enviar email | SMTP no configurado o firewall | Verificar credenciales y App Password |
| `Could not authenticate` | App Password incorrecto | Regenerar en Google Account |
| OTP no llega pero respuesta es `success` | `QUEUE_CONNECTION=database` sin worker | Cambiar a `sync` o ejecutar `queue:work` |
| `No se encontró información de verificación` | `verified_doctors` sin ese cedula | Repetir el tinker del Paso 1 |
| `No hay un código activo` | Código expirado o status ≠ code_sent | Solicitar nuevo código |
| Job falla silenciosamente | Error en SMTP capturado por queue | Ver `storage/logs/laravel.log` o tabla `failed_jobs` |

### Ver jobs fallidos

```bash
php artisan queue:failed
php artisan queue:retry all
```

### Ver log en tiempo real

```bash
# PowerShell
Get-Content backend\storage\logs\laravel.log -Wait -Tail 30
```

---

## Bugs encontrados y corregidos durante las pruebas

### Bug 4 — MAIL_SCHEME=tls no soportado en Laravel 11
**Síntoma:** `The "tls" scheme is not supported; supported schemes for mailer "smtp" are: "smtp", "smtps"`
**Causa:** Laravel 11 usa Symfony Mailer que tiene esquemas diferentes a versiones anteriores.
**Fix:** Dejar `MAIL_SCHEME=` vacío para puerto 587 (STARTTLS automático). Usar `smtps` solo para puerto 465.

```env
# ✅ CORRECTO para Gmail puerto 587
MAIL_SCHEME=
MAIL_PORT=587

# ✅ Alternativa para Gmail puerto 465
MAIL_SCHEME=smtps
MAIL_PORT=465

# ❌ NO válido en Laravel 11
MAIL_SCHEME=tls
```

---

### Bug 1 — User model sin HasUuids
**Síntoma:** `user_id = 0` en el INSERT de doctor_profiles
**Causa:** `users.id` es UUID en Supabase pero `User` model no tenía `HasUuids`. Eloquent casteaba el UUID a integer → `0`.
**Fix:** Agregar `use HasUuids;` a `app/Models/User.php`

### Bug 2 — telescope_entries no existía en Supabase
**Síntoma:** `SQLSTATE[25P02]: In failed sql transaction` / `relation "telescope_entries" does not exist`
**Causa:** Telescope intentaba insertar en `telescope_entries` **dentro** de la misma transacción DB. PostgreSQL (a diferencia de MySQL) aborta toda la transacción si cualquier query falla.
**Fix:**
```bash
# Marcar migrations de tablas ya existentes en Supabase (via tinker)
DB::table('migrations')->updateOrInsert(['migration' => '0001_01_01_000000_create_users_table'], ['batch' => 1]);
# ... (resto de migrations existentes)

# Ejecutar solo la migración de telescope
php artisan migrate
```

### Bug 3 — Validación retorna HTML sin header Accept
**Síntoma:** POST con `code: "abc123"` retorna HTML (redirect 302)
**Causa:** Sin `Accept: application/json`, Laravel trata la petición como web y redirige en errores de validación.
**Fix:** Siempre incluir `-H "Accept: application/json"` en requests a la API.

---

## Checklist de Pruebas Completadas

- [x] `MAIL_MAILER=log` → OTP visible en laravel.log ✅
- [x] `MAIL_MAILER=log` → OTP visible en laravel.log ✅
- [x] `MAIL_MAILER=smtp` (Gmail) → Email llegó a samuelmolina664@gmail.com ✅
- [x] `is_verified=false` al registrar (corrección Δ-5) ✅
- [x] `is_verified=true` tras OTP exitoso (código 882512 verificado en producción) ✅
- [x] Código incorrecto incrementa `attempts` + mensaje con intentos restantes ✅
- [x] Médico ya verificado no puede pedir más códigos ✅
- [x] Código enmascarado: `s***@gm***.com` (nunca el email completo) ✅
- [x] Validación `digits:6` rechaza letras y dígitos insuficientes ✅
- [x] Cooldown activo — error al solicitar dentro de 60s ✅
- [ ] Rate limiting (error al 6ª solicitud del día) ⏳ (no crítico)
