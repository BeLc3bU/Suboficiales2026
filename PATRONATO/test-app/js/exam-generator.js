/**
 * Generador Procedural de Simulacro de Examen Oficial (60 Preguntas)
 * Estructura oficial AGBS / Patronato Militar (Referencia Examen 2022):
 * - Parte I: Comprensión Escrita (Preguntas 1 a 30) -> Muestreo por bloques de lectura sin cortar.
 * - Parte II: Gramática y Vocabulario (Preguntas 31 a 60) -> 3 textos Cloze de 10 huecos cada uno.
 * - Corte oficial: 70% APTO (42/60 aciertos), sin penalización por fallos, 90 minutos de tiempo límite.
 */

(function (global) {
  'use strict';

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renumberClozeGaps(text, startNum, count) {
    // Normaliza los huecos en el texto cloze para que coincidan con la numeración secuencial oficial (startNum a startNum + count - 1)
    // Detecta patrones como (31) _____ o (1) ________ o (1) _____
    let gapIndex = 0;
    const gapRegex = /\((\d+)\)\s*_{2,}|\((\d+)\)\s*_{1,5}|_{3,}\s*\((\d+)\)/g;

    const replaced = text.replace(gapRegex, function () {
      const currentNum = startNum + gapIndex;
      gapIndex++;
      return `(${currentNum}) _____`;
    });

    return replaced;
  }

  function generateOfficialExam() {
    const data = (typeof window !== 'undefined' && window.EXAM_DATA) 
      ? window.EXAM_DATA 
      : (global.EXAM_DATA || { readingUnits: [], clozeUnits: [] });

    if (!data.readingUnits || data.readingUnits.length === 0) {
      throw new Error('No hay bloques de lectura disponibles en EXAM_DATA.');
    }
    if (!data.clozeUnits || data.clozeUnits.length < 3) {
      throw new Error('Se requieren al menos 3 textos cloze de 10 preguntas en EXAM_DATA.');
    }

    const questions = [];

    // ==========================================
    // PARTE I: Comprensión Escrita (30 preguntas)
    // ==========================================
    const shuffledReadings = shuffle(data.readingUnits);
    let collectedReadingQuestions = 0;
    let readingUnitIndex = 0;
    const selectedReadingUnits = [];

    while (collectedReadingQuestions < 30 && readingUnitIndex < shuffledReadings.length) {
      const unit = shuffledReadings[readingUnitIndex];
      const qCount = unit.questions.length;
      if (collectedReadingQuestions + qCount <= 30) {
        selectedReadingUnits.push(unit);
        collectedReadingQuestions += qCount;
      }
      readingUnitIndex++;
    }

    // Si aún faltan preguntas (por ejemplo unidades de más de 1 que superaban 30),
    // buscar unidades de 1 pregunta para completar exactamente 30
    if (collectedReadingQuestions < 30) {
      for (const unit of shuffledReadings) {
        if (!selectedReadingUnits.includes(unit) && unit.questions.length === 1) {
          selectedReadingUnits.push(unit);
          collectedReadingQuestions += 1;
          if (collectedReadingQuestions === 30) break;
        }
      }
    }

    // Asignar numeración continua 1 a 30
    let currentNumber = 1;
    for (const unit of selectedReadingUnits) {
      const unitText = unit.text;
      for (const q of unit.questions) {
        questions.push({
          id: `SIM_P1_Q${currentNumber}_${q.id || Math.random().toString(36).substr(2, 6)}`,
          number: currentNumber,
          part: 1,
          section: `Parte I: Comprensión Escrita — ${unit.title || 'Lectura'}`,
          type: 'choice',
          readingText: unitText,
          question: q.question,
          options: { ...q.options },
          answer: q.answer,
          explanation: q.explanation || 'Comprensión escrita oficial.'
        });
        currentNumber++;
      }
    }

    // ==========================================
    // PARTE II: Gramática y Vocabulario (30 preguntas)
    // Exactamente 3 textos Cloze de 10 preguntas cada uno (31-40, 41-50, 51-60)
    // ==========================================
    const shuffledClozes = shuffle(data.clozeUnits);
    const selectedClozes = shuffledClozes.slice(0, 3);

    for (let cIdx = 0; cIdx < selectedClozes.length; cIdx++) {
      const cloze = selectedClozes[cIdx];
      const startNum = 31 + (cIdx * 10);
      const renumberedText = renumberClozeGaps(cloze.text, startNum, 10);

      for (let qIdx = 0; qIdx < cloze.questions.length; qIdx++) {
        const q = cloze.questions[qIdx];
        const qNum = startNum + qIdx;
        
        // Formatear enunciado de pregunta
        let qPrompt = q.question || `Completa el hueco (${qNum}) del texto:`;
        if (qPrompt.toLowerCase().includes('completa el hueco') || qPrompt.includes('(')) {
          qPrompt = `Completa el hueco (${qNum}) del texto:`;
        }

        questions.push({
          id: `SIM_P2_Q${qNum}_${q.id || Math.random().toString(36).substr(2, 6)}`,
          number: qNum,
          part: 2,
          section: `Parte II: Gramática y Vocabulario — Texto ${cIdx + 1}: ${cloze.title}`,
          type: 'choice',
          readingText: renumberedText,
          question: qPrompt,
          options: { ...q.options },
          answer: q.answer,
          explanation: q.explanation || `Solución oficial para el hueco (${qNum}): opción ${q.answer}.`
        });
      }
    }

    const timestamp = Date.now();
    return {
      topicId: `simulacro_oficial_${timestamp}`,
      title: 'Simulacro Oficial AGBS / Patronato (60 Preguntas)',
      badge: 'Oficial 2022',
      mode: 'exam',
      timeLimitMinutes: 90,
      totalTimeSeconds: 5400,
      passPercentage: 70,
      passMinCorrect: 42,
      isOfficialMock: true,
      questions: questions
    };
  }

  function evaluateOfficialExamResults(userAnswers, questions) {
    let part1Correct = 0;
    let part2Correct = 0;
    let totalCorrect = 0;

    questions.forEach((q, idx) => {
      const userChoice = userAnswers[idx];
      const isCorrect = userChoice === q.answer;
      if (isCorrect) {
        totalCorrect++;
        if (q.part === 1) {
          part1Correct++;
        } else if (q.part === 2) {
          part2Correct++;
        }
      }
    });

    const total = questions.length;
    const percentage = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
    const isApto = totalCorrect >= 42;

    return {
      totalQuestions: total,
      totalCorrect: totalCorrect,
      percentage: percentage,
      part1Score: `${part1Correct} / 30`,
      part2Score: `${part2Correct} / 30`,
      part1Correct: part1Correct,
      part2Correct: part2Correct,
      isApto: isApto,
      statusLabel: isApto ? 'APTO' : 'NO APTO',
      passMessage: isApto 
        ? '¡ENHORABUENA! Has superado el corte del 70% exigido en el examen oficial de Suboficiales.' 
        : 'NO APTO. Necesitas al menos 42 aciertos (70%) para superar la prueba oficial.'
    };
  }

  const EXAM_GENERATOR = {
    generateOfficialExam: generateOfficialExam,
    evaluateOfficialExamResults: evaluateOfficialExamResults,
    renumberClozeGaps: renumberClozeGaps
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EXAM_GENERATOR;
  } else {
    global.EXAM_GENERATOR = EXAM_GENERATOR;
  }
})(typeof window !== 'undefined' ? window : global);
