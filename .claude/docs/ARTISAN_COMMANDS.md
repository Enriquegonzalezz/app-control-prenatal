# Comandos Artisan - Control Prenatal

Comandos personalizados para debugging, administración y reportes del sistema.

---

## 📋 Comandos Disponibles

### 1. `doctor:find` - Buscar Doctor por Cédula

Busca un doctor por su cédula y muestra toda su información (verified_doctors, usuario, perfil, clínicas).

```bash
php artisan doctor:find {cedula}
```

**Ejemplo:**
```bash
php artisan doctor:find V12345678
```

**Salida:**
- ✅ Estado en tabla maestra (verified_doctors)
- 👤 Usuario registrado
- 🩺 Perfil de doctor
- 🏥 Clínicas vinculadas

**Uso:**
- Debugging de problemas de registro
- Verificar estado de verificación de un doctor
- Revisar información completa de un doctor en producción

---

### 2. `app:stats` - Estadísticas del Sistema

Muestra estadísticas generales del sistema (usuarios, doctores, pacientes, clínicas).

```bash
php artisan app:stats [--detailed]
```

**Opciones:**
- `--detailed` - Muestra estadísticas detalladas por especialidad

**Ejemplo:**
```bash
php artisan app:stats --detailed
```

**Salida:**
- 👥 Total usuarios (activos, inactivos, verificados)
- 🎭 Distribución por rol (pacientes, doctores, admins)
- 🩺 Doctores (verificados, disponibles, en tabla maestra)
- 🏥 Especialidades activas
- 🏥 Clínicas activas
- 🤰 Pacientes registrados
- 🔑 Tokens activos
- 📈 Doctores por especialidad (con --detailed)

**Uso:**
- Reportes diarios/semanales
- Monitoreo del crecimiento de la plataforma
- Detectar anomalías en los registros

---

### 3. `user:info` - Información de Usuario

Muestra información completa de un usuario por su email.

```bash
php artisan user:info {email}
```

**Ejemplo:**
```bash
php artisan user:info doctor@example.com
```

**Salida:**
- 👤 Información básica del usuario
- 🩺 Perfil de doctor (si aplica)
- 🤰 Perfil de paciente (si aplica)
- 🔑 Tokens activos de ese usuario

**Uso:**
- Debugging de problemas de login
- Verificar estado de cuenta de un usuario
- Revisar tokens activos de un usuario

---

### 4. `doctor:verify` - Agregar Doctor Verificado

Agrega un doctor a la tabla maestra `verified_doctors` (solo super-admin).

```bash
php artisan doctor:verify {cedula} {first_name} {last_name}
    [--license=]
    [--email=]
    [--phone=]
    [--university=]
    [--specialty=]
```

**Ejemplo:**
```bash
php artisan doctor:verify V12345678 "Juan" "Pérez" \
    --license=MPPS123456 \
    --email=juan.perez@hospital.com \
    --phone=+584121234567 \
    --university="UCV" \
    --specialty=a9c4e8d7-1234-5678-90ab-cdef12345678
```

**Opciones:**
- `--license` - Número de licencia médica
- `--email` - Email del doctor
- `--phone` - Teléfono del doctor
- `--university` - Universidad de graduación
- `--specialty` - UUID de la especialidad (ver con `app:stats --detailed`)

**Salida:**
- Lista de especialidades disponibles (si no se proporciona --specialty)
- Confirmación de los datos a registrar
- Confirmación de éxito

**Uso:**
- Agregar doctores verificados manualmente
- Importar doctores desde listas externas
- Actualizar información de doctores existentes

---

### 5. `tokens:cleanup` - Limpiar Tokens Expirados

Elimina tokens de acceso sin uso por X días.

```bash
php artisan tokens:cleanup [--days=30] [--force]
```

**Opciones:**
- `--days=X` - Días de inactividad (default: 30)
- `--force` - No pedir confirmación

**Ejemplo:**
```bash
# Eliminar tokens sin uso por 60 días
php artisan tokens:cleanup --days=60

# Eliminar sin confirmación
php artisan tokens:cleanup --days=90 --force
```

**Salida:**
- Cantidad de tokens a eliminar
- Confirmación antes de eliminar
- Resultado de la eliminación

**Uso:**
- Limpieza periódica de tokens (cronjob mensual)
- Liberar espacio en base de datos
- Mejorar performance de queries de tokens

