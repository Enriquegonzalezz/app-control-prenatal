# CLAUDE.md — Contexto del Proyecto

## ¿Qué es este proyecto?
Aplicación Asistida para el Control Prenatal — Tesis de Grado.
Universidad José Antonio Páez, Marzo 2026.
Autores: Samuel Molina Pacheco & Enrique González Castelli.

## Stack Tecnológico
- **Mobile:** React Native + NativeWind v4 (dark/light mode nativo)
- **Backend:** Laravel 11 + Sanctum (API REST)
- **Base de Datos:** Supabase (PostgreSQL 17 + PostGIS + Auth + Storage + Realtime)
- **Supabase Project ID:** sdcvmigvumhtorhzobjj
- **Región:** us-east-1

## Modelo de Negocio
B2B: las clínicas son el cliente principal (tenant). Los médicos se
**auto-registran de forma independiente** y se verifican via **OTP** contra
la tabla maestra `verified_doctors`.

**Vinculación médico↔clínica (Δ-6, actualizado mayo 2026):**
- Las clínicas **NO registran ni vinculan médicos**.
- Cada médico, después de verificarse via OTP, **selecciona desde la app**
  la(s) clínica(s) donde atiende, opcionalmente eligiendo la sede.
- La vinculación es **unilateral por parte del médico** (no requiere aprobación
  de la clínica). Endpoint: `POST /api/v1/doctor/clinics/{clinic}/link`.
- Las clínicas continúan siendo tenant que provee la infraestructura
  (sedes, ubicaciones GPS, datos administrativos), pero ya no controlan
  qué médicos atienden en ellas.

Las pacientes acceden al directorio de especialistas verificados.

**Slots y agenda (Δ-7, junio 2026):**
- Los horarios/slots **solo pueden crearse en una sede de clínica verificada**
  (`branch_id` obligatorio). Se **eliminó** el flujo de "consultorios propios"
  libres (`doctor_offices`) para crear agenda: nada de clínicas escritas a mano.
- El médico elige la clínica desde un **dropdown del catálogo** (`GET /doctor/clinics/catalog`,
  todas las clínicas activas con sus sedes) y la sede. Al crear el horario queda
  **auto-vinculado** a esa clínica (`clinic_doctors`) — ya no hace falta vincularse aparte.
- **Agenda indefinida:** `schedules.auto_extend = true` → el comando `slots:extend`
  (scheduler diario 03:00, `schedule:work` en el entrypoint) mantiene los slots
  generados `ScheduleService::ROLLING_HORIZON_WEEKS` (12) semanas por delante.
- **Visibilidad en directorio:** un médico aparece/es agendable solo si está
  `is_verified = true`, vinculado a ≥1 clínica activa **y** con el **perfil
  profesional completo** (license_number, university, consultation_fee > 0, bio).
  Aplica en `DirectoryService::listAllDoctors` y en el RPC `get_nearby_doctors`.
  El médico edita estos campos en `PATCH /doctor/profile` (pantalla
  `mobile/app/doctor-profile-edit.tsx`); `DoctorProfile::isProfileComplete()` /
  `missingProfileFields()` son la fuente de verdad y se exponen en
  `DoctorProfileResource` (`is_profile_complete`, `missing_fields`).

**Mensajería en tiempo real (Δ-8, junio 2026):**
- El chat NO usa `postgres_changes` de Supabase. Los mensajes están **cifrados en
  servidor** (`messages.content_encrypted`, llave solo en Laravel) y la app móvil
  se autentica con **Sanctum** (sin JWT de Supabase, solo anon key) → RLS bloquearía
  esa escucha y la fila cruda sería ilegible.
- Patrón **híbrido**: Laravel persiste y luego empuja el payload **ya descifrado** a un
  canal **Broadcast** público de Supabase Realtime vía `SupabaseRealtimeService`
  (`POST {SUPABASE_URL}/realtime/v1/api/broadcast`, reusa `config('services.supabase')`).
  Topics: `chat:{relationship_id}` (eventos `new_message`, `message_read`) y
  `user:{userId}` (evento `conversation_bumped`). Se emite en `ChatService::send()` y
  `markRead()`; es **best-effort** (try/catch que loguea, nunca rompe la petición).
- Cliente: `mobile/src/lib/supabase.ts` (anon key, sin sesión) + hook
  `mobile/src/hooks/useChatRealtime.ts` (Broadcast + **Presence** para "en línea" real +
  `typing`). REST sigue siendo la **fuente de verdad** del historial (`useFocusEffect`
  recarga como red de seguridad). Requiere `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `mobile/.env`.
- Fase 2 (opcional, pre-producción): canales **privados** con JWT firmado por Supabase
  emitido desde Laravel + RLS sobre `realtime.messages` para autorización real.

## Principios Arquitectónicos Clave
1. **Multi-especialidad desde el día 1:** Ningún campo hace referencia
   hardcoded a "ginecobstetricia". Todo usa `specialty_id` + JSONB.
2. **Clínica como tenant:** Toda tabla sensible tiene `clinic_id`.
3. **Sin estrellas:** El feedback es narrativo (tabla `experiences`),
   no numérico. Nunca crear tabla `ratings`.
4. **Dark/Light mode:** Cada componente RN debe tener clases `dark:`.

## Migraciones ya ejecutadas en Supabase
- s0_enable_extensions (PostGIS 3.3, pgcrypto 1.3, uuid-ossp)
- s0_create_specialties (6 especialidades, Ginecobstetricia activa)
- s0_create_enums (user_role, theme_preference, appointment_status, etc.)
- s1_5_create_verification_codes (tabla doctor_verification_codes + ENUM verification_status) — **Δ-5**
- s2_fix_appointments_branch_nullable (appointments.branch_id nullable)
- s3_add_auto_extend_to_schedules (schedules.auto_extend bool — agenda indefinida) — **Δ-7**
- s4_seed_curated_clinics_venezuela (30 clínicas reales con sede + ubicación GPS; desactiva catálogo previo) — **Δ-7**
- s5_nearby_doctors_require_complete_profile (RPC get_nearby_doctors exige perfil profesional completo) — **Δ-7**

## Estructura de Carpetas

### Backend (Laravel 11) — /backend
```
app/Http/Controllers/Auth/
app/Http/Controllers/Clinic/       ← ClinicController, BranchController
app/Http/Controllers/Doctor/
app/Http/Controllers/Patient/
app/Http/Controllers/Shared/       ← Appointments, Chat, MedicalRecord
app/Http/Controllers/Experience/   ← reemplaza ratings
app/Http/Controllers/Admin/
app/Http/Middleware/               ← EnsureIsDoctor, EnsureIsPatient,
                                      EnsureIsClinicAdmin, EnsureDoctorVerified
