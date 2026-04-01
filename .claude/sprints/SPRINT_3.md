# Sprint 3 — Agendamiento y Relación Médico-Paciente
**Semanas:** 7–8  
**Estado:** ⏳ PENDIENTE

---

## Objetivo
Implementar el sistema de citas completo: reserva, confirmación, cancelación
y la relación médico-paciente que habilita acceso al historial y chat.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S3.1 | Tabla `appointments` (patient_id, doctor_id, clinic_id, slot_id, status, notes) | CRUD completo con clinic_id | ⏳ |
| S3.2 | Tabla `doctor_patient_relationships` con estados | Relación activa al confirmar primera cita | ⏳ |
| S3.3 | Endpoint agendamiento con validación de conflictos de horario | Imposible agendar slots ocupados | ⏳ |
| S3.4 | Notificaciones push FCM para confirmación/cancelación | Notificación en dispositivo físico | ⏳ |
| S3.5 | Pantalla Paciente: Mis Citas (próximas + historial) | Lista con estados visuales | ⏳ |
| S3.6 | Pantalla Médico: Agenda del día + gestión de slots | Calendario interactivo | ⏳ |

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
- `clinic_id` y `branch_id` son obligatorios en cada cita
- Validar conflicto: no puede existir otra cita en el mismo `slot_id` con status != 'cancelled'

---

## Entregable Final del Sprint

- [ ] Paciente puede agendar cita con médico disponible
- [ ] Médico recibe notificación push al confirmarse una cita
- [ ] No se pueden duplicar citas en el mismo slot
- [ ] Al completar cita se activa la relación médico-paciente
- [ ] Pantallas de agenda funcionales en dark y light mode
