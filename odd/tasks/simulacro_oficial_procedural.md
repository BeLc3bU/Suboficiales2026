# Tarea ODD: Generador Procedural de Simulacro Oficial (60 Preguntas)

**Feature:** Generador Procedural de Simulacro Oficial AGBS / Patronato 2022  
**Diseño de Referencia:** `docs/designs/simulacro_oficial_procedural.md`  
**Estado:** COMPLETADO  
**Fecha de Inicio:** 2026-11-12  
**Fecha de Finalización:** 2026-11-12  

---

## Specs

- **S1 (Banco de Unidades de Examen):** Crear un banco enriquecido de unidades de lectura (*Reading*) y textos con huecos (*Cloze* de 10 preguntas) basado estrictamente en el contenido existente y temario de Patronato, asegurando unidades completas y no fragmentadas.
- **S2 (Motor Procedural de Ensamblado):** Implementar la lógica procedural que ensamble un examen de exactamente 60 preguntas: 30 de Comprensión Escrita (muestreo por bloques de texto sin cortar) + 30 de Gramática y Vocabulario (3 textos Cloze de 10 preguntas cada uno).
- **S3 (Numeración y Metadatos Oficiales):** Reindexar secuencialmente las preguntas de 1 a 60, distinguiendo claramente Parte I (1-30) y Parte II (31-60), con temporizador oficial de 90 minutos y baremo de corte del 70% (42/60) sin penalización.
- **S4 (Interfaz en Dashboard y Vista de Examen):** Incorporar la tarjeta en `#folder-content-especiales`, optimizar la visualización de textos de lectura y cloze en móvil y PC, y mostrar desglose de aciertos por bloque en la pantalla de resultados.
- **S5 (Offline PWA y Suite de Pruebas):** Registrar scripts en `sw.js` y `index.html`, verificar funcionamiento offline y desarrollar tests automatizados deterministas que garanticen la integridad del generador.

---

## Tasks

- [x] **T1:** Crear la suite de pruebas unitarias TDD para el motor de generación procedural (`test_exam_generator.py`), verificando exactamente 60 preguntas, 30 reading + 30 cloze, 3 textos de 10 preguntas en cloze, respuestas válidas y sin preguntas huérfanas.
- [x] **T2:** Construir el banco procedural (`exam-data.js`) y el generador de examen (`exam-generator.js`) con algoritmo de muestreo por bloques y reindexación dinámica de huecos.
- [x] **T3:** Integrar el generador en `app.js` (`startOfficialMockExam()`) con temporizador de 90 min y desglose de resultados por bloque.
- [x] **T4:** Añadir la tarjeta de "Simulacro Oficial Procedural (AGBS)" en `index.html` y los estilos responsive en `styles.css`.
- [x] **T5:** Actualizar `sw.js` con los nuevos recursos para PWA offline, integrar el constructor en `actualizar_ejercicios.py` y validar la suite de pruebas completa.

---

## Log

- **L1 (2026-11-12):** Análisis de requerimientos y confirmación con el usuario: formato examen 2022 (30 reading + 30 cloze 3x10), basado en el contenido existente en la aplicación sin extraer PDFs de TEMARIO. Redacción de especificación técnica de diseño en `docs/designs/simulacro_oficial_procedural.md` y archivo de seguimiento ODD en `odd/tasks/simulacro_oficial_procedural.md`.
- **L2 (2026-11-12):** Implementación de la suite TDD determinista `test_exam_generator.py` (fase RED completada; 4 tests fallando por ausencia de módulos).
- **L3 (2026-11-12):** Creación de `exam_data_builder.py` para compilar unidades de lectura y clozes a `PATRONATO/test-app/js/exam-data.js` (44 bloques de lectura y 9 clozes de 10 preguntas).
- **L4 (2026-11-12):** Creación del motor procedural en `PATRONATO/test-app/js/exam-generator.js` con soporte para muestreo por bloques de lectura y reindexación correlativa de huecos cloze (fase GREEN completada; tests pasando 100%).
- **L5 (2026-11-12):** Ampliación de la suite de pruebas en `test_exam_generator.py` para validar la lógica oficial de evaluación militar (42/60 = 70% APTO, 5 tests pasando).
- **L6 (2026-11-12):** Integración de `startOfficialMockExam()` en `app.js`, temporizador oficial con tope de 90 minutos, rotulación adaptativa del cuadro de texto según la parte (Reading vs Cloze) y desglose de resultados por bloques en `view-results`.
- **L7 (2026-11-12):** Inclusión de la tarjeta destacada en `index.html` (Modos Especiales de Examen), maquetación en `styles.css` y registro offline en `sw.js` (caché v83).
- **L8 (2026-11-12):** Integración en el pipeline principal de `actualizar_ejercicios.py` y verificación final de extremo a extremo sin regresiones en tests de estudio ni sintaxis JS.
