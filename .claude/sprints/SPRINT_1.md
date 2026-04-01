# Sprint 1 — Auth Diferenciada + Modelo Clínica
**Semanas:** 3–4  
**Estado:** 🔄 PRÓXIMO

---

## Objetivo
Crear toda la estructura de autenticación diferenciada por rol y el modelo
de clínica como tenant principal. Al finalizar este sprint, los tres tipos
de usuario (paciente, médico invitado, clinic_admin) deben poder registrarse
y autenticarse, y una clínica debe poder dar de alta a sus médicos.

---

## Tareas

| ID | Tarea | Entregable Verificable | Estado |
|----|-------|----------------------|--------|
| S1.1 | Migraciones: users, clinics, clinic_branches, clinic_admins, doctor_profiles, patient_profiles, specialty_profiles | Tablas creadas con FK correctas | ⏳ |
| S1.2 | Tabla clinic_doctors (junction N:M clínica-médico) | Relación N:M funcional | ⏳ |
| S1.3 | Flujo registro: Paciente, Clinic Admin, Médico (invitado por clínica) | Tres flujos diferenciados | ⏳ |
| S1.4 | Middleware Laravel: EnsureIsDoctor, EnsureIsPatient, EnsureIsClinicAdmin, EnsureDoctorVerified | Rutas protegidas por rol | ⏳ |
| S1.5 | Panel clínica: alta de médicos con verificación implícita (is_verified = true) | Médico creado = verificado automáticamente | ⏳ |
| S1.6 | RLS en todas las tablas con clinic scope | Tests de acceso no autorizado fallando | ⏳ |
| S1.7 | Pantallas RN: Login, Registro Paciente, Onboarding, Invitación Médico | Navegación completa de auth | ⏳ |
| S1.8 | Sistema de temas dark/light con tokens semánticos en NativeWind | Toggle funcional + respeta OS | ⏳ |

---

## Migraciones a Ejecutar (Supabase)

### Orden de ejecución (respetar FK)
1. `s1_modify_users` — Extender tabla users de Laravel con campos propios
2. `s1_create_clinics` — Tabla clinics (tenant principal)
3. `s1_create_clinic_branches` — Sedes con PostGIS POINT
4. `s1_create_clinic_admins` — Junction user-clínica para admins
5. `s1_create_doctor_profiles` — Perfil médico con specialty_id FK
6. `s1_create_patient_profiles` — Perfil base del paciente
7. `s1_create_specialty_profiles` — Datos JSONB por especialidad (Δ-4)
8. `s1_create_clinic_doctors` — Junction N:M clínica-médico
9. `s1_rls_policies` — Todas las políticas RLS del sprint

---

## Esquema de Tablas Clave

