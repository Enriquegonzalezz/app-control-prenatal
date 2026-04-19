# Sprint 4 — Historial Médico y Storage
**Semanas:** 9–10  
**Estado:** ✅ Backend + Frontend completados — pendiente solo gráficas vitales (S4.7)

---

## Objetivo
Implementar el historial médico digital con subida segura de archivos a
Supabase Storage. Acceso exclusivo para el binomio médico-paciente mediante
RLS + Signed URLs de 15 minutos.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S4.1 | Tabla `medical_records` con `specialty_context` JSONB | Migración con RLS activo | ✅ |
| S4.2 | Tabla `vital_signs` con campos genéricos + `specialty_data` JSONB | CRUD con extensibilidad | ✅ |
| S4.3 | Bucket privado en Supabase Storage con políticas de acceso | Upload/download solo para autorizados | ✅ |
| S4.4 | Endpoint upload con validación MIME + tamaño + Signed URL 15min | Archivo accesible vía URL temporal | ✅ |
| S4.5 | Pantalla Paciente: Mi Historial (tabs dinámicas por especialidad) | Tabs genéricas desde specialty schema | ✅ |
| S4.6 | Pantalla Médico: Historial de Paciente (lectura + notas) | Médico puede agregar diagnósticos | ✅ |
| S4.7 | Gráficas de constantes vitales (peso, presión por semana gestacional) | Gráfica con victory-native | ⏳ |
| **EXTRA** | Pantalla subida de documentos (`upload-document.tsx`) | Pacientes y médicos pueden subir archivos | ✅ |
| **EXTRA** | Zustand cache para historial médico (`medicalRecords`) | Cache-first con TTL 5 min para historial propio | ✅ |
| **EXTRA** | Médicos pueden ver/subir su propio historial médico | Acceso unificado para todos los roles | ✅ |

---

## Estructura de Storage

```
medical-files/{patient_uuid}/labs/{file_uuid}.pdf
medical-files/{patient_uuid}/ultrasounds/{file_uuid}.jpg
medical-files/{patient_uuid}/prescriptions/{file_uuid}.pdf
```

**Regla:** Las URLs nunca son públicas. Laravel genera Signed URLs temporales.

---

## RLS del Historial (3 capas)

**Capa 1 — Storage:** bucket privado, políticas por patient_uuid en path  
**Capa 2 — RLS PostgreSQL:**
```sql
-- Paciente ve sus propios registros
CREATE POLICY patient_own ON medical_records FOR SELECT
  USING (auth.uid() = patient_id);

-- Médico ve registros de sus pacientes activos
CREATE POLICY doctor_assigned ON medical_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM doctor_patient_relationships dpr
    WHERE dpr.doctor_id = auth.uid()
    AND dpr.patient_id = medical_records.patient_id
    AND dpr.status = 'active'
  ));
```
**Capa 3 — Signed URLs:** expiración 15 minutos desde Laravel

---

## specialty_data para Ginecobstetricia (vital_signs)

```json
{
  "gestational_week": 28,
  "fetal_heart_rate": 142,
  "fundal_height_cm": 28,
  "fetal_presentation": "cephalic"
}
```

---

## Tipos MIME Permitidos

```php
// MedicalRecordService.php
private const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
private const MAX_SIZE_MB = 10;
```

---

## Entregable Final del Sprint

- [x] Paciente puede subir PDF/imagen y acceder solo con URL temporal
- [x] Médico solo puede ver historial de sus pacientes activos (RLS verificado)
- [x] **`medical-history.tsx`**: listado agrupado por mes, expand/collapse por registro, visor de imágenes inline (base64) con fullscreen, visor de PDFs con signed URL, filtros por categoría/fecha/visibilidad, skeleton loading
- [x] **`upload-document.tsx`**: subida de archivos con selección de categória, feedback inline (sin Alert.alert), navegación auto al completar
- [x] **Médico puede ver historial de paciente** desde `appointments.tsx` → `medical-history.tsx?patient_id=X`
- [x] **Médico puede ver y subir su propio historial médico** (FAB visible para todos los roles en historial propio)
- [x] **Zustand cache** para `medicalRecords`: cache-first solo en historial propio sin filtros activos
- [x] Ningún archivo accesible sin autenticación
- [ ] Gráfica de evolución de peso con semana gestacional en eje X (S4.7 ⏳)
