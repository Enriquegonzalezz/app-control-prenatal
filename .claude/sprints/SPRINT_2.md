# Sprint 2 — Geospatial Core: PostGIS y Directorio
**Semanas:** 5–6  
**Estado:** ✅ Backend completado + Frontend con paginación e infinite scroll

---

## Objetivo
Implementar el motor de búsqueda geoespacial con PostGIS y construir el
directorio de médicos con vista mapa y lista. Al finalizar, una paciente
debe poder encontrar ginecobstetras cercanas a su ubicación.

---

## Tareas

| ID | Tarea | Entregable Verificable | Estado |
|----|-------|----------------------|--------|
| S2.1 | Columna `location` GEOGRAPHY(POINT) en clinic_branches + índice GIST | Índice GIST creado y verificado | ✅ |
| S2.2 | Función RPC `get_nearby_doctors(lat, lng, radius_m, specialty_id, limit)` | Función retorna doctores con clínica y distancia | ✅ |
| S2.3 | Endpoint `GET /api/v1/doctors/nearby` con specialty_id dinámico | API retorna JSON filtrado por especialidad | ✅ |
| S2.3b | Endpoint `GET /api/v1/doctors` con paginación (sin GPS) | Lista todos los médicos con metadata de paginación | ✅ |
| S2.4 | Sistema de disponibilidad (tabla `schedules` + `slots`) | CRUD de horarios para médicos | ✅ |
| S2.5 | Pantalla RN: Mapa con marcadores + dark map style | Marcadores dinámicos + mapa oscuro en dark mode | ⏳ |
| S2.6 | Pantalla RN: Lista de médicos con filtros + infinite scroll | Filtros sin opción de rating, paginación optimizada | ✅ |
| S2.7 | Pantalla RN: Perfil del médico con info clínica + experiencias + botón agendar | Perfil sin estrellas | ⏳ |

---

## Query PostGIS Principal

```sql
SELECT d.id, u.full_name, s.name AS specialty_name,
  c.name AS clinic_name, c.logo_url,
  ST_Distance(
    cb.location::geography,
    ST_MakePoint($lng, $lat)::geography
  ) AS distance_m,
  d.is_available, d.next_available_slot, d.consultation_fee
FROM doctor_profiles d
JOIN users u ON u.id = d.user_id
JOIN specialties s ON s.id = d.specialty_id
JOIN clinic_doctors cd ON cd.doctor_id = d.id AND cd.is_active = true
JOIN clinics c ON c.id = cd.clinic_id AND c.is_active = true
JOIN clinic_branches cb ON cb.clinic_id = c.id
WHERE d.is_verified = true AND d.is_active = true
  AND s.id = $specialty_id
  AND ST_DWithin(
    cb.location::geography,
    ST_MakePoint($lng, $lat)::geography,
    $radius_m
  )
ORDER BY d.is_available DESC, distance_m ASC
LIMIT 20;
```

---

## Migraciones a Ejecutar

1. `s2_create_schedules` — Horarios de médicos por sede y día
2. `s2_create_slots` — Slots individuales de disponibilidad
3. `s2_rpc_get_nearby_doctors` — Función PostgreSQL para búsqueda geoespacial
4. `s2_gist_index_branches` — Índice GIST en clinic_branches.location

---

## Prioridades de Resultados (UI)

- 🟢 **Verde:** Disponible + próximo slot en < 48h
- 🟡 **Amarillo:** Dentro del radio pero sin slot inmediato
- ⚫ **Gris:** Fuera del radio pero referenciado por confianza

---

## Dark Map Style

```typescript
// src/shared/theme/darkMapStyle.ts
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { featureType: 'road', elementType: 'geometry',
    stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry',
    stylers: [{ color: '#0F172A' }] },
];
```

---

## 🎯 Progreso del Sprint

