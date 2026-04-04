# Skill: Supabase — Base de Datos y Migraciones
**Archivo:** `.claude/skills/supabase-database.md`  
**Propósito:** Reglas para crear migraciones, políticas RLS y funciones
PostgreSQL en este proyecto.

---

## Proyecto Supabase

- **Project ID:** `sdcvmigvumhtorhzobjj`
- **Región:** us-east-1
- **PostgreSQL:** 17.6
- **PostGIS:** 3.3 ✅ activo
- **pgcrypto:** 1.3 ✅ activo
- **uuid-ossp:** 1.1 ✅ activo

---

## Convención de Nombres de Migraciones

```
s{sprint}_{descripcion_en_snake_case}

Ejemplos:
  s1_create_clinics
  s1_create_doctor_profiles
  s1_rls_policies
  s2_rpc_get_nearby_doctors
  s3_create_appointments
```

**Regla:** NUNCA modificar una migración ya ejecutada. Siempre crear una nueva.

---

## Estructura Base de Tablas

```sql
-- Toda tabla debe seguir esta estructura base
CREATE TABLE public.nombre_tabla (
  id          UUID        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- ... campos propios ...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.nombre_tabla
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS siempre habilitado
ALTER TABLE public.nombre_tabla ENABLE ROW LEVEL SECURITY;
```

---

## ENUMs Disponibles (ya creados en Sprint 0 y S1.5)

```sql
user_role:            patient | doctor | clinic_admin | superadmin
theme_preference:     light | dark | system
appointment_status:   pending | confirmed | in_progress | completed | cancelled | no_show
relationship_status:  pending | active | completed | terminated
record_type:          lab_result | ultrasound | prescription | consultation_note | imaging | vaccine | other
experience_status:    pending | published | reported | hidden
message_type:         text | image | file | system
day_of_week:          monday | tuesday | wednesday | thursday | friday | saturday | sunday
-- Creado en s1_5 (Δ-5):
verification_status:  pending | code_sent | verified | failed | expired
```

---

## Tabla `doctor_verification_codes` (Δ-5 — Sprint 1)

Almacena códigos OTP para verificación independiente de médicos. Solo accesible
vía `service_role` (backend). **El campo `code` guarda el bcrypt hash, nunca plaintext.**

```sql
-- Migración: s1_5_create_verification_codes
id                 UUID PK DEFAULT gen_random_uuid()
user_id            UUID NOT NULL FK → users.id ON DELETE CASCADE
verified_doctor_id UUID NOT NULL FK → verified_doctors.id
code               VARCHAR(255) NOT NULL    -- bcrypt hash del OTP
channel            VARCHAR(10) NOT NULL     -- 'email' | 'sms'
destination        VARCHAR(255) NOT NULL    -- canal enmascarado: "j***@gm***.com"
status             verification_status NOT NULL DEFAULT 'pending'
attempts           INTEGER NOT NULL DEFAULT 0
max_attempts       INTEGER NOT NULL DEFAULT 3
expires_at         TIMESTAMPTZ NOT NULL     -- 15 minutos desde creación
verified_at        TIMESTAMPTZ
ip_address         VARCHAR(45)              -- auditoría
user_agent         TEXT                     -- auditoría
created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Reglas de negocio:**
- Máximo 3 intentos por código; si `attempts >= max_attempts` → `status = 'failed'`
- Código expira a los 15 minutos (`expires_at < NOW()` → `status = 'expired'`)
- Rate limiting: máximo 5 solicitudes/día por usuario (controlado en Laravel)
- Cooldown de 60 segundos entre solicitudes
- El OTP se envía al `email`/`phone` de `verified_doctors`, NUNCA al del registro

**RLS:** Solo `service_role`. Sin políticas públicas.

```sql
ALTER TABLE public.doctor_verification_codes ENABLE ROW LEVEL SECURITY;
-- Sin políticas: toda operación pasa por el backend
```

**Nota sobre `clinic_doctors` (Δ-5):** Esta tabla es **solo para vinculación**.
Una clínica solo puede vincular médicos que ya tengan `doctor_profiles.is_verified = true`.
La clínica nunca puede establecer `is_verified`; eso solo lo hace `DoctorVerificationService`.

---

## PostGIS — Convenciones

```sql
-- SIEMPRE usar GEOGRAPHY (no GEOMETRY) para distancias reales en metros
location GEOGRAPHY(POINT, 4326)

-- Índice GIST obligatorio en columnas geography
CREATE INDEX idx_tabla_location ON public.tabla USING GIST (location);

-- Insertar punto geográfico
ST_MakePoint(longitud, latitud)::geography
-- NOTA: el orden es (lng, lat), no (lat, lng)

-- Consulta de distancia
ST_Distance(punto_a::geography, punto_b::geography)  -- retorna metros

-- Consulta dentro de radio
ST_DWithin(punto_a::geography, punto_b::geography, radio_en_metros)
```

---

## Plantilla de Política RLS

```sql
-- Lectura pública (directorio)
CREATE POLICY "{tabla}_public_read"
  ON public.{tabla} FOR SELECT
  USING (true);

-- Propietario ve/edita sus propios registros
CREATE POLICY "{tabla}_owner"
  ON public.{tabla} FOR ALL
  USING (auth.uid() = user_id);

-- Scope de clínica (clinic_admin solo ve su clínica)
CREATE POLICY "{tabla}_clinic_scope"
  ON public.{tabla} FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_admins
      WHERE user_id = auth.uid()
    )
  );

-- Médico activo puede ver datos de sus pacientes
CREATE POLICY "{tabla}_active_doctor"
  ON public.{tabla} FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_relationships dpr
      WHERE dpr.doctor_id = auth.uid()
        AND dpr.patient_id = {tabla}.patient_id
        AND dpr.status = 'active'
    )
  );
```

---

## Función RPC get_nearby_doctors (Sprint 2)

```sql
CREATE OR REPLACE FUNCTION public.get_nearby_doctors(
  p_lat        FLOAT,
  p_lng        FLOAT,
  p_radius_m   FLOAT    DEFAULT 5000,
  p_specialty_id UUID   DEFAULT NULL,
  p_limit      INTEGER  DEFAULT 20
)
RETURNS TABLE (
  doctor_id        UUID,
  full_name        TEXT,
  specialty_name   TEXT,
  clinic_name      TEXT,
  clinic_logo_url  TEXT,
  distance_m       FLOAT,
  is_available     BOOLEAN,
  next_slot        TIMESTAMPTZ,
  consultation_fee DECIMAL,
  experience_count INTEGER
)
LANGUAGE sql STABLE AS $$
  SELECT
    d.id,
    u.full_name,
    s.name,
    c.name,
    c.logo_url,
    ST_Distance(cb.location::geography, ST_MakePoint(p_lng, p_lat)::geography),
    d.is_available,
    d.next_available_slot,
    d.consultation_fee,
    d.experience_count
  FROM doctor_profiles d
  JOIN users u              ON u.id = d.user_id
  JOIN specialties s        ON s.id = d.specialty_id
  JOIN clinic_doctors cd    ON cd.doctor_id = d.id AND cd.is_active = true
  JOIN clinics c            ON c.id = cd.clinic_id AND c.is_active = true
  JOIN clinic_branches cb   ON cb.clinic_id = c.id AND cb.is_active = true
  WHERE d.is_verified = true
    AND d.is_active = true
    AND (p_specialty_id IS NULL OR s.id = p_specialty_id)
    AND ST_DWithin(
      cb.location::geography,
      ST_MakePoint(p_lng, p_lat)::geography,
      p_radius_m
    )
  ORDER BY d.is_available DESC,
           ST_Distance(cb.location::geography, ST_MakePoint(p_lng, p_lat)::geography) ASC
  LIMIT p_limit;
$$;
```

---

## Reglas de Seguridad Absolutas

```sql
-- ❌ NUNCA — tabla ratings no existe
CREATE TABLE ratings (...);
-- ✅ CORRECTO
CREATE TABLE experiences (...);  -- [Δ-2]

-- ❌ NUNCA — una clínica no puede verificar médicos [Δ-5]
UPDATE doctor_profiles SET is_verified = true WHERE ...;  -- desde contexto de clínica
-- ✅ CORRECTO — solo DoctorVerificationService (tras OTP exitoso) puede hacer esto

-- ❌ NUNCA — guardar OTP en plaintext
INSERT INTO doctor_verification_codes (code) VALUES ('123456');
-- ✅ CORRECTO
INSERT INTO doctor_verification_codes (code) VALUES (bcrypt('123456'));  -- [Δ-5]

-- ❌ NUNCA — URLs públicas para archivos médicos
-- Los buckets de medical-files deben ser PRIVADOS siempre
-- Las URLs se generan con Signed URLs desde Laravel (15 min)

-- ❌ NUNCA — deshabilitar RLS en tablas de datos
ALTER TABLE medical_records DISABLE ROW LEVEL SECURITY;

-- ❌ NUNCA — hardcodear UUIDs de especialidades en migraciones
WHERE specialty_id = '35fb7058-b3ed-4471-a0e6-4f9852f954c0'
-- ✅ CORRECTO — usar subquery
WHERE specialty_id = (SELECT id FROM specialties WHERE slug = 'ginecobstetricia')
```

---

## Seed Data de Ginecobstetricia

El UUID de Ginecobstetricia se obtiene así (no hardcodear):

```sql
SELECT id FROM public.specialties WHERE slug = 'ginecobstetricia';
```

### Experience Tags (seed Sprint 5)

```sql
INSERT INTO public.experience_tags (name, icon, is_active) VALUES
  ('Puntual',                 'clock',           true),
  ('Explicativo',             'chat-bubble',      true),
  ('Trato humano',            'heart',            true),
  ('Instalaciones cómodas',   'building',         true),
  ('Seguimiento post-consulta','calendar-check',  true);
```

---

## Verificaciones Útiles

```sql
-- Ver todas las tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Ver todas las políticas RLS
SELECT tablename, policyname, cmd, qual
FROM pg_policies WHERE schemaname = 'public';

-- Ver extensiones activas
SELECT name, installed_version FROM pg_available_extensions
WHERE installed_version IS NOT NULL;

-- Verificar función PostGIS
SELECT PostGIS_Version();

-- Contar registros por tabla
SELECT 'specialties', COUNT(*) FROM specialties
UNION ALL SELECT 'clinics', COUNT(*) FROM clinics
UNION ALL SELECT 'users', COUNT(*) FROM users;
```
