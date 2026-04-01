# Sprint 0 — Infraestructura y Configuración Base
**Semanas:** 1–2  
**Estado:** ✅ COMPLETADO

---

## Objetivo
Dejar toda la infraestructura base lista para que los sprints siguientes
puedan arrancar sin fricciones: Supabase configurado, extensiones activas,
tablas base creadas, Laravel conectado a PostgreSQL y React Native inicializado.

---

## Tareas y Estado

| ID | Tarea | Estado |
|----|-------|--------|
| S0.1 | Crear proyecto Supabase (región us-east-1) | ✅ Completado |
| S0.2 | Habilitar PostGIS + pgcrypto en Supabase | ✅ Completado |
| S0.3 | Inicializar Laravel 11 con Sanctum | ✅ Completado |
| S0.4 | Inicializar React Native con NativeWind (dark mode) | ⏳ Pendiente |
| S0.5 | Configurar ESLint, Prettier, Husky | ⏳ Pendiente |
| S0.6 | Configurar Supabase Auth (email + Google) | ⏳ Pendiente |
| S0.7 | Repositorio GitHub con branching strategy | ✅ Completado |
| S0.8 | Tabla `specialties` con seed Ginecobstetricia + 5 futuras | ✅ Completado |

---

## Migraciones Ejecutadas en Supabase

| Versión | Nombre | Descripción |
|---------|--------|-------------|
| 20260322173723 | s0_enable_extensions | PostGIS 3.3, pgcrypto 1.3, uuid-ossp |
| 20260322173754 | s0_create_specialties | Tabla specialties + seed 6 especialidades |
| 20260322173808 | s0_create_enums | 8 ENUMs: user_role, theme_preference, appointment_status, relationship_status, record_type, experience_status, message_type, day_of_week |

## Migraciones de Laravel (internas)

Ejecutadas vía `php artisan migrate` contra Supabase PostgreSQL:
- `migrations` (registro de migraciones)
- `users` (base Laravel — se extiende en Sprint 1)
- `personal_access_tokens` (Sanctum)
- `sessions`, `cache`, `cache_locks`
- `jobs`, `job_batches`, `failed_jobs`
- `password_reset_tokens`

---

## Verificaciones Confirmadas

```sql
SELECT PostGIS_Version();
-- Resultado: "3.3 USE_GEOS=1 USE_PROJ=1 USE_STATS=1" ✅

SELECT COUNT(*) FROM public.specialties;
-- Resultado: 6 (1 activa: Ginecobstetricia) ✅
```

---

## Datos Importantes Generados

- **Supabase Project ID:** `sdcvmigvumhtorhzobjj`
- **Región:** us-east-1
- **Ginecobstetricia UUID:** consultar con `SELECT id FROM specialties WHERE slug = 'ginecobstetricia'`
- **DB Host (pooler):** `aws-0-us-east-1.pooler.supabase.com`
- **DB Username:** `postgres.sdcvmigvumhtorhzobjj`

---

## Pendientes para Completar Este Sprint

Los siguientes ítems son configuración del entorno local (no Supabase):

### S0.4 — React Native + NativeWind
```bash
cd mobile
npx create-expo-app . --template blank-typescript
npx expo install nativewind tailwindcss react-native-reanimated
```

### S0.5 — ESLint + Prettier + Husky
```bash
# En backend/
composer require --dev squizlabs/php_codesniffer

# En mobile/
npm install --save-dev eslint prettier husky @typescript-eslint/parser
npx husky init
```

### S0.6 — Supabase Auth
Configurar en el Dashboard de Supabase:
- Authentication → Providers → Email (ya activo por defecto)
- Authentication → Providers → Google (requiere OAuth credentials)
