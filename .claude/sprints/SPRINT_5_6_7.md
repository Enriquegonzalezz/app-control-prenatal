# Sprint 5 — Chat + Experiencias + Referenciados
**Semanas:** 11–12  
**Estado:** 🔄 Backend completado — Chat ✅ funcional (cifrado OK), Reagendar ✅, Mensajes tab ✅ con caché, Experiencias pendientes

---

## Objetivo
Implementar la mensajería en tiempo real cifrada, el sistema de experiencias
narrativas (que reemplaza ratings) y el módulo de referenciados entre pacientes.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S5.1 | Tabla `messages` con content_encrypted | Mensajes almacenados cifrados | ✅ |
| S5.2 | Supabase Realtime channel por relationship_uuid | Mensajes en tiempo real bidireccionales | ✅ |
| S5.3 | Cifrado AES-256 de mensajes | Contenido ilegible en DB directa | ✅ |
| S5.4 | Tabla `experiences` (reemplaza `ratings`) | Nunca crear tabla ratings | ✅ |
| S5.5 | Tabla `experience_tags` (catálogo de etiquetas) | Catálogo extensible | ✅ |
| S5.6 | Endpoints CRUD experiencias con validación de elegibilidad | Solo cita completada permite publicar | ✅ |
| S5.7 | Tabla `referrals` + endpoints (trust_score basado en experiencias) | Sistema actualizado sin estrellas | ✅ |
| S5.8 | Pantalla Chat (`/chat/[id]`) con dark mode + burbujas de mensaje | UX fluida tema dual, lectura de mensajes | ✅ |
| S5.8b | Pantalla Mensajes (`/(tabs)/messages`) — lista de conversaciones | Unread count, timestamps relativos | ✅ |
| S5.8b+ | Zustand cache en `messages.tsx` (`conversations`) | Cache-first con TTL 5 min, pull-to-refresh fuerza reload | ✅ |
| S5.8c | Endpoint `GET /chat/with/{user}` — lookup de relación por user_id | Navegación directa al chat desde citas y directorio | ✅ |
| S5.8d | Botón "Hablar con médico/paciente" en pantalla Mis Citas | Acceso al chat desde cualquier cita no cancelada | ✅ |
| S5.8e | Botón "Enviar mensaje" en perfil del médico (DoctorProfileSheet) | Visible para cualquier médico — crea relación al primer click | ✅ |
| S5.8f | Endpoint `POST /chat/with/{user}` — inicia conversación (crea relación si no existe) | Chat desde perfil sin cita previa | ✅ |
| S5.8g | Citas se crean como `confirmed` al reservar (sin paso de confirmación) | Flujo simplificado; médico cancela/reagenda si hay imprevisto | ✅ |
| S5.8h | Endpoint `POST /appointments/{id}/reschedule` — médico reagenda a nuevo slot | Slot anterior liberado, nuevo slot reservado | ✅ |
| S5.8i | Modal "Reagendar" en pantalla Mis Citas (médico) con selector de slots | UX de reagendamiento inline | ✅ |
| S5.9 | Pantalla: Escribir Experiencia post-consulta | Formulario narrativo con tags | ⏳ |
| S5.10 | Visualización de experiencias en perfil del médico | Badges + testimonios renderizados | ⏳ |

### Decisiones de diseño del chat (actualizado)
- El endpoint `POST /chat/with/{user}` crea la `DoctorPatientRelationship` como `active`
  si no existe — permite iniciar conversación desde el perfil del médico **antes de reservar**.
- El botón "Enviar mensaje" en el perfil del médico es visible para **cualquier paciente**;
  ya no requiere relación previa.
- Las citas se crean directamente en estado `confirmed` (sin `pending`). El médico puede
  cancelar o reagendar si ocurre un imprevisto.
- `CHAT_ENCRYPTION_KEY` debe ser exactamente 32 chars en `.env`. Sin esta clave todo el
  módulo de chat falla silenciosamente (500 interno).
- El backend valida en cada request que el usuario autenticado sea participante
  de la relación (`assertParticipant`). Un usuario externo no puede acceder.
- Los mensajes se almacenan cifrados con AES-256-CBC; el contenido no es legible
  directamente en la base de datos.

---

## Modelo de Experiencias [Δ-2]

### Reglas de negocio
- Solo pacientes con `appointments.status = 'completed'` pueden publicar
- Una experiencia por cita (UNIQUE en appointment_id)
- Texto: mínimo 50 chars, máximo 1000 chars
- Opciones de privacidad: nombre real, "Mariana G." (inicial apellido), o anónimo
- Moderación: filtro de palabras ofensivas antes de publicar
- `status` ENUM: pending → published | reported → hidden

### Tags iniciales (seed)
```sql
INSERT INTO experience_tags (name, icon) VALUES
  ('Puntual',                 'clock'),
  ('Explicativo',             'chat-bubble'),
  ('Trato humano',            'heart'),
  ('Instalaciones cómodas',   'building'),
  ('Seguimiento post-consulta','calendar-check');
```

### Visualización en perfil médico
- "X experiencias compartidas" (nunca "X estrellas")
- Badges agrupados: "Trato humano (12)", "Puntual (8)"
- 3 testimonios más recientes como tarjetas expandibles

---

## Canal de Chat

```typescript
// Canal único por relación médico-paciente
const channel = supabase.channel(`chat:${relationshipUuid}`)

// Estructura del mensaje en DB
{
  relationship_id: UUID,
  sender_id: UUID,
  content_encrypted: TEXT,   // AES-256 via Laravel
  type: message_type,        // text | image | file | system
  read_at: TIMESTAMPTZ | null
}
```

---

## Entregable Final del Sprint

- [x] Chat en tiempo real funcionando entre médico y paciente (AES-256 OK)
- [x] Mensajes ilegibles al consultar DB directamente
- [x] Botón "Hablar con médico/paciente" en pantalla Mis Citas (todos los estados menos cancelled)
- [x] Botón "Enviar mensaje" en perfil del médico — visible siempre, crea relación al primer click
- [x] `POST /chat/with/{user}` — inicia conversación sin cita previa
- [x] Citas se confirman automáticamente al reservar (sin estado pending)
- [x] Médico puede reagendar citas desde "Mis Citas" (modal con selector de slots)
- [x] **Zustand cache** en `messages.tsx`: cache-first, pull-to-refresh fuerza reload, sin re-fetch al navegar entre tabs
- [ ] Paciente sin cita completada NO puede publicar experiencia (403)
- [ ] Perfil del médico muestra experiencias SIN ninguna estrella
- [ ] Sistema de referenciados con badge "Recomendado por [nombre]"

---
---

# Sprint 6 — UX/UI Polish + Dark/Light Mode
**Semanas:** 13–14  
**Estado:** 🔄 EN PROGRESO — Dark mode + design tokens + feedback inline completados; mapa y panel clínica pendientes

---

## Objetivo
Llevar la app de "funcional" a "pulida". Implementar el sistema de temas
completo y verificar TODAS las pantallas en ambos modos. Animaciones,
estados vacíos y accesibilidad WCAG AA.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S6.1 | Traducción de mockups Pencil a componentes NativeWind definitivos | Todas las pantallas con diseño final | ✅ |
| S6.2 | Design tokens semánticos (colors.light.ts / colors.dark.ts) | Sistema de temas completo y centralizado | ✅ |
| S6.3 | Verificar TODAS las pantallas en dark mode | Capturas dark/light de cada vista | ✅ |
| S6.4 | Animaciones y transiciones (Reanimated 3) | Transiciones suaves en navegación | ⏳ |
| S6.5 | Estados vacíos, errores y skeletons en ambos temas | UX completa para edge cases | ✅ |
| S6.6 | Accesibilidad: labels, WCAG AA, áreas táctiles 48dp | Cumplimiento WCAG verificado | ⏳ |
| S6.7 | Panel básico de clínica (web responsive o vista en app) | Admin puede ver médicos y estadísticas | ⏳ |

---

## Checklist de Pantallas Dark Mode

Para cada pantalla verificar:
- [x] Fondo usa `#141414` (dark) / `#F5F5F5` (light) — implementado con `useEffectiveTheme`
- [x] Texto usa colores semánticos neutrales (neutral-100 dark / neutral-900 light)
- [x] Cards usan `#1E1E1E` (dark) / `#FFFFFF` (light)
- [x] Acento de marca `#E8467C` consistente en todos los CTAs
- [x] Iconos y SVGs respetan el tema vía color condicional
- [ ] Mapa usa `darkMapStyle` cuando tema = dark (pendiente S2.5)
- [ ] Contraste mínimo 4.5:1 (WCAG AA) — auditado formalmente pendiente

### ✅ Pantallas verificadas en dark + light mode
- `(tabs)/index.tsx` — DoctorDashboard + PatientHome
- `(tabs)/doctors.tsx` — Directorio + DoctorProfileSheet
- `(tabs)/messages.tsx` — Lista de conversaciones
- `(tabs)/profile.tsx` — Perfil con secciones por rol
- `appointments.tsx` — Mis Citas con filtros
- `medical-history.tsx` — Historial con filtros + visor de archivos
- `upload-document.tsx` — Subida de documentos
- `book-appointment.tsx` — Agendar cita con selector de slots
- `doctor-schedule.tsx` — Horarios con selector de ubicación
- `chat/[id].tsx` — Chat en tiempo real
- `(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`

---

## Entregable Final del Sprint

- [x] Todas las pantallas verificadas en dark mode y light mode
- [ ] Capturas de pantalla de CADA vista en ambos modos (para el tomo de tesis)
- [ ] Score de accesibilidad > 90 en herramienta de auditoría
- [ ] Transición de tema animada (no parpadeo abrupto)
- [ ] Panel de clínica funcional para admin

### ✅ Logros adicionales de UX/UI (implementados durante sprints 3–5)
- Eliminar `Alert.alert` de toda la app — feedback 100% inline
- Skeletons animados (`Animated.loop`) en todas las pantallas de lista
- Estados vacíos con ilustración, mensaje contextual y CTA
- Pull-to-refresh en todas las listas con `tintColor: #E8467C`
- **Zustand cache** (`cacheStore.ts`) — caché unificado TTL 5 min para conversations, doctors, appointments, medicalRecords; sin re-fetch al navegar entre tabs

---
---

# Sprint 7 — Pruebas y Validación
**Semanas:** 15–16  
**Estado:** ⏳ PENDIENTE

---

## Objetivo
Validar que todo el sistema funcione correctamente bajo condiciones reales.
Pruebas unitarias, funcionales, de usabilidad y rendimiento. Generar APK
firmado para distribución de pruebas y documentar todo para el tomo de tesis.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S7.1 | Tests unitarios Laravel (PHPUnit) para Services y Controllers | Cobertura mínima 80% en lógica de negocio | ⏳ |
| S7.2 | Verificación de RLS con usuarios de prueba (paciente, médico, clinic_admin) | Todos los accesos no autorizados bloqueados | ⏳ |
| S7.3 | Testing funcional de cada RF (Caja Negra) | Matriz de pruebas completa con resultados | ⏳ |
| S7.4 | Pruebas de usabilidad con 5 gestantes y 2 médicos (incluir dark mode) | Reporte SUS con métricas | ⏳ |
| S7.5 | Pruebas de rendimiento PostGIS con 100+ registros multi-clínica | Respuesta < 500ms | ⏳ |
| S7.6 | Corrección de bugs críticos y regresión | Zero bugs críticos en release candidate | ⏳ |
| S7.7 | Generación de APK firmado para distribución | APK instalable en dispositivos físicos | ⏳ |

---

## Matriz de Pruebas Funcionales (Caja Negra)

Documentar para cada Requisito Funcional:
| RF | Caso de Prueba | Datos de Entrada | Resultado Esperado | Resultado Real | Estado |
|----|---------------|-----------------|-------------------|----------------|--------|
| RF-01 | Registro paciente con datos válidos | nombre, email, password | Usuario creado, token retornado | | |
| RF-02 | Login médico inválido | email incorrecto | 401 Unauthorized | | |
| ... | ... | ... | ... | | |

---

## Tests RLS a Verificar

```sql
-- Como paciente A, intentar ver historial de paciente B → debe fallar
-- Como médico sin relación activa, intentar ver historial → debe fallar  
-- Como clinic_admin de clínica X, intentar editar médico de clínica Y → debe fallar
-- Como usuario anónimo, intentar INSERT en experiences → debe fallar
```

---

## Criterios de Aceptación Finales

- [ ] Cobertura PHPUnit ≥ 80%
- [ ] 0 vulnerabilidades críticas de seguridad
- [ ] Tiempo de respuesta búsqueda geoespacial < 500ms
- [ ] Score SUS (System Usability Scale) ≥ 70
- [ ] APK instalable y firmado
- [ ] ERD v2.0 exportado como imagen para el tomo
- [ ] Capturas light + dark de todas las vistas documentadas
- [ ] Manual de instalación y despliegue completo
