# DATABASE_SCHEMA.md — Estado Actual + Cambios de Verificación
**Última actualización:** Abril 2026  
**Cambio principal:** Δ-5 — Verificación independiente de médicos via OTP contra tabla maestra

---

## CHANGELOG Δ-5 — Verificación Independiente de Médicos

### Antes (v2.0)
Las clínicas registraban y verificaban a sus médicos (modelo B2B puro).
El médico no podía auto-registrarse; dependía de que una clínica lo diera de alta.

### Ahora (v2.1)
Los médicos se **auto-registran** de forma independiente. La verificación se realiza
contra la tabla maestra `verified_doctors` (base de datos de médicos con licencia vigente
en el país) mediante un **código OTP enviado al email o teléfono registrado** en esa tabla.

### Flujo de Verificación Actualizado
1. El médico se registra con: nombre, email, password, **cédula**, teléfono
2. El backend consulta `verified_doctors` por cédula:
   - **Si existe y coincide** → se crea `user` con `role = 'doctor'` y `doctor_profile` con `is_verified = false`
   - **Si NO existe** → se crea como `patient` (flujo normal)
3. Para completar la verificación, el médico solicita un **código OTP** que se envía al email/teléfono registrado en `verified_doctors` (NO al email que usó para registrarse)
4. El médico ingresa el código OTP en la app
5. Si el código es válido → `is_verified = true`, se desbloquean todas las funcionalidades de médico
6. Hasta que no se verifique, el médico puede ver la app pero **NO puede**: crear slots, recibir citas, chatear con pacientes, acceder a historiales

### Tabla nueva: `doctor_verification_codes`
Almacena los códigos OTP temporales con expiración y límite de intentos.

### Impacto en clínicas
Las clínicas **ya no verifican médicos**. Solo pueden **vincular** médicos que ya estén
verificados en la plataforma (tabla `clinic_doctors`). El flujo de clínica se simplifica.

---

## TABLAS ACTUALES EN SUPABASE (con cambios Δ-5)

### ENUMs Disponibles (creados en Sprint 0)
```sql
user_role:            patient | doctor | clinic_admin | superadmin
theme_preference:     light | dark | system
appointment_status:   pending | confirmed | in_progress | completed | cancelled | no_show
relationship_status:  pending | active | completed | terminated
record_type:          lab_result | ultrasound | prescription | consultation_note | imaging | vaccine | other
experience_status:    pending | published | reported | hidden
message_type:         text | image | file | system
day_of_week:          monday | tuesday | wednesday | thursday | friday | saturday | sunday
-- NUEVO Δ-5:
verification_status:  pending | code_sent | verified | failed | expired
```

---

### 1. `specialties` ✅ Sin cambios
```
id              UUID PK DEFAULT uuid_generate_v4()
name            VARCHAR(100) NOT NULL
slug            VARCHAR(50) NOT NULL UNIQUE
icon            VARCHAR(50)
description     TEXT
is_active       BOOLEAN DEFAULT true
profile_schema  JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ DEFAULT NOW()
```
**Seed:** Ginecobstetricia (activa), Cardiología, Pediatría, Dermatología, Traumatología, Medicina Interna (inactivas).

---

### 2. `verified_doctors` ✅ Sin cambios estructurales (agregar campo `verification_method`)
```
id              UUID PK DEFAULT gen_random_uuid()
cedula          VARCHAR(20) NOT NULL UNIQUE
specialty_id    UUID FK → specialties.id
license_number  VARCHAR(50) UNIQUE
first_name      VARCHAR(100) NOT NULL
last_name       VARCHAR(100) NOT NULL
email           VARCHAR(255)                ← Email oficial para envío de OTP
university      VARCHAR(255)
phone           VARCHAR(20)                 ← Teléfono oficial para envío de OTP
verified_at     TIMESTAMPTZ DEFAULT NOW()
verified_by     VARCHAR(100) DEFAULT 'admin'
notes           TEXT
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```
**Nota Δ-5:** El `email` y `phone` de esta tabla son los canales de destino del OTP.
Son los datos oficiales del colegio médico, NO los que el médico ingresó al registrarse.
Esto garantiza que solo el verdadero titular de la cédula pueda completar la verificación.

**RLS:** Solo accesible vía `service_role` (backend). Nunca expuesta al frontend.

---

### 3. `doctor_verification_codes` 🆕 NUEVA (Δ-5)
```sql
CREATE TABLE public.doctor_verification_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verified_doctor_id UUID NOT NULL REFERENCES public.verified_doctors(id),
  code            VARCHAR(6) NOT NULL,           -- Código OTP de 6 dígitos
  channel         VARCHAR(10) NOT NULL,          -- 'email' o 'sms'
  destination     VARCHAR(255) NOT NULL,         -- Email/teléfono enmascarado para logs
  status          verification_status NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,    -- Intentos de verificación
  max_attempts    INTEGER NOT NULL DEFAULT 3,    -- Máximo 3 intentos por código
  expires_at      TIMESTAMPTZ NOT NULL,          -- Expiración (15 minutos)
  verified_at     TIMESTAMPTZ,                   -- Cuando se verificó exitosamente
  ip_address      VARCHAR(45),                   -- IP del solicitante (seguridad)
  user_agent      TEXT,                          -- User agent (seguridad)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_dvc_user_id ON public.doctor_verification_codes(user_id);
CREATE INDEX idx_dvc_code_status ON public.doctor_verification_codes(code, status);
CREATE INDEX idx_dvc_expires ON public.doctor_verification_codes(expires_at);

-- RLS: solo accesible vía service_role (backend maneja toda la lógica)
ALTER TABLE public.doctor_verification_codes ENABLE ROW LEVEL SECURITY;
-- No se crean políticas públicas: todo pasa por el backend con service_role
```

**Reglas de seguridad:**
- Máximo 3 intentos por código generado
- Código expira en 15 minutos
- Máximo 5 códigos por día por usuario (rate limiting en Laravel)
- El código se hashea con bcrypt antes de almacenar (el campo `code` guarda el hash)
- Se registra IP y user_agent para auditoría
- Cooldown de 60 segundos entre solicitudes de código

---

### 4. `users` ✅ Sin cambios estructurales
```
id                UUID PK DEFAULT uuid_generate_v4()
supabase_uid      UUID UNIQUE
name              VARCHAR(255) NOT NULL
email             VARCHAR(255) NOT NULL UNIQUE
email_verified_at TIMESTAMPTZ
password          VARCHAR(255)
phone             VARCHAR(20)
avatar_url        TEXT
role              user_role DEFAULT 'patient'     -- Se asigna en registro
cedula            VARCHAR(20) UNIQUE
theme_preference  theme_preference DEFAULT 'system'
is_active         BOOLEAN DEFAULT true
remember_token    VARCHAR(100)
last_login_at     TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```
**Nota:** `role` se determina automáticamente: si la cédula existe en `verified_doctors` → `doctor`, si no → `patient`.

---

### 5. `doctor_profiles` ✅ Sin cambios
```
id                  UUID PK DEFAULT gen_random_uuid()
user_id             UUID NOT NULL UNIQUE FK → users.id
specialty_id        UUID NOT NULL FK → specialties.id
license_number      VARCHAR(50) UNIQUE
university          VARCHAR(255)
years_experience    INTEGER DEFAULT 0
consultation_fee    DECIMAL(10,2)
bio                 TEXT
is_verified         BOOLEAN DEFAULT false     ← Se pone TRUE tras OTP exitoso
is_available        BOOLEAN DEFAULT true
experience_count    INTEGER DEFAULT 0         ← NUNCA rating_avg
next_available_slot TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### 6. `patient_profiles` ✅ Sin cambios
```
id                      UUID PK DEFAULT gen_random_uuid()
user_id                 UUID NOT NULL UNIQUE FK → users.id
date_of_birth           DATE
blood_type              VARCHAR(5)
height_cm               INTEGER
allergies               TEXT[]
chronic_conditions      TEXT[]
emergency_contact_name  VARCHAR(255)
emergency_contact_phone VARCHAR(20)
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
```

---

### 7. `specialty_profiles` ✅ Sin cambios
```
id              UUID PK DEFAULT gen_random_uuid()
patient_id      UUID NOT NULL FK → users.id
specialty_id    UUID NOT NULL FK → specialties.id
data            JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

---

### 8. `clinics` ✅ Sin cambios
```
id          UUID PK DEFAULT gen_random_uuid()
name        VARCHAR(255) NOT NULL
rif         VARCHAR(20) NOT NULL UNIQUE
logo_url    TEXT
phone       VARCHAR(20)
email       VARCHAR(255)
website     VARCHAR(255)
description TEXT
is_active   BOOLEAN DEFAULT false        ← Activada por superadmin
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

---

### 9. `clinic_branches` ✅ Sin cambios
```
id              UUID PK DEFAULT gen_random_uuid()
clinic_id       UUID NOT NULL FK → clinics.id
name            VARCHAR(255) NOT NULL
address         TEXT NOT NULL
location        GEOGRAPHY(POINT, 4326)   ← PostGIS
phone           VARCHAR(20)
email           VARCHAR(255)
is_main_branch  BOOLEAN DEFAULT false
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```
**Índice GIST:** `CREATE INDEX idx_clinic_branches_location ON clinic_branches USING GIST(location);`

---

### 10. `clinic_admins` ✅ Sin cambios
```
id          UUID PK DEFAULT gen_random_uuid()
user_id     UUID NOT NULL FK → users.id
clinic_id   UUID NOT NULL FK → clinics.id
is_owner    BOOLEAN DEFAULT false
permissions JSONB DEFAULT '{"manage_doctors": true, "manage_branches": true, "view_reports": true}'
is_active   BOOLEAN DEFAULT true
joined_at   TIMESTAMPTZ DEFAULT NOW()
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

---

### 11. `clinic_doctors` ⚠️ Cambio conceptual (Δ-5)
```
clinic_id   UUID FK → clinics.id       ← PK compuesta
doctor_id   UUID FK → users.id         ← PK compuesta
branch_id   UUID FK → clinic_branches.id
is_active   BOOLEAN DEFAULT true
joined_at   TIMESTAMPTZ DEFAULT NOW()
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```
**Cambio Δ-5:** Esta tabla ahora es **solo para vinculación**. La clínica NO verifica
al médico; solo puede vincular médicos que ya tengan `is_verified = true` en su
`doctor_profile`. La verificación es independiente via OTP.

---

### 12. `doctor_patient_relationships` ✅ Sin cambios
```
id          UUID PK DEFAULT uuid_generate_v4()
doctor_id   UUID NOT NULL FK → users.id
patient_id  UUID NOT NULL FK → users.id
status      relationship_status DEFAULT 'pending'
started_at  TIMESTAMPTZ
ended_at    TIMESTAMPTZ
created_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## TABLAS PENDIENTES (Sprints 2-7)

### Sprint 2: `schedules`
```
id                UUID PK
doctor_id         UUID FK → users.id
branch_id         UUID FK → clinic_branches.id
day_of_week       day_of_week NOT NULL
start_time        TIME NOT NULL
end_time          TIME NOT NULL
slot_duration_min INTEGER DEFAULT 30
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 3: `appointments`
```
id              UUID PK
patient_id      UUID FK → users.id
doctor_id       UUID FK → users.id
clinic_id       UUID FK → clinics.id
branch_id       UUID FK → clinic_branches.id
scheduled_at    TIMESTAMPTZ NOT NULL
duration_min    INTEGER DEFAULT 30
status          appointment_status DEFAULT 'pending'
notes           TEXT
cancellation_reason TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 4: `medical_records`
```
id                UUID PK
patient_id        UUID FK → users.id
doctor_id         UUID FK → users.id
type              record_type NOT NULL
title             VARCHAR(255)
description       TEXT
storage_path      TEXT               -- Ruta en Supabase Storage
metadata          JSONB DEFAULT '{}'
specialty_context JSONB DEFAULT '{}' -- Datos específicos de especialidad
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 4: `vital_signs`
```
id              UUID PK
patient_id      UUID FK → users.id
recorded_by     UUID FK → users.id  -- Médico que registró
recorded_at     TIMESTAMPTZ NOT NULL
weight_kg       DECIMAL(5,2)
systolic_bp     INTEGER
diastolic_bp    INTEGER
heart_rate      INTEGER
temperature_c   DECIMAL(4,1)
specialty_data  JSONB DEFAULT '{}' -- Ej: { gestational_week: 28, fetal_heart_rate: 142 }
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 5: `messages`
```
id                UUID PK
relationship_id   UUID FK → doctor_patient_relationships.id
sender_id         UUID FK → users.id
content_encrypted TEXT NOT NULL     -- AES-256 cifrado
type              message_type DEFAULT 'text'
read_at           TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 5: `experiences` (NUNCA crear tabla `ratings`)
```
id              UUID PK
patient_id      UUID FK → users.id
doctor_id       UUID FK → doctor_profiles.id
appointment_id  UUID FK → appointments.id UNIQUE
content         TEXT NOT NULL       -- 50-1000 chars
tags            UUID[]              -- Array FK → experience_tags.id
is_anonymous    BOOLEAN DEFAULT false
status          experience_status DEFAULT 'pending'
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 5: `experience_tags`
```
id          UUID PK
name        VARCHAR(100) NOT NULL
icon        VARCHAR(50)
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 5: `referrals`
```
id                  UUID PK
referrer_id         UUID FK → users.id
referred_patient_id UUID FK → users.id
doctor_id           UUID FK → doctor_profiles.id
trust_score         DECIMAL(3,2) DEFAULT 0 -- Basado en experiencias, NO estrellas
message             TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
```

### Sprint 5: `notifications`
```
id          UUID PK
user_id     UUID FK → users.id
type        VARCHAR(50) NOT NULL
title       VARCHAR(255) NOT NULL
body        TEXT
data        JSONB DEFAULT '{}'
read_at     TIMESTAMPTZ
created_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## FLUJO DE VERIFICACIÓN DETALLADO (Δ-5)

### Endpoints Laravel

```
POST /api/v1/auth/register                    -- Registro unificado (detecta rol por cédula)
POST /api/v1/auth/login                       -- Login
POST /api/v1/doctor/verification/request-code -- Solicitar OTP (rate-limited)
POST /api/v1/doctor/verification/verify-code  -- Verificar OTP
GET  /api/v1/doctor/verification/status       -- Estado de verificación
```

### DoctorVerificationService (Laravel)

```php
final class DoctorVerificationService
{
    /**
     * 1. Buscar verified_doctor por cédula del user
     * 2. Validar rate limiting (max 5 códigos/día)
     * 3. Generar código de 6 dígitos
     * 4. Hash con bcrypt y guardar en doctor_verification_codes
     * 5. Enviar código al email/teléfono de verified_doctors (NO del user)
     * 6. Retornar canal enmascarado: "j***@gm***.com" o "+58***4567"
     */
    public function requestCode(User $user): array {}

    /**
     * 1. Buscar código activo (status = 'code_sent', no expirado)
     * 2. Verificar intentos < max_attempts
     * 3. Comparar hash del código
     * 4. Si válido: marcar verified, actualizar doctor_profile.is_verified = true
     * 5. Si inválido: incrementar attempts, si >= max → status = 'failed'
     */
    public function verifyCode(User $user, string $code): bool {}
}
```

### Seguridad del OTP
- Código: 6 dígitos numéricos (000000-999999)
- Almacenamiento: bcrypt hash (nunca plaintext en DB)
- Expiración: 15 minutos desde generación
- Intentos: máximo 3 por código
- Rate limiting: máximo 5 solicitudes por día por usuario
- Cooldown: 60 segundos entre solicitudes
- Canal: SIEMPRE al email/teléfono de `verified_doctors`, nunca al del registro
- Auditoría: se registra IP y user_agent
- El código no se retorna en la response (solo se envía al canal)

---

## MIGRACIÓN SQL PARA Δ-5

```sql
-- Migración: s1_5_create_verification_codes
-- Descripción: Tabla para códigos OTP de verificación de médicos