---

### 6. `users:recent` - Listar Usuarios Recientes

Lista los usuarios más recientemente registrados.

```bash
php artisan users:recent [--limit=10] [--role=]
```

**Opciones:**
- `--limit=X` - Cantidad de usuarios a mostrar (default: 10)
- `--role=` - Filtrar por rol (patient, doctor, clinic_admin)

**Ejemplo:**
```bash
# Últimos 20 usuarios
php artisan users:recent --limit=20

# Últimos 10 doctores
php artisan users:recent --limit=10 --role=doctor
```

**Salida:**
- Tabla con ID, nombre, email, rol, estado activo, fecha de registro

**Uso:**
- Monitorear nuevos registros
- Verificar patrones de registro
- Detectar registros sospechosos

---

### 7. `db:health` - Verificar Salud de la Base de Datos

Detecta inconsistencias y problemas en la base de datos.

```bash
php artisan db:health
```

**Verificaciones:**
1. ❌ Doctores sin perfil de doctor
2. ❌ Pacientes sin perfil de paciente
3. ⚠️ Doctores registrados pero no verificados
4. ℹ️ Doctores verificados aún no registrados
5. ❌ Tokens huérfanos (usuario eliminado)
6. ⚠️ Tokens de usuarios inactivos

**Salida:**
- Lista de problemas encontrados
- Sugerencias de comandos para resolverlos
- Exit code: 0 (OK) o 1 (problemas detectados)

**Uso:**
- Verificación diaria de integridad (cronjob)
- Debugging de problemas en producción
- Pre-deployment checks

---

## 🔄 Comandos Recomendados para Cronjobs

### Diario
```bash
# Verificar salud de la DB
0 2 * * * cd /ruta/proyecto && php artisan db:health >> /var/log/db-health.log 2>&1
```

### Semanal
```bash
# Estadísticas semanales
0 9 * * 1 cd /ruta/proyecto && php artisan app:stats --detailed >> /var/log/weekly-stats.log 2>&1
```

### Mensual
```bash
# Limpiar tokens viejos
0 3 1 * * cd /ruta/proyecto && php artisan tokens:cleanup --days=60 --force
```

---

## 📊 Ejemplos de Uso en Producción

### Caso 1: Usuario reporta que no puede iniciar sesión
```bash
# 1. Buscar info del usuario
php artisan user:info usuario@example.com

# 2. Verificar tokens activos
# (se muestra en el output de user:info)

# 3. Si es doctor, verificar cédula
php artisan doctor:find V12345678
```

### Caso 2: Agregar doctores en batch
```bash
# Crear script bash para importar desde CSV
while IFS=',' read -r cedula nombre apellido license email; do
    php artisan doctor:verify "$cedula" "$nombre" "$apellido" \
        --license="$license" \
        --email="$email" \
        --specialty=UUID_ESPECIALIDAD
done < doctores.csv
```

### Caso 3: Monitoreo diario
```bash
#!/bin/bash
echo "=== Reporte Diario ===" >> daily-report.log
date >> daily-report.log

php artisan app:stats >> daily-report.log
php artisan db:health >> daily-report.log
php artisan users:recent --limit=10 >> daily-report.log

echo "======================" >> daily-report.log
```

---

## 🛠️ Tips de Debugging

### Ver todos los comandos disponibles:
```bash
php artisan list
```

### Ver ayuda de un comando:
```bash
php artisan help doctor:find
```

### Ejecutar en modo verboso:
```bash
php artisan doctor:find V12345678 -v
```

### Ejecutar en modo silencioso:
```bash
php artisan tokens:cleanup --force --quiet
```

---

## 🔐 Seguridad

**IMPORTANTE:**
- Los comandos `doctor:verify` y `tokens:cleanup --force` deben ser ejecutados solo por super-admins
- Nunca exponer estos comandos vía API
- Usar solo desde SSH/CLI en servidores de producción
- Implementar logs de auditoría para comandos sensibles

---

## 📝 Notas

- Todos los comandos usan `declare(strict_types=1)` y `final class`
- Los comandos siguen las convenciones de Laravel
- Output coloreado para mejor legibilidad
- Exit codes apropiados para scripts de automatización
- Confirmaciones antes de operaciones destructivas (excepto con --force)
