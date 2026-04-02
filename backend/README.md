# Backend - Control Prenatal API

API REST para la aplicación de control prenatal. Construida con **Laravel 11** + **Supabase** (PostgreSQL).

## Requisitos

- PHP 8.2+
- Composer
- Conexión a internet (para Supabase)

## Instalación

### 1. Instalar dependencias

```bash
composer install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` y configura **Supabase Session Pooler**:

```

**Nota:** Reemplaza `YOUR_PASSWORD`, `YOUR_SERVICE_ROLE_KEY` y `YOUR_ANON_KEY` con tus credenciales de Supabase.

### 3. Generar APP_KEY

```bash
php artisan key:generate
```

### 4. Verificar conexión a Supabase

```bash
php artisan supabase:test
```

Deberías ver:
```
✅ Connection successful!
✅ Query executed successfully!
```

## Ejecutar el servidor

```bash
php artisan serve
```

El servidor estará disponible en **http://localhost:8000**

## Notas Importantes

- **NO ejecutar `php artisan migrate`**: Las tablas ya existen en Supabase (Sprint 0)
- **Session Pooler**: Usamos Session Pooler en lugar de Direct connection para mejor compatibilidad
- **Cache en base de datos**: `CACHE_STORE=database`
- **Sesiones en archivo**: `SESSION_DRIVER=file` para desarrollo local

## Comandos útiles

```bash
# Limpiar cache
php artisan optimize:clear

# Ver rutas
php artisan route:list

# Ejecutar seeders (si existen)
php artisan db:seed

# Acceder a la consola de Laravel
php artisan tinker
```

## Estructura

```
app/
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   └── Requests/
├── Models/
├── Services/
└── Enums/

routes/
├── api.php
└── web.php

database/
├── migrations/
└── seeders/
```

## Documentación

- [Laravel 11](https://laravel.com/docs/11.x)
- [Supabase](https://supabase.com/docs)
- [Sanctum (Authentication)](https://laravel.com/docs/11.x/sanctum)