-- 1. Crear ENUM verification_status
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM (
    'pending', 'code_sent', 'verified', 'failed', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Crear tabla doctor_verification_codes
CREATE TABLE IF NOT EXISTS public.doctor_verification_codes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verified_doctor_id UUID       NOT NULL REFERENCES public.verified_doctors(id),
  code              VARCHAR(255) NOT NULL,  -- bcrypt hash del código
  channel           VARCHAR(10)  NOT NULL CHECK (channel IN ('email', 'sms')),
  destination       VARCHAR(255) NOT NULL,  -- Enmascarado: j***@gm***.com
  status            public.verification_status NOT NULL DEFAULT 'pending',
  attempts          INTEGER      NOT NULL DEFAULT 0,
  max_attempts      INTEGER      NOT NULL DEFAULT 3,
  expires_at        TIMESTAMPTZ  NOT NULL,
  verified_at       TIMESTAMPTZ,
  ip_address        VARCHAR(45),
  user_agent        TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX idx_dvc_user_id ON public.doctor_verification_codes(user_id);
CREATE INDEX idx_dvc_status_expires ON public.doctor_verification_codes(status, expires_at);

-- 4. RLS (solo backend vía service_role)
ALTER TABLE public.doctor_verification_codes ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: toda operación pasa por el backend

-- 5. Trigger para limpiar códigos expirados (opcional, ejecutar via cron)
CREATE OR REPLACE FUNCTION public.expire_verification_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE doctor_verification_codes
  SET status = 'expired'
  WHERE status IN ('pending', 'code_sent')
    AND expires_at < NOW();
$$;
```

---

## MODELOS LARAVEL ACTUALIZADOS

### DoctorVerificationCode (NUEVO)
```php
<?php
declare(strict_types=1);
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DoctorVerificationCode extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'verified_doctor_id', 'code', 'channel',
        'destination', 'status', 'attempts', 'max_attempts',
        'expires_at', 'verified_at', 'ip_address', 'user_agent',
    ];

    protected $casts = [
        'expires_at'  => 'datetime',
        'verified_at' => 'datetime',
        'created_at'  => 'datetime',
        'attempts'    => 'integer',
        'max_attempts' => 'integer',
    ];

    protected $hidden = ['code']; // Nunca exponer el hash

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifiedDoctor(): BelongsTo
    {
        return $this->belongsTo(VerifiedDoctor::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function hasAttemptsLeft(): bool
    {
        return $this->attempts < $this->max_attempts;
    }

    public function isUsable(): bool
    {
        return $this->status === 'code_sent'
            && !$this->isExpired()
            && $this->hasAttemptsLeft();
    }
}
```

### Enum: VerificationStatus (NUEVO)
```php
<?php
declare(strict_types=1);
namespace App\Enums;

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

## RESUMEN DE CAMBIOS EN ARCHIVOS DEL PROYECTO

### Archivos a CREAR:
- `app/Models/DoctorVerificationCode.php`
- `app/Enums/VerificationStatus.php`
- `app/Services/DoctorVerificationService.php`
- `app/Http/Controllers/Doctor/VerificationController.php`
- `app/Http/Requests/Doctor/RequestVerificationCodeRequest.php`
- `app/Http/Requests/Doctor/VerifyCodeRequest.php`
- `app/Jobs/SendVerificationCodeJob.php` (queue para envío de email/SMS)
- `app/Notifications/DoctorVerificationCodeNotification.php`
- Migración Supabase: `s1_5_create_verification_codes`

### Archivos a EDITAR:
- `routes/api.php` — Agregar rutas de verificación
- `app/Services/AuthService.php` — El registro ya NO verifica automáticamente
- `CLAUDE.md` — Actualizar modelo de negocio
- `.claude/skills/supabase-database.md` — Agregar tabla verification_codes
- `.claude/skills/backend-laravel.md` — Actualizar flujo de registro
- `.claude/sprints/SPRINT_1.md` — Agregar tarea S1.5b de verificación OTP

### Archivos SIN cambios:
- Todas las tablas existentes (users, clinics, clinic_branches, etc.)
- Los modelos existentes (User, Clinic, DoctorProfile, etc.)
- Los middleware existentes
- El frontend (mismo flujo, solo se agrega pantalla de verificación OTP)

---

## NOTAS IMPORTANTES

1. **verified_doctors sigue siendo tabla maestra** — administrada por superadmin via CLI (`php artisan doctor:verify`)
2. **Las clínicas NO verifican médicos** — solo vinculan médicos ya verificados
3. **El OTP va al canal oficial** — el email/teléfono en `verified_doctors`, NO el del registro del usuario
4. **El código se hashea** — bcrypt, nunca plaintext en la DB
5. **Rate limiting estricto** — 5 intentos/día, cooldown 60s, código expira 15min
6. **Auditoría completa** — IP + user_agent en cada solicitud
