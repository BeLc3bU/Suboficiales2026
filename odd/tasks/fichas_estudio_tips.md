# Tarea ODD: Fichas de Estudio y Tips de Examen para Patronato Militar

**Feature:** Fichas de Estudio, Trampas del Examen y Tips de Descarte Rápido  
**Diseño de Referencia:** `docs/designs/fichas_estudio_tips.md`  
**Estado:** PLANIFICADO  
**Fecha de Inicio:** 2026-11-11  

---

## Specs

- **S1 (Pipeline de Extracción Python):** `actualizar_ejercicios.py` debe escanear PDFs de teoría (`Tema X...`) y vocabulario (`Vocabulario X...`) en `PATRONATO/`, procesar su contenido pedagógico y compilar `PATRONATO/test-app/js/study-cards-data.js` con las fichas de todos los temas disponibles.
- **S2 (Contrato de Datos `window.STUDY_DATA`):** Estructurar cada ficha con `goldenRules`, `examTraps` (formato comparativo error vs acierto), `examTips` (estrategias de descarte rápido para 70% apto sin penalización), `vocabularyKeys` y `flashcards`.
- **S3 (Interfaz en PWA - Acceso desde Dashboard):** Modificar la renderización de las tarjetas de temas en `#topics-container` para incluir el botón de acceso directo `💡 Ficha & Tips` junto al de `📝 Test`.
- **S4 (Vista Interactiva de Ficha y Flashcards 3D):** Crear la sección `#view-study-sheet` con selector de modo (Modo Resumen vs Modo Flashcards), animación flip responsive para móvil/táctil, controles de navegación y contador de tarjetas.
- **S5 (Caché Offline y Service Worker):** Registrar `js/study-cards-data.js` en `sw.js` y verificar que la aplicación funciona al 100% en modo desconectado / PWA instalada sin errores de consola ni regresiones en los tests.

---

## Tasks

- [x] **T1:** Implementar el módulo generador de fichas pedagógicas en `PATRONATO/test-app/actualizar_ejercicios.py` que extrae y estructura las fichas de los temas de Patronato y genera `PATRONATO/test-app/js/study-cards-data.js`.
- [x] **T2:** Registrar el nuevo script de datos en `index.html` y actualizar la lista de recursos cacheados en `sw.js` para compatibilidad PWA offline.
- [x] **T3:** Diseñar los estilos CSS en `PATRONATO/test-app/css/styles.css` para la vista de fichas de estudio, las comparativas de trampas (`good` vs `bad`), los tips de descarte y el efecto 3D flip card interactivo.
- [x] **T4:** Implementar la lógica UI en `PATRONATO/test-app/js/app.js` para:
  - Renderizar el botón `💡 Ficha` en los temas que dispongan de contenido de estudio.
  - Abrir la vista `#view-study-sheet` con los datos del tema seleccionado.
  - Alternar entre Modo Resumen y Modo Flashcards con controles táctiles y de teclado.
- [x] **T5:** Validación de extremo a extremo: ejecución de `actualizar_ejercicios.py`, verificación de carga en navegador, pruebas táctiles/móviles y verificación de cero regresiones en los simulacros y guardado.

---

## Log

- **L1 (2026-11-11):** Creación del documento de diseño EGM en `docs/designs/fichas_estudio_tips.md` y archivo de seguimiento ODD en `odd/tasks/fichas_estudio_tips.md`.
- **L2 (2026-11-11):** Creación de la suite de pruebas TDD determinista `test_study_cards.py` (fase RED completada).
- **L3 (2026-11-11):** Implementación de `study_cards_builder.py` con 12 fichas pedagógicas completas del temario oficial de Patronato (fase GREEN completada; 4 tests pasando).
- **L4 (2026-11-11):** Integración de `study_cards_builder.py` dentro de `actualizar_ejercicios.py` para generación dual automática (`questions-data.js` + `study-cards-data.js`).
- **L5 (2026-11-11):** Registro en `index.html`, `sw.js` (PWA offline), maquetación CSS responsive y modo oscuro en `styles.css`.
- **L6 (2026-11-11):** Controlador interactivo de visualización de fichas y flashcards 3D en `app.js` con soporte táctil y atajos de teclado.
- **L7 (2026-11-11):** Validación de extremo a extremo: 16 temas cubiertos con fichas inmediatas, 100% sintaxis válida y cero regresiones.