### ✅ Backend Completado
- [x] S2.1 - Índice GIST en `clinic_branches.location`
- [x] S2.2 - Función RPC `get_nearby_doctors` con PostGIS
- [x] S2.3 - Endpoint `/api/v1/doctors/nearby` (GPS-based)
- [x] S2.3b - Endpoint `/api/v1/doctors` con paginación (sin GPS)
- [x] S2.4 - Sistema de disponibilidad (schedules + slots)
- [x] `DirectoryService::listAllDoctors()` con `simplePaginate`
- [x] `DirectoryController::index()` retorna metadata de paginación

### ✅ Frontend Mobile Completado
- [x] S2.6 - Pantalla `doctors.tsx` con infinite scroll
- [x] Paginación optimizada (carga bajo demanda)
- [x] Filtro default cambiado a "Ver todos" (`showAll = true`)
- [x] Tarjetas de médicos rediseñadas: badge verificado, pill disponibilidad, barra acento
- [x] Enriquecimiento GPS opcional (muestra distancia si disponible)
- [x] Badge "PENDIENTE" para médicos no verificados
- [x] Ordenamiento: disponibles primero, luego por distancia GPS
- [x] Estados de carga y error manejados
- [x] Espaciado header corregido (`gap: 12` en contenedor, no `marginRight` en arrow)

### ✅ Pantalla Horarios Médico (`doctor-schedule.tsx`) — Rediseño completo
- [x] Header con fondo brand color `#E8467C`
- [x] Selector de día con pills scrolleables (PillRow)
- [x] Selector de hora en dos columnas (Inicia verde / Termina rojo)
- [x] Preview en vivo del resumen antes de guardar
- [x] Botón "Guardar Horario" siempre activo con error inline
- [x] Tarjetas de horarios mejoradas con badge de ubicación (clínica / consultorio / domicilio)
- [x] Selector de semanas para generar slots (2/4/6/8 semanas)
- [x] Banner instructivo cuando no hay horarios aún

### ✅ Mejoras UX/UI Recientes (Abril 2026)
- [x] **DirectoryService** - Filtrado estricto de doctores verificados (`dp.is_verified = true`)
  - Solo médicos verificados aparecen en el directorio y búsqueda GPS
  - Protege contra médicos sin verificación OTP completada
- [x] **Layout agendamiento** - Rediseño completo de `book-appointment.tsx`
  - Grid de slots 3 columnas con diseño tipo calendario
  - Header por fecha con contador de horarios disponibles
  - Slots con animación de selección y checkmark visual
  - Separador visual entre hora inicio y fin
  - Sombras y elevación mejoradas para mejor feedback táctil
- [x] **Sticky Bottom Bar** - Accesos rápidos en pantalla home de pacientes
  - Barra fija inferior con botones inline: "Mis Citas" | "Historial"
  - Diseño dual con iconos circulares, títulos y subtítulos
  - Bordes de color según categoría (azul/naranja)
  - Sombras y elevación para jerarquía visual
  - Acceso directo sin scroll a las funciones más usadas
- [x] **Privacidad de citas** - Sistema de relaciones bidireccionales
  - Cada cita solo visible para doctor y paciente asignados
  - Filtrado automático en `AppointmentService::listForUser()`
  - Paciente ve nombre del doctor, doctor ve nombre del paciente
  - No hay cross-visibility entre pacientes diferentes

### ⏳ Pendiente
- [ ] S2.5 - Vista Mapa con marcadores dinámicos
- [ ] S2.7 - Perfil detallado del médico
- [ ] Dark map style para modo oscuro

---

## Entregable Final del Sprint

- [x] Función RPC `get_nearby_doctors` retorna resultados en < 500ms con seed data
- [x] Endpoint `/api/v1/doctors/nearby?lat=X&lng=Y&radius=5000&specialty_id=UUID` funcional
- [x] Endpoint `/api/v1/doctors?page=1&per_page=20` con paginación
- [ ] Vista Mapa con marcadores que cambian color según disponibilidad
- [x] Vista Lista con filtros (distancia, disponibilidad, clínica) + infinite scroll
- [ ] Perfil de médico sin ninguna mención a "estrellas" o "rating"
- [ ] Dark map style aplicado cuando el tema es oscuro
