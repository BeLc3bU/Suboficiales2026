# Tarea ODD: Refactorización a Vite + React + TypeScript + Tailwind + Mejoras UI/UX

**Feature:** Migración a Stack Moderno (Opción A) y Suite Completa de Mejoras UI/UX  
**Rama:** `main`  
**Estado:** COMPLETADO  
**Fecha de Inicio:** 2026-11-26  
**Fecha de Finalización:** 2026-11-26  
**Runner:** `npm run lint && npm run build && npm test`

---

## Specs

- **S1 (Stack Moderno Opción A):** Migrar el frontend monolítico de `PATRONATO/test-app/` a una arquitectura modular basada en **Vite 8 + React 19 + TypeScript 7 + Tailwind CSS v4 + `vite-plugin-pwa`** (desplegable en Vercel con `dist/` + `/api/progress`).
- **S2 (Datos JSON Bajo Demanda y Pipeline Python):** Mantener el pipeline de extracción Python (`actualizar_ejercicios.py`, `study_cards_builder.py`, `exam_data_builder.py`, `explanation_enricher.py`) exportando JSON estáticos optimizados (`public/data/questions.json`, `public/data/study-cards.json`, `public/data/exam-data.json`) vía `export_json_data.py`.
- **S3 (Split-Pane Reading & Cloze):** Implementar vista dividida fija (*sticky*) en escritorio y panel plegable/fijable con resaltado del hueco activo en móvil para textos de lectura (*Reading*) y *Cloze* de 10 huecos.
- **S4 (Dashboard Orientado a la Acción y Bottom Bar Móvil):** Incorporar sección "Tu sesión de hoy" (Reanudar / Simulacro Oficial / Repaso Inteligente), barra de navegación inferior fija en móvil (`Inicio`, `Temario`, `Repaso IA`, `Histórico`, `70% APTO`) y tarjetas de tema simplificadas con barra de dominio.
- **S5 (Estudio SRS + Web Speech Audio + Analítica APTO 70%):** Añadir repetición espaciada en Flashcards (`Repetir`, `Dudosa`, `Dominada`), pronunciación en inglés con `Web Speech API`, y panel analítico de evolución hacia el objetivo del 70% APTO y desglose por bloque/tema.
- **S6 (Atajos de Teclado, Perfiles en Nube y TEMARIO):** Añadir atajos de teclado en tests (`1-4`/`A-D`, `←`/`→`, `F`), soporte de código de perfil opcional en `api/progress.js` (`?profile=<id>`) y `servidor.py`, y auditoría de `TEMARIO/`.

---

## Tasks

- [x] **T1 (S1):** Configurar Vite, React, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react` y `vite-plugin-pwa` con tipado estricto y `vite.config.mjs`.
- [x] **T2 (S2):** Adaptar pipeline Python (`export_json_data.py` + `actualizar_ejercicios.py`) para exportar datasets JSON optimizados en `public/data/`, manteniendo contratos y tests Python verdes.
- [x] **T3 (S1, S3):** Implementar capa de estado/sincronización (`useAppState` + `syncService`), vista de Test (`QuizView`) con **Split-Pane Reading/Cloze**, resaltado de hueco activo y drawer/navegador de preguntas.
- [x] **T4 (S4):** Implementar **Dashboard "Tu sesión de hoy"**, tarjetas de tema (`TopicsView`) con barra de dominio, filtros por bloque y **Bottom Tab Bar** móvil (`BottomNav`).
- [x] **T5 (S5):** Implementar vista de **Fichas de Estudio**, **Flashcards 3D con SRS y audio (`speechSynthesis`)**, y **Histórico + Analítica APTO 70%** (gráfica SVG de evolución y temas débiles).
- [x] **T6 (S6):** Implementar **atajos de teclado**, soporte de **perfiles aislados en `api/progress.js` / `servidor.py`**, y auditoría de PDFs en `TEMARIO/` (confirmado que solo `exámenes UNIT 1.pdf` contiene clave de respuestas verificable; `UNIT 2..9`, `2011`, `2019` y `2022` carecen de solucionario embebido).
- [x] **T7 (S1..S6):** Actualizar `vercel.json`, `package.json`, `.github/workflows/ci.yml` y ejecutar verificación completa (`npm run lint`, `npm run build`, `npm test`, `npm run verify`).

---

## Log

- **L1 (2026-11-26):** Petición literal del usuario: *"la opcion a e implementa todos los bloques de mejora que me has propuesto por el orden que me has dicho"*. Se inicia tarea ODD grande tras actualización base previa.
- **L2 (2026-11-26):** Migración completada a Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + `vite-plugin-pwa`. Debido a que el workspace reside en Google Drive (`G:\`), las dependencias npm locales se alojan en caché NTFS externa (`%USERPROFILE%\.local-nm\suboficiales-2026\node_modules`) resuelta automáticamente por `scripts/run-tool.mjs` y `vite.config.mjs` (en Vercel/CI se usa `./node_modules` estándar). Auditados los PDFs de `TEMARIO/` con `pypdf` y `pymupdf`: únicamente `exámenes UNIT 1.pdf` incluye soluciones verificables en negrita; los demás exámenes carecen de clave, por lo que no se generan respuestas no verificadas. Suite completa verificada: `ruff`, `node --check`, `tsc --noEmit`, `vite build`, 8 tests Vitest, 13 tests Python `unittest`, `agent verify` y `agent guard`.