app/Services/                      ← ClinicService, GeolocationService,
                                      ExperienceService, ChatService, etc.
app/Models/
app/Enums/
```

### Mobile (React Native) — /mobile
```
src/app/(tabs)/
src/app/(auth)/
src/features/auth/
src/features/directory/
src/features/appointments/
src/features/medical-history/
src/features/chat/
src/features/experiences/         ← Δ-2: reemplaza ratings
src/features/clinic-panel/        ← Δ-1: panel admin clínica
src/features/profile/
src/shared/components/
src/shared/hooks/                 ← useTheme, useSpecialty, useApi
src/shared/theme/                 ← colors.ts con tokens light/dark
src/store/                        ← authStore, themeStore, chatStore
```

## Convenciones de Código

### Laravel
- Controladores delgados → lógica en Services
- FormRequests para toda validación
- Responses siempre en JSON con estructura: `{ data, message, status }`
- Rutas versionadas: `/api/v1/...`
- Nunca hardcodear specialty logic en controllers

### React Native
- NativeWind para todo el styling (sin StyleSheet salvo casos especiales)
- Patrón: `className="bg-white dark:bg-slate-900"`
- Colores SIEMPRE desde `src/shared/theme/colors.ts`
- Hooks personalizados para toda lógica de negocio

## Variables de Entorno necesarias
### Backend (.env)
```
SUPABASE_URL=https://sdcvmigvumhtorhzobjj.supabase.co
SUPABASE_KEY=          ← service_role key (nunca exponer) — también autentica llamadas a Edge Functions
SUPABASE_ANON_KEY=     ← anon key
APP_KEY=               ← generar con artisan
```
### Mobile (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://sdcvmigvumhtorhzobjj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=   ← anon key únicamente
```
### Transporte de OTP — Toggle (Δ-6)
El job `SendVerificationCodeJob` soporta dos transportes via la env var
`OTP_EMAIL_TRANSPORT`:

```
OTP_EMAIL_TRANSPORT=smtp    ← Gmail SMTP (transición, sin DNS Resend)
OTP_EMAIL_TRANSPORT=resend  ← Edge Function resend-email (producción, dominio verificado)
```

**Modo `smtp` (transición):** usa `Mail::html()` de Laravel + credenciales
de Gmail (`MAIL_*`). Requiere App Password de Google (2FA activado).

**Modo `resend` (producción):** llama a la Edge Function `resend-email`
en Supabase, que enrouta al servicio Resend. Requiere:

```
RESEND_API_KEY=re_xxx           ← Configurar en Supabase Dashboard → Settings → Edge Functions → Secrets
RESEND_FROM_ADDRESS=...         ← Dirección FROM verificada en Resend (dominio propio con DNS configurado)
```

## Referencia de Tablas (Sprint 1 en adelante)
Las migraciones nuevas SIEMPRE van numeradas: `s1_`, `s2_`, etc.
Nunca modificar una migración ya ejecutada. Crear siempre una nueva.

## Lo que NUNCA debes hacer
- ❌ Crear tabla `ratings` o campo `rating_avg` — usar `experiences`
- ❌ Hardcodear "ginecobstetricia" en código — usar `specialty_id`
- ❌ URLs públicas para archivos médicos — siempre Signed URLs (15 min)
- ❌ Lógica de negocio en Controllers — va en Services
- ❌ Exponer `service_role` key en el frontend
- ❌ Que una clínica registre, verifique o vincule médicos — los médicos se auto-registran y se auto-vinculan a clínicas (Δ-6)
- ❌ Asignar `is_verified = true` al registrar un médico — la verificación es via OTP posterior (Δ-5)
- ❌ Enviar el OTP al email de registro del usuario — siempre al email/teléfono de `verified_doctors` (Δ-5)
- ❌ Guardar el código OTP en plaintext — siempre hash bcrypt en `doctor_verification_codes` (Δ-5)
- ❌ Usar `clinic_doctors.doctor_id` como FK a `doctor_profiles.id` — la FK apunta a `users.id` (corregido Δ-6)
- ❌ Permitir crear horarios/slots con consultorio propio o clínica escrita a mano — `branch_id` (sede de clínica verificada) es obligatorio (Δ-7)
- ❌ Mostrar en el directorio a un médico sin vínculo a clínica activa, aunque esté verificado (Δ-7)
- ❌ `clinic_doctors` NO tiene columna `id` (PK compuesta clinic_id+doctor_id); `clinics.is_active` default es `false` (setear true al sembrar)
- ❌ Suscribir el chat a `postgres_changes` de Supabase ni enviar la llave de cifrado al cliente — usar el patrón Broadcast del backend (Δ-8)
- ❌ Que el broadcast de Realtime rompa el guardado del mensaje — siempre best-effort (try/catch), el dato ya está en BD