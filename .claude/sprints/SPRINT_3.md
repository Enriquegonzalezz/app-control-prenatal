# Sprint 3 — Agendamiento y Relación Médico-Paciente
**Semanas:** 7–8  
**Estado:** En progreso - UI mejorada con feedback profesional y diseño premium (S3.7-S3.8 completados)

---

## Objetivo
Implementar el sistema de citas completo: reserva, confirmación, cancelación
y la relación médico-paciente que habilita acceso al historial y chat.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S3.1 | Tabla `appointments` (patient_id, doctor_id, clinic_id, slot_id, status, notes) | CRUD completo con clinic_id | ✅ |
| S3.2 | Tabla `doctor_patient_relationships` con estados | Relación activa al confirmar primera cita | ✅ |
| S3.3 | Endpoint agendamiento con validación de conflictos de horario | Imposible agendar slots ocupados | ✅ |
| S3.4 | Notificaciones push FCM para confirmación/cancelación | Notificación en dispositivo físico | ✅ |
| S3.5 | Pantalla Paciente: Mis Citas (próximas + historial) | Lista con estados visuales | |
| S3.6 | Pantalla Médico: Agenda del día + gestión de slots | Calendario interactivo | |
| S3.7 | UI Feedback profesional: eliminar Alerts, mensajes inline | Confirmaciones inline sin modales | |
| S3.8 | Diseño premium de botones y cards | Botones con iconos, sombras, gradientes | |

---

## Migraciones a Ejecutar

1. `s3_create_appointments`
2. `s3_create_doctor_patient_relationships`
3. `s3_rls_appointments` — RLS: paciente ve sus citas, médico ve las suyas
4. `s3_trigger_activate_relationship` — Trigger: activar relación al confirmar cita

---

## Estados de Cita (ENUM ya creado)

```
pending → confirmed → in_progress → completed
                   ↘ cancelled
                   ↘ no_show
```

---

## Lógica de Negocio Clave

- Una cita `completed` es requisito para publicar una experiencia [Δ-2]
- Al confirmarse la primera cita, se activa `doctor_patient_relationships` → habilita chat e historial
- `branch_id` **opcional** en citas (médico puede atender en consultorio propio o domicilio)
- Validar conflicto: no puede existir otra cita en el mismo `slot_id` con status != 'cancelled'

---

## ✅ Extensión: Ubicaciones de Atención del Médico (implementado)

### Problema resuelto
El botón "Guardar Horario" fallaba porque `branch_id` era `required` y el médico
no estaba asociado a ninguna clínica (tabla `clinic_doctors` vacía). Solución:
asociación de clínica ahora es **opcional**; el médico puede usar su propio consultorio.

### Nueva tabla `doctor_offices`
```sql
CREATE TABLE doctor_offices (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID         NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    type        VARCHAR(20)  NOT NULL DEFAULT 'office' CHECK (type IN ('office','home')),
    address     TEXT,
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100) DEFAULT 'Venezuela',
    phone       VARCHAR(30),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);
```

### Cambios en tablas existentes
```sql
-- schedules: branch_id ahora nullable + nuevo office_id
ALTER TABLE schedules ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE schedules ADD COLUMN office_id UUID REFERENCES doctor_offices(id) ON DELETE SET NULL;

-- slots: idem
ALTER TABLE slots ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE slots ADD COLUMN office_id UUID REFERENCES doctor_offices(id) ON DELETE SET NULL;
```

### Archivos backend modificados/creados
| Archivo | Cambio |
|---|---|
| `app/Models/DoctorOffice.php` | **Nuevo** modelo con relaciones `doctor()`, `schedules()`, `slots()` |
| `app/Http/Controllers/Doctor/DoctorOfficeController.php` | **Nuevo** CRUD: `index`, `store`, `destroy` |
| `app/Models/DoctorProfile.php` | Relación `offices(): HasMany` |
| `app/Models/Schedule.php` | `office_id` fillable + relación `office(): BelongsTo` |
| `app/Models/Slot.php` | `office_id` fillable + relación `office(): BelongsTo` |
| `app/Services/ScheduleService.php` | `branch_id`/`office_id` opcionales; propaga `office_id` en slots |
| `app/Http/Requests/Doctor/StoreScheduleRequest.php` | `branch_id` → nullable; `office_id` → nullable |
| `routes/api.php` | `GET/POST/DELETE /doctor/offices` bajo middleware `doctor_verified` |

### Archivos frontend modificados
| Archivo | Cambio |
|---|---|
| `src/lib/api.ts` | Nueva interfaz `DoctorOffice`; nuevo `officeApi` (list/create/remove); `Schedule` actualizado con `office_id`/`office` |
| `app/doctor-schedule.tsx` | Selector de ubicación unificado (clínicas + consultorios + domicilio); sub-form inline para crear nueva ubicación; `load()` aísla `officeApi.list` para no bloquear el resto; **Alert eliminados**, feedback inline profesional |
| `app/appointments.tsx` | **Bidireccional**: paciente ve su médico, doctor ve nombre del paciente; **Alert eliminados**, confirmación inline con botones No/Sí; mensajes de error inline |
| `app/(tabs)/doctors.tsx` | **Botones premium** "Mis Citas" y "Historial": diseño vertical con iconos circulares, colores distintivos, subtítulos descriptivos |
| `app/book-appointment.tsx` | **Footer card premium**: visualización mejorada de slot seleccionado, botón "Confirmar Cita" con iconos y gradientes; **Alert eliminados**, mensajes inline de éxito/error |

### Datos de referencia
- **12 clínicas venezolanas** insertadas (Clínica El Ávila, Centro Médico de Caracas, etc.)
- Cada clínica tiene su "Sede Principal" en `clinic_branches`
- Tipos de ubicación: `branch` (clínica externa) · `office` (consultorio propio) · `home` (domicilio)

---

## Entregable Final del Sprint

- [x] Médico puede crear horario sin estar asociado a ninguna clínica
- [x] Médico puede agregar consultorio propio o domicilio desde la app
- [x] Clínicas venezolanas disponibles para asociación por el administrador
- [x] **UI profesional sin Alerts**: confirmaciones inline, mensajes de error/éxito integrados
- [x] **Botones premium**: diseño con iconos, sombras, gradientes y estados visuales claros
- [x] **Citas bidireccionales**: paciente ve su médico, doctor ve nombre del paciente
- [x] **Footer card mejorado** en agendar cita con visualización premium del slot seleccionado
- [ ] Paciente puede agendar cita con médico disponible
- [ ] Médico recibe notificación push al confirmarse una cita
- [ ] No se pueden duplicar citas en el mismo slot
- [ ] Al completar cita se activa la relación médico-paciente
- [ ] Pantallas de agenda funcionales en dark y light mode
