# Configuración de Supabase Auth

## Información del Proyecto
- **Project ID:** `sdcvmigvumhtorhzobjj`
- **Región:** us-east-1
- **URL:** https://sdcvmigvumhtorhzobjj.supabase.co

---

## Pasos para Configurar Authentication

### 1. Email Authentication (Ya activo por defecto)

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar proyecto: `sdcvmigvumhtorhzobjj`
3. Navegar a: **Authentication** → **Providers**
4. Verificar que **Email** esté habilitado ✅

#### Configuración de Email:
- **Confirm email:** Habilitado (recomendado para producción)
- **Secure email change:** Habilitado
- **Email template:** Personalizar según marca del proyecto

---

### 2. Google OAuth Configuration

1. En Supabase Dashboard: **Authentication** → **Providers** → **Google**
2. Click en **Enable**

#### Obtener Credenciales de Google:

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear nuevo proyecto o seleccionar uno existente
3. Navegar a: **APIs & Services** → **Credentials**
4. Click en **Create Credentials** → **OAuth 2.0 Client ID**
5. Configurar pantalla de consentimiento si es necesario:
   - **Application type:** Internal (desarrollo) o External (producción)
   - **Application name:** Control Prenatal App
   - **User support email:** Tu email
   - **Developer contact email:** Tu email

6. Crear OAuth Client ID:
   - **Application type:** Web application
   - **Name:** Control Prenatal - Supabase Auth
   - **Authorized redirect URIs:**
     ```
     https://sdcvmigvumhtorhzobjj.supabase.co/auth/v1/callback
     ```

7. Copiar **Client ID** y **Client Secret**

#### Configurar en Supabase:

1. Volver a Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Pegar:
   - **Client ID:** (del paso anterior)
   - **Client Secret:** (del paso anterior)
3. **Redirect URL:**
   ```
   https://sdcvmigvumhtorhzobjj.supabase.co/auth/v1/callback
   ```
4. Click en **Save**

---

### 3. Configurar Variables de Entorno

#### Mobile (.env)
```env
EXPO_PUBLIC_SUPABASE_URL=https://sdcvmigvumhtorhzobjj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key_aquí>
```

#### Backend (.env)
```env
SUPABASE_URL=https://sdcvmigvumhtorhzobjj.supabase.co
SUPABASE_KEY=<tu_service_role_key_aquí>
SUPABASE_ANON_KEY=<tu_anon_key_aquí>
```

#### Obtener las Keys:
1. En Supabase Dashboard: **Settings** → **API**
2. Copiar:
   - **Project URL:** `https://sdcvmigvumhtorhzobjj.supabase.co`
   - **anon/public key:** Para frontend (EXPO_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role key:** Solo para backend (⚠️ NUNCA exponer en frontend)

---

### 4. Configurar Database Connection

#### Backend (.env)
```env
DB_CONNECTION=pgsql
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USERNAME=postgres.sdcvmigvumhtorhzobjj
DB_PASSWORD=<tu_database_password_aquí>
```

#### Obtener Database Password:
1. En Supabase Dashboard: **Settings** → **Database**
2. En sección **Connection String** → **URI**
3. Click en **Reset database password** si es necesario
4. Copiar el password generado

---

### 5. Configurar Políticas de Seguridad (RLS)

Una vez creadas las tablas de usuarios en Sprint 1, configurar Row Level Security:

```sql
-- Ejemplo para tabla users (se configurará en Sprint 1)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);
```

---

### 6. Testing

#### Probar Email Auth:
```bash
cd mobile
npm start
# Probar registro con email en la app
```

#### Probar Google OAuth:
1. Iniciar app
2. Click en "Sign in with Google"
3. Completar flujo OAuth
4. Verificar usuario en Supabase Dashboard → **Authentication** → **Users**

---

## Próximos Pasos (Sprint 1)

- [ ] Crear tabla `users` con campos adicionales (clinic_id, role, etc.)
- [ ] Configurar RLS policies
- [ ] Implementar flujo de onboarding diferenciado por rol
- [ ] Configurar email templates personalizados

---

## Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
