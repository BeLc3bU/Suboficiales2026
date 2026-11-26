# 📋 Registro de Decisiones del Proyecto (PROJECT_LOG.md)

## [2026-11-26] - Integración ODD (Gentle Shell v5)
- **Stack**: Genérico / Multi-lenguaje
- **Metodología**: Organic-Driven Development (ODD)

## [2026-11-26] - ADR-001: Migración Frontend a Vite + React 19 + TypeScript + Tailwind CSS v4 + JSON Lazy
- **Contexto:** El frontend Vanilla JS (`PATRONATO/test-app/js/app.js`, 3.203 líneas; `styles.css`, 3.066 líneas) y la carga síncrona de ~1,3 MB de scripts bloqueaban el escalado de UX (Split-Pane, SRS, Analítica).
- **Decisión:** Migrar la capa web principal a **Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + `vite-plugin-pwa`**, manteniendo el pipeline Python (`PATRONATO/test-app/*.py`) que ahora exporta además `public/data/*.json`, y actualizando `vercel.json` y `api/progress.js` (perfiles aislados vía `?profile=`).
- **Nota de entorno:** En local bajo Windows/Google Drive (`G:\`), `scripts/run-tool.mjs` y `vite.config.mjs` usan un caché NTFS local para `node_modules` evitando sincronizar miles de archivos en Drive, mientras que en Vercel/CI se usa `npm ci` estándar.
