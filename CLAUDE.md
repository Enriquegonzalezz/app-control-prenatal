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
la tabla maestra `verified_doctors`. Las clínicas **NO verifican médicos**;
solo vinculan médicos que ya estén verificados en la plataforma.
Las pacientes acceden al directorio de especialistas verificados.

## Principios Arquitectónicos Clave
1. **Multi-especialidad desde el día 1:** Ningún campo hace referencia
   hardcoded a "ginecobstetricia". Todo usa `specialty_id` + JSONB.
2. **Clínica como tenant:** Toda tabla sensible tiene `clinic_id`.
3. **Sin estrellas:** El feedback es narrativo (tabla `experiences`),
   no numérico. Nunca crear tabla `ratings`.
4. **Dark/Light mode:** Cada componente RN debe tener clases `dark:`.

## Estado Actual del Proyecto
- ✅ Sprint 0 completado (Supabase configurado: PostGIS, ENUMs, specialties)
- 🔄 Sprint 1 en curso: Auth diferenciada + Modelo Clínica + Verificación OTP (Δ-5 ✅)

## Migraciones ya ejecutadas en Supabase
- s0_enable_extensions (PostGIS 3.3, pgcrypto 1.3, uuid-ossp)
- s0_create_specialties (6 especialidades, Ginecobstetricia activa)
- s0_create_enums (user_role, theme_preference, appointment_status, etc.)
- s1_5_create_verification_codes (tabla doctor_verification_codes + ENUM verification_status) — **Δ-5**

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
### Supabase Secrets (Edge Functions)
```
RESEND_API_KEY=re_xxx           ← API key de resend.com (configurar via Dashboard o CLI)
RESEND_FROM_ADDRESS=...         ← Dirección FROM verificada en Resend
```
> Emails transaccionales (OTP) se envían via Edge Function `resend-email` + Resend API.
> No se usa SMTP directo.

## Referencia de Tablas (Sprint 1 en adelante)
Las migraciones nuevas SIEMPRE van numeradas: `s1_`, `s2_`, etc.
Nunca modificar una migración ya ejecutada. Crear siempre una nueva.

## Lo que NUNCA debes hacer
- ❌ Crear tabla `ratings` o campo `rating_avg` — usar `experiences`
- ❌ Hardcodear "ginecobstetricia" en código — usar `specialty_id`
- ❌ URLs públicas para archivos médicos — siempre Signed URLs (15 min)
- ❌ Lógica de negocio en Controllers — va en Services
- ❌ Exponer `service_role` key en el frontend
- ❌ Que una clínica verifique médicos — las clínicas solo VINCULAN médicos ya verificados (Δ-5)
- ❌ Asignar `is_verified = true` al registrar un médico — la verificación es via OTP posterior (Δ-5)
- ❌ Enviar el OTP al email de registro del usuario — siempre al email/teléfono de `verified_doctors` (Δ-5)
- ❌ Guardar el código OTP en plaintext — siempre hash bcrypt en `doctor_verification_codes` (Δ-5)
- ❌ Usar `Mail::` facade o SMTP directo para emails — siempre via Edge Function `resend-email`