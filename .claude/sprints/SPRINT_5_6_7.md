# Sprint 5 — Chat + Experiencias + Referenciados
**Semanas:** 11–12  
**Estado:** ✅ Backend completado — pendiente UI (RN, S5.8–S5.10)

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
| S5.8 | Pantalla Chat con dark mode | UX fluida tema dual | ⏳ |
| S5.9 | Pantalla: Escribir Experiencia post-consulta | Formulario narrativo con tags | ⏳ |
| S5.10 | Visualización de experiencias en perfil del médico | Badges + testimonios renderizados | ⏳ |

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

- [ ] Chat en tiempo real funcionando entre médico y paciente
- [ ] Mensajes ilegibles al consultar DB directamente
- [ ] Paciente sin cita completada NO puede publicar experiencia (403)
- [ ] Perfil del médico muestra experiencias SIN ninguna estrella
- [ ] Sistema de referenciados con badge "Recomendado por [nombre]"

---
---

# Sprint 6 — UX/UI Polish + Dark/Light Mode
**Semanas:** 13–14  
**Estado:** ⏳ PENDIENTE

---

## Objetivo
Llevar la app de "funcional" a "pulida". Implementar el sistema de temas
completo y verificar TODAS las pantallas en ambos modos. Animaciones,
estados vacíos y accesibilidad WCAG AA.

---

## Tareas

| ID | Tarea | Entregable | Estado |
|----|-------|-----------|--------|
| S6.1 | Traducción de mockups Pencil a componentes NativeWind definitivos | Todas las pantallas con diseño final | ⏳ |
| S6.2 | Design tokens semánticos (colors.light.ts / colors.dark.ts) | Sistema de temas completo y centralizado | ⏳ |
| S6.3 | Verificar TODAS las pantallas en dark mode | Capturas dark/light de cada vista | ⏳ |
| S6.4 | Animaciones y transiciones (Reanimated 3) | Transiciones suaves en navegación | ⏳ |
| S6.5 | Estados vacíos, errores y skeletons en ambos temas | UX completa para edge cases | ⏳ |
| S6.6 | Accesibilidad: labels, WCAG AA, áreas táctiles 48dp | Cumplimiento WCAG verificado | ⏳ |
| S6.7 | Panel básico de clínica (web responsive o vista en app) | Admin puede ver médicos y estadísticas | ⏳ |

---

## Checklist de Pantallas Dark Mode

Para cada pantalla verificar:
- [ ] Fondo usa `dark:bg-slate-900` o `dark:bg-slate-800`
- [ ] Texto usa `dark:text-slate-200` o `dark:text-slate-400`
- [ ] Bordes usan `dark:border-slate-700`
- [ ] Cards usan `dark:bg-slate-800`
- [ ] Íconos y SVGs tienen versión dark
- [ ] Mapa usa `darkMapStyle` cuando tema = dark
- [ ] Contraste mínimo 4.5:1 (WCAG AA)

---

## Entregable Final del Sprint

- [ ] Todas las pantallas verificadas en iPhone dark mode y Android dark mode
- [ ] Capturas de pantalla de CADA vista en ambos modos (para el tomo de tesis)
- [ ] Score de accesibilidad > 90 en herramienta de auditoría
- [ ] Transición de tema animada (no parpadeo abrupto)
- [ ] Panel de clínica funcional para admin

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
