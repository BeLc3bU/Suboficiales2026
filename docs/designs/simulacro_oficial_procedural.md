# Especificación Técnica de Diseño (EGM): Simulacro de Examen Oficial Procedural

**Estado:** Aprobado / En Implementación  
**Fecha:** 2026-11-12  
**Autor:** Antigravity (Elephant)  
**Referencia:** Examen Oficial Completo 2022 (AGBS / Patronato Militar)  
**Alcance:** Patronato Militar - Suboficiales 2026 (`PATRONATO/test-app/`)  

---

## 1. Contexto y Objetivos

### 1.1. Contexto Operativo
La preparación para la oposición a la Escala de Suboficiales de las Fuerzas Armadas (AGBS / Patronato Militar) exige superar una prueba de lengua inglesa con unos estándares muy específicos:
- **Estructura fija de 60 preguntas**:
  - **Parte I (Preguntas 1 a 30):** Comprensión Escrita (*Reading Comprehension*).
  - **Parte II (Preguntas 31 a 60):** Gramática y Vocabulario (*Use of English*), estructurada como **3 textos temáticos con 10 huecos cada uno (*Cloze test*)** (Q31-Q40, Q41-Q50, Q51-Q60).
- **Criterio Oficial Militar**:
  - Exigencia de un **70% de aciertos para el APTO** (mínimo 42 aciertos de 60).
  - **Sin penalización de errores** (las respuestas falladas no descuentan puntos).
  - Tiempo oficial de realización de **90 minutos**.
  
Hasta la fecha, la aplicación web sólo ofrecía simulacros generales mezclando preguntas sueltas al azar (`startGlobalExam`), lo cual rompía la coherencia de los textos de lectura, dejaba preguntas huérfanas sin contexto y no reproducía el formato real del examen de la oposición.

### 1.2. Objetivos (Goals)
1. **Generador Procedural por Bloques (*Block-Sampling Generator*):**
   - Implementar un motor procedural capaz de generar un examen nuevo, diferente y coherente en cada ejecución.
   - **Parte I (Reading):** Selección aleatoria de unidades de texto íntegras (sin dividir preguntas del mismo texto) hasta sumar exactamente 30 preguntas (1 a 30).
   - **Parte II (Gramática / Cloze):** Selección aleatoria de 3 textos con huecos (*Cloze*) de 10 preguntas cada uno (sumando exactamente 30 preguntas, 31 a 60), cubriendo patrones gramaticales del temario oficial (tiempos verbales, estativos, preposiciones, pronombres, comparativos, conectores).
2. **Ampliación del Banco Procedural sin Dependencias Externas:**
   - Aprovechar el contenido existente en la aplicación y expandirlo con un generador/dataset estructurado de textos y clozes enriquecidos que se ciñan estrictamente a los temas 1 al 13 de `PATRONATO/`, asegurando una rotación amplia y variada de simulacros.
3. **Experiencia de Usuario Fiel al Examen Oficial (UI / UX):**
   - Tarjeta dedicada en "Modos Especiales de Examen" en `index.html`.
   - Soporte visual optimizado para textos de lectura largos y textos con huecos en móvil y escritorio.
   - Separador visual y metadatos de las dos partes del examen (*Parte I: Comprensión Escrita* y *Parte II: Gramática y Vocabulario*).
   - Temporizador de 90 minutos con aviso de tiempo y cálculo automático de Apto / No Apto según el baremo del 70%.
   - Compatibilidad total PWA 100% offline y sincronización en la nube (Vercel KV / Supabase).

### 1.3. No-Objetivos (Non-Goals)
- No extraer ni procesar PDFs de la carpeta `TEMARIO/` (por instrucción expresa del usuario).
- No alterar las rutas ni la lógica de los tests individuales por tema existentes.
- No depender de llamadas de red ni APIs externas para la generación procedural.

---

## 2. Arquitectura de Datos y Motor Procedural

### 2.1. Estructura del Banco de Examen Procedural (`exam-generator.js` / `window.EXAM_DATA`)
Para garantizar una generación procedural rica y robusta, se define un catálogo interno de:
1. `readingUnits`: Array de bloques de lectura `{ id, text, questions: [ { question, options, answer, explanation } ] }`.
2. `clozeUnits`: Array de textos con huecos de 10 preguntas `{ id, title, text, questions: [ 10 preguntas con { question, options, answer, explanation } ] }`.

El motor procedural extraerá las unidades existentes en `questions-data.js` y las combinará con un conjunto curado de unidades adicionales basadas en el temario de Patronato.

### 2.2. Algoritmo de Generación Procedural
```
Entrada: Pool de readingUnits y clozeUnits
Salida: Array de 60 preguntas normalizadas (number: 1..60)

1. Barajar aleatoriamente pool de readingUnits.
2. Seleccionar bloques de lectura acumulando preguntas hasta alcanzar exactamente 30 preguntas.
3. Asignar números 1 a 30 y metadata { section: "Parte I: Comprensión Escrita - [Título Texto]" }.
4. Barajar aleatoriamente pool de clozeUnits (cada uno con 10 preguntas).
5. Seleccionar exactamente 3 textos cloze.
6. Asignar números 31 a 60 y metadata:
   - Cloze 1: preguntas 31 a 40
   - Cloze 2: preguntas 41 a 50
   - Cloze 3: preguntas 51 a 60
7. Iniciar sesión de test con startQuizSession() configurando mode: 'exam', totalTime: 5400s (90 min).
```

---

## 3. Interfaz y Experiencia de Usuario

1. **Dashboard:**
   - Tarjeta en `Modos Especiales`:
     - Título: **Simulacro Oficial AGBS (60 Preguntas)**
     - Badge: **Formato Oficial 2022**
     - Botón: **🎖️ Iniciar Nuevo Simulacro Oficial**
     - Metadatos: 30 Reading + 30 Cloze (3 textos) | 90 min | Corte 70% (42/60)
2. **Vista de Examen:**
   - La caja de lectura `.reading-passage-box` se resalta con cabecera estilizada, tipografía legible y scroll independiente para que la lectura del texto sea cómoda en dispositivos móviles.
   - Indicador de parte en el encabezado de cada pregunta.
3. **Resultados e Histórico:**
   - Muestra el resultado global (Aciertos / 60 y porcentaje).
   - Desglose por bloques:
     - *Comprensión Escrita:* X / 30 aciertos.
     - *Gramática y Vocabulario:* Y / 30 aciertos.
   - Veredicto oficial: **APTO (>= 42)** o **NO APTO (< 42)**.
