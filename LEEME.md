# Rincón de lectura 📚

Un lector de libros instalable (PWA) pensado como un espacio tranquilo para leer.

- **Biblioteca en una sala isométrica**: cada libro aparece en su estantería. Toca una estantería para abrirla, ponle nombre y decora la sala (sillones, plantas, gato, chimenea, alfombras, ventana, cuadros, reloj, luces…).
- **Lector EPUB personalizable**: temas (papel, sepia, salvia, noche, negro…), tipo y tamaño de letra, interlineado, espacio entre párrafos, márgenes, justificado, brillo, luz cálida, reloj, batería, progreso, tiempo restante y pantalla siempre encendida.
- **PDF → EPUB**: los PDF de texto se convierten automáticamente para que se adapten a la pantalla.
- **Compartir desde Telegram** (y cualquier app de Android).
- **Géneros** (los eliges tú), **sagas** con número de tomo, **valoración**, **estado**, **notas** y **sinopsis** (del propio libro o buscada en internet).
- **Buscador** por título, autor, saga, género, sinopsis o notas.
- **Estadísticas**: tiempo leído, racha, reto anual, páginas, géneros y autores.
- **Copia en Google Drive** automática y restauración en un móvil nuevo. También copia en archivo `.zip`.
- **Se actualiza sola**: cuando publicas una versión nueva, la app la aplica al volver a la biblioteca.

---

## Probarla en el ordenador

```bash
npm install
npm run dev
```

Abre la dirección que aparece (por ejemplo `http://localhost:5173`).

## Publicarla (para instalarla en el móvil)

Para instalarla en el móvil tiene que estar en una web con `https`. La forma gratuita más sencilla es GitHub Pages (ya viene configurado en `.github/workflows/deploy.yml`):

1. Crea un repositorio en GitHub y sube este proyecto a la rama `main`.
2. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
3. Cada vez que subas cambios se publica sola en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Después, en el móvil (Chrome en Android): abre esa dirección → menú ⋮ → **Instalar aplicación**.

### Como APK (carpeta `android/`)
El APK es una «Trusted Web Activity»: abre la web publicada a pantalla completa, sin barra de navegador. Por eso **se actualiza sola**: lo que se publica en la web le llega al APK sin reinstalar nada.

Para generarlo de nuevo (solo si cambia el icono, el nombre o la dirección):
1. En `android/gradle.properties` pon la dirección en `twaHost` y sube `apkVersionCode`.
2. En `android/` ejecuta `gradlew assembleRelease` (con `JAVA_HOME` apuntando al `jbr` de Android Studio).
3. El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

⚠️ **Guarda a buen recaudo `android/rincon.keystore` y `android/keystore.properties`.** Son la firma del APK: sin ellos no se puede instalar una versión nueva encima de la anterior. No se suben a GitHub.
El archivo `public/.well-known/assetlinks.json` contiene la huella de esa firma. Tiene que estar en la raíz del dominio, por eso el repositorio debe llamarse `TU-USUARIO.github.io`.

### Actualizaciones
No hace falta reinstalar nada. Cuando subas una versión nueva, la app la descarga en segundo plano y se recarga sola la próxima vez que vuelvas a la biblioteca (nunca en mitad de una lectura). Recuerda subir el número de `version` en `package.json` para verlo en Ajustes.

## Añadir libros desde Telegram
Con la app instalada en Android: en el chat, abre el menú del archivo `.epub` o `.pdf` → **Compartir** → **Rincón**. El libro aparece en tu biblioteca.
(Si Telegram no muestra la opción, primero descarga el archivo, luego ⋮ → Compartir.)

## Copia automática en Google Drive (una sola vez)

Google exige que cada app tenga su propio «ID de cliente». Es gratis:

1. Entra en <https://console.cloud.google.com/> y crea un proyecto (p. ej. «Rincón de lectura»).
2. **APIs y servicios → Biblioteca** → busca **Google Drive API** → **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo **Externo**, pon un nombre y tu correo. En **Usuarios de prueba** añade tu cuenta de Google. (No hace falta publicarla.)
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - **Orígenes de JavaScript autorizados**: la dirección donde publicaste la app, solo el dominio, por ejemplo `https://tu-usuario.github.io` (y `http://localhost:5173` si quieres probar en el ordenador).
5. Copia el ID (termina en `.apps.googleusercontent.com`) y pégalo en la app: **Ajustes → Copia en Google Drive → ID de cliente de Google**.
6. Pulsa **Hacer copia ahora** y acepta los permisos.

La app solo puede ver los archivos que ella misma crea (permiso `drive.file`), en la carpeta «Rincón de lectura (copia de seguridad)».

**Si se rompe el móvil**: instala la app en el nuevo, pega el mismo ID de cliente en Ajustes y pulsa **Restaurar desde Drive**.

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/main.js` | Arranque, navegación, actualizaciones y copia automática |
| `src/iso/room.js` | Dibujo de la sala isométrica y catálogo de decoración |
| `src/views/library.js` | Sala, modo decorar y vista de lista |
| `src/views/reader.js` | Lector y ajustes de lectura |
| `src/views/book.js` | Ficha del libro |
| `src/views/shelf.js` | Estantería abierta |
| `src/views/stats.js` | Estadísticas |
| `src/importer.js`, `src/epubmeta.js`, `src/pdf2epub.js` | Añadir libros y convertir PDF |
| `src/backup.js` | Copias en Drive y en archivo |
| `src/sw.js` | Funcionamiento sin conexión y recepción de archivos compartidos |
| `scripts/setup-assets.mjs` | Regenera fuentes e iconos (`npm run assets`) |
