const fs = require('fs');
const path = require('path');

/**
 * Config dinámica de Expo. Toma todo lo de app.json (recibido como `config`) y
 * añade el `google-services.json` de Android SOLO si el archivo existe.
 *
 * Por qué: las notificaciones push (FCM) requieren `google-services.json`, pero
 * ese archivo no se versiona y puede no estar presente. Referenciarlo en app.json
 * cuando no existe hace que el build de la APK falle. Con esto, la app compila sin
 * Firebase (el push queda inactivo y la app maneja su ausencia con try/catch), y el
 * push se auto-activa apenas se coloque `mobile/google-services.json`.
 */
module.exports = ({ config }) => {
  const googleServices = path.resolve(__dirname, 'google-services.json');

  if (fs.existsSync(googleServices)) {
    config.android = {
      ...config.android,
      googleServicesFile: './google-services.json',
    };
  }

  return config;
};