### users (extensión de la tabla Laravel)
```sql
ALTER TABLE public.users ADD COLUMN role user_role NOT NULL DEFAULT 'patient';
ALTER TABLE public.users ADD COLUMN phone VARCHAR(20);
ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN theme_preference theme_preference NOT NULL DEFAULT 'system';
ALTER TABLE public.users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

### clinics [Δ-1 NUEVA]
```
id, name, rif (UNIQUE), logo_url, phone, email, is_active (DEFAULT false),
created_at
```
> `is_active = false` por defecto. El superadmin la activa manualmente.

### clinic_branches [Δ-1 NUEVA]
```
id, clinic_id FK, name, address, location GEOGRAPHY(POINT,4326),
phone, is_active
```
> El campo `location` usa PostGIS. Índice GIST obligatorio.

### doctor_profiles [ACTUALIZADA]
```
id, user_id FK UNIQUE, specialty_id FK, license_number, university,
years_experience, consultation_fee, bio, is_verified (DEFAULT false),
is_available (DEFAULT true), experience_count (DEFAULT 0),
next_available_slot TIMESTAMPTZ
```
> `experience_count` reemplaza `rating_avg`. NUNCA agregar `rating_avg`.

### clinic_doctors [Δ-1 NUEVA — Junction N:M]
```
clinic_id FK, doctor_id FK, branch_id FK, is_active, joined_at
PRIMARY KEY (clinic_id, doctor_id)
```

---

## Lógica de Verificación Implícita [Δ-1]

Cuando un clinic_admin registra un médico desde su panel:
1. Se crea el `user` con `role = 'doctor'`
2. Se crea el `doctor_profile` con `is_verified = TRUE` automáticamente
3. Se crea registro en `clinic_doctors` vinculando médico a la clínica
4. Se envía email de invitación al médico para configurar su contraseña

**El médico NUNCA se auto-registra.** Siempre es invitado por una clínica.

---

## Políticas RLS a Implementar

| Tabla | Operación | Condición |
|-------|-----------|-----------|
| clinics | SELECT | `true` (directorio público) |
| clinics | UPDATE | Solo clinic_admin de esa clínica |
| doctor_profiles | SELECT | `true` (directorio público) |
| doctor_profiles | UPDATE | `auth.uid() = user_id` O clinic_admin |
| patient_profiles | SELECT/UPDATE | `auth.uid() = user_id` |
| specialty_profiles | SELECT/UPDATE | `auth.uid() = patient_id` |
| clinic_doctors | SELECT | `true` |
| clinic_doctors | INSERT/UPDATE | Solo clinic_admin de esa clínica |

---

## Archivos Laravel a Crear

```
app/Http/Controllers/Auth/
  ├── RegisterPatientController.php
  ├── RegisterClinicAdminController.php
  └── LoginController.php

app/Http/Controllers/Clinic/
  ├── ClinicController.php
  ├── ClinicDoctorController.php    ← alta/baja de médicos
  └── BranchController.php

app/Http/Middleware/
  ├── EnsureIsDoctor.php
  ├── EnsureIsPatient.php
  ├── EnsureIsClinicAdmin.php       ← [Δ-1 NUEVO]
  └── EnsureDoctorVerified.php

app/Services/
  ├── AuthService.php
  └── ClinicService.php             ← [Δ-1 NUEVO]
```

---

## Pantallas React Native a Crear

```
src/features/auth/
  ├── LoginScreen.tsx
  ├── RegisterPatientScreen.tsx
  ├── OnboardingScreen.tsx
  └── DoctorInviteScreen.tsx        ← deep link desde email

src/features/clinic-panel/          ← [Δ-1 NUEVO]
  ├── ClinicDashboardScreen.tsx
  └── ManageDoctorsScreen.tsx

src/shared/theme/
  ├── colors.ts                     ← tokens light/dark [Δ-3]
  └── index.ts

src/store/
  ├── authStore.ts
  └── themeStore.ts                 ← [Δ-3]
```

---

## Tokens de Diseño Dark/Light [Δ-3]

```typescript
// src/shared/theme/colors.ts
export const semanticColors = {
  background:      { light: '#FFFFFF',  dark: '#0F172A' },
  surface:         { light: '#F8FAFC',  dark: '#1E293B' },
  surfaceElevated: { light: '#FFFFFF',  dark: '#334155' },
  textPrimary:     { light: '#1A3C5E',  dark: '#E2E8F0' },
  textSecondary:   { light: '#666666',  dark: '#94A3B8' },
  primary:         { light: '#1A3C5E',  dark: '#5BA3D9' },
  accent:          { light: '#2E86AB',  dark: '#5BC0DE' },
  accentRose:      { light: '#A23B72',  dark: '#D4779B' },
  border:          { light: '#E2E8F0',  dark: '#334155' },
  error:           { light: '#C0392B',  dark: '#E74C3C' },
  success:         { light: '#2D8659',  dark: '#52C41A' },
};
```

---

## Entregable Final del Sprint

- [ ] `GET /api/v1/health` retorna 200 con rol del usuario autenticado
- [ ] Paciente puede registrarse y loguearse
- [ ] Clinic Admin puede loguearse y ver su panel
- [ ] Clinic Admin puede crear un médico (que queda is_verified = true)
- [ ] Médico puede loguearse con las credenciales enviadas por email
- [ ] Dark mode toggle funcional en la app
- [ ] Todos los accesos no autorizados retornan 403
