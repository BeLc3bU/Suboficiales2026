# 🎖️ Suboficiales 2026 - Plataforma de Tests de Inglés (Patronato)

Plataforma web de entrenamiento y preparación de inglés para la oposición a la **Escala de Suboficiales 2026**, adaptada al criterio oficial del Patronato Militar:
- **Exigencia del 70% de aciertos para el APTO**.
- **Sin penalización de respuestas erróneas**.
- **Diseño Mobile-First**: interfaz optimizada para pantallas táctiles y móviles (con cajón deslizable para las preguntas y controles al alcance del pulgar) y ordenadores de sobremesa.
- **Progressive Web App (PWA)**: instalable en la pantalla de inicio del smartphone como una app nativa, funcionando incluso sin cobertura o en modo avión.
- **Guardado Automático en la Nube (100% Invisible)**:
  - Sin registros ni contraseñas.
  - Sin códigos de usuario ni botones manuales de sincronizar.
  - Cada simulacro que finalices, pregunta que falles o marques como favorita se guarda automáticamente en la nube y se refleja al instante en todos tus dispositivos.

---

## 🚀 Despliegue en Vercel (1 Clic)

1. Ve a [Vercel](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** ➔ **"Project"**.
3. Selecciona el repositorio **`BeLc3bU/Suboficiales2026`** y pulsa **"Deploy"**.
4. ¡Listo! En menos de 30 segundos tu app estará publicada en `https://suboficiales2026.vercel.app`.

---

## ☁️ Activar la Base de Datos Automática en Vercel (1 Clic)

Para que tu web en Vercel guarde y comparta automáticamente tu progreso entre el ordenador y el móvil sin pedirte nada:

1. En tu panel del proyecto en **Vercel**, haz clic en la pestaña **Storage** (en el menú superior).
2. Pulsa en **"Create Database"** y elige **"KV"** (base de datos ultra-rápida y gratuita).
3. Selecciona tu proyecto `Suboficiales2026` y pulsa **"Connect"**.
4. ¡Ya está! Vercel conectará automáticamente la base de datos a tu aplicación sin que tengas que copiar ni pegar ninguna clave.
5. A partir de ese momento, verás en la esquina superior de la web el indicador verde `✓ Guardado`. Todo se sincronizará entre tu PC y tu móvil de forma 100% automática e invisible.

*(Alternativa opcional: También es compatible con Supabase configurando `SUPABASE_URL` y `SUPABASE_ANON_KEY` en las variables de entorno de Vercel).*

---

## 📱 Cómo Instalar la App en tu Móvil (PWA)

1. Abre el enlace de Vercel (ej: `https://suboficiales2026.vercel.app`) desde tu smartphone:
   - **En iPhone (Safari):** Pulsa el botón de Compartir (icono cuadrado con flecha hacia arriba) ➔ Selecciona **"Añadir a la pantalla de inicio"**.
   - **En Android (Chrome):** Toca los tres puntos de la esquina superior derecha ➔ Selecciona **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.
2. La app aparecerá en la pantalla de tu móvil con su icono oficial 🎖️ y se abrirá a pantalla completa como una aplicación nativa.

---

## 📚 Añadir Nuevos Temas y Ejercicios

La plataforma cuenta con un extractor automatizado en Python:

1. Añade los nuevos PDFs de ejercicios en la carpeta `PATRONATO`.
2. Haz doble clic en `PATRONATO/test-app/actualizar_ejercicios.bat`.
3. El script extraerá las preguntas, opciones y claves, actualizando `questions-data.js`.
4. Sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Actualizar banco de preguntas"
   git push origin main
   ```
5. Vercel desplegará automáticamente la nueva versión en 5 segundos.
