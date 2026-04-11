# Guía para Probar con Backend Local

## 🎯 Propósito
Este documento explica las opciones para probar tu app React Native con el backend Laravel local.

## ⚠️ Problema con Web
Expo SDK 54 con React 19 tiene conflictos con `react-native-web` antiguo (`import.meta` errors). 
**Recomendación: Usar el método de Túnel en su lugar.**

## � MÉTODO RECOMENDADO: Túnel con Dispositivo Real

Esta es la mejor opción para probar con tu backend local sin conflictos:

### 1. Inicia el servidor con túnel
```bash
npx expo start --tunnel
```

### 2. Escanea el QR con Expo Go
- **Android:** Usa la app Expo Go
- **iOS:** Usa la cámara del iPhone

### 3. Configura tu backend para aceptar conexiones externas
En tu Laravel `.env`:
```env
APP_URL=http://backend.test
SANCTUM_STATEFUL_DOMAINS=*
SESSION_DOMAIN=.backend.test
```

### Ventajas:
✅ Sin conflictos de dependencias
✅ Pruebas en dispositivo real (mejor experiencia)
✅ No necesitas instalar/desinstalar nada
✅ Funciona con todas las features nativas

---

## 📦 Método Alternativo: Web (Con Problemas Conocidos)

⚠️ **No recomendado actualmente** debido a conflictos `import.meta` con Expo SDK 54.

### Comandos (si decides intentarlo):

1. **Instalar dependencias web:**
```bash
npm run web:install
```

2. **Ejecutar en web:**
```bash
npm run web:dev
```

3. **Desinstalar (ANTES de compilar APK):**
```bash
npm run web:uninstall
```

## 🚀 Flujo de Trabajo Recomendado

### Opción 1: Túnel (RECOMENDADO)
1. Asegúrate que tu backend Laravel esté corriendo
2. Tu `.env` debe tener la IP de tu máquina o dominio accesible:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.X:8000/api/v1
   # O si usas Herd/Valet:
   EXPO_PUBLIC_API_URL=http://backend.test/api/v1
   ```
3. Ejecuta:
   ```bash
   npx expo start --tunnel
   ```
4. Escanea el QR con tu teléfono
5. Prueba login/registro directamente en el dispositivo

### Opción 2: Emulador Android Local
1. Abre Android Studio y arranca un emulador
2. Tu `.env` debe usar `10.0.2.2` (IP especial del emulador):
   ```
   EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
   ```
3. Ejecuta:
   ```bash
   npm run android
   ```

### Antes de compilar APK para producción:
1. Asegúrate de que NO tengas `react-native-web` ni `react-dom` instalados
2. Ejecuta `npm run web:uninstall` si los instalaste
3. Verifica `package.json`
4. Compila normalmente

## ✅ Verificación

Para verificar que las dependencias web NO están instaladas:
```bash
npm list react-native-web
```
Debería mostrar un error o "not found" si está limpio.

## � Configuración del Backend para Túnel

Si usas **Laravel Herd** o **Valet**, tu backend ya está accesible en la red local.

Si usas **php artisan serve**, necesitas:
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Luego en tu `.env` de mobile usa tu IP local:
```env
# Encuentra tu IP con: ipconfig (Windows) o ifconfig (Mac/Linux)
EXPO_PUBLIC_API_URL=http://192.168.0.X:8000/api/v1
```

## ⚠️ Recordatorio de Seguridad

Todas las librerías en tu proyecto son **gratuitas y open source**. No hay ninguna que cobre al compilar el APK.
