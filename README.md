# 🎖️ Suboficiales 2026 - Plataforma de Tests de Inglés (Patronato)

Plataforma web de entrenamiento y preparación de inglés para la oposición a la **Escala de Suboficiales 2026**, adaptada al criterio oficial del Patronato Militar:
- **Exigencia del 70% de aciertos para el APTO**.
- **Sin penalización de respuestas erróneas**.
- **Diseño Mobile-First**: perfectamente adaptado para móviles (iOS / Android) y ordenadores de escritorio.
- **Progressive Web App (PWA)**: instalable en la pantalla de inicio del smartphone como una app nativa, funcionando incluso sin cobertura o en modo avión.
- **Sincronización en la Nube Multidispositivo**: comparte tu progreso (preguntas favoritas, banco de fallos e historial de exámenes) entre tu ordenador y tu móvil.

---

## 🚀 Despliegue en Vercel (1 Clic)

1. Ve a [Vercel](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** ➔ **"Project"**.
3. Selecciona el repositorio **`BeLc3bU/Suboficiales2026`** y pulsa **"Deploy"**.
4. ¡Listo! En menos de 30 segundos tu app estará publicada en `https://suboficiales2026.vercel.app` o tu dominio personalizado de Vercel.

---

## ☁️ Configuración de Sincronización en la Nube (Supabase)

La app incluye dos métodos de persistencia:

### Método A: Transferencia Rápida con Código (Sin registro)
En la app, pulsa el botón **☁️ Sincronizar** ➔ **"Copiar Código de Progreso"**. Pégalo en tu móvil con **"Pegar Código en este Dispositivo"** y tendrás todo tu progreso transferido de inmediato.

### Método B: Sincronización Automática en la Nube con Supabase (Recomendado)
Para que cualquier test que hagas en el móvil o en el PC se sincronice automáticamente en segundo plano:

1. Crea una cuenta gratuita en [Supabase](https://supabase.com/).
2. Crea un nuevo proyecto (tarda ~1 minuto).
3. En el menú lateral izquierdo de Supabase, entra en **SQL Editor** y ejecuta esta consulta para crear la tabla:

```sql
create table if not exists public.user_sync (
  sync_code text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Habilitar permisos públicos para leer y guardar con clave anónima
alter table public.user_sync enable row level security;
create policy "Permitir acceso público a user_sync" on public.user_sync
  for all using (true) with check (true);
```

4. En Supabase ve a **Project Settings** ➔ **API** y copia:
   - **Project URL**
   - **anon / public key**
5. En la aplicación web (en PC o móvil), haz clic en **☁️ Sincronizar**:
   - Introduce tu **Código Personal** (ej: `Pedro2026`).
   - Despliega **Configuración de Supabase** y pega la URL y la Anon Key.
   - Pulsa **"Sincronizar Ahora"**.

A partir de ese instante, cada pregunta que falles, marques como favorita o examen que termines se sincronizará automáticamente entre todos tus dispositivos.

---

## 📚 Añadir Nuevos Temas y Ejercicios

La plataforma cuenta con un extractor automatizado en Python:

1. Añade los nuevos PDFs de ejercicios en la carpeta `PATRONATO`.
2. Haz doble clic en `PATRONATO/test-app/actualizar_ejercicios.bat`.
3. El script extraerá las preguntas, opciones y claves, actualizando `questions-data.js`.
4. Sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Actualizar banco de preguntas con nuevo tema"
   git push origin main
   ```
5. Vercel desplegará automáticamente la nueva versión en segundos.
