import type { ExamData, Question } from '@/types';

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function renumberClozeGaps(text: string, startNum: number): string {
  let gapIndex = 0;
  const gapRegex = /\((\d+)\)\s*_{2,}|\((\d+)\)\s*_{1,5}|_{3,}\s*\((\d+)\)/g;

  return text.replace(gapRegex, () => {
    const currentNum = startNum + gapIndex;
    gapIndex++;
    return `(${currentNum}) _____`;
  });
}

export interface GeneratedOfficialExam {
  topicId: string;
  title: string;
  badge: string;
  mode: 'exam';
  timeLimitMinutes: number;
  totalTimeSeconds: number;
  isOfficialMock: true;
  questions: Question[];
}

export function generateOfficialExam(data: ExamData): GeneratedOfficialExam {
  if (!data.readingUnits || data.readingUnits.length === 0) {
    throw new Error('No hay bloques de lectura disponibles en EXAM_DATA.');
  }
  if (!data.clozeUnits || data.clozeUnits.length < 3) {
    throw new Error('Se requieren al menos 3 textos cloze de 10 preguntas en EXAM_DATA.');
  }

  const questions: Question[] = [];

  // PARTE I: Comprensión Escrita (30 preguntas)
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

  if (collectedReadingQuestions < 30) {
    for (const unit of shuffledReadings) {
      if (!selectedReadingUnits.includes(unit) && unit.questions.length === 1) {
        selectedReadingUnits.push(unit);
        collectedReadingQuestions += 1;
        if (collectedReadingQuestions === 30) break;
      }
    }
  }

  let currentNumber = 1;
  for (const unit of selectedReadingUnits) {
    for (const q of unit.questions) {
      questions.push({
        id: `SIM_P1_Q${currentNumber}_${q.id || Math.random().toString(36).slice(2, 8)}`,
        number: currentNumber,
        part: 1,
        section: `Parte I: Comprensión Escrita — ${unit.title || 'Lectura'}`,
        type: 'choice',
        readingText: unit.text,
        question: q.question,
        options: { ...q.options },
        answer: q.answer,
        explanation: q.explanation || 'Comprensión escrita oficial.',
      });
      currentNumber++;
    }
  }

  // PARTE II: Gramática y Vocabulario (3 textos Cloze x 10 = 30 preguntas)
  const selectedClozes = shuffle(data.clozeUnits).slice(0, 3);
  for (let cIdx = 0; cIdx < selectedClozes.length; cIdx++) {
    const cloze = selectedClozes[cIdx];
    const startNum = 31 + cIdx * 10;
    const renumberedText = renumberClozeGaps(cloze.text, startNum);

    for (let qIdx = 0; qIdx < cloze.questions.length; qIdx++) {
      const q = cloze.questions[qIdx];
      const qNum = startNum + qIdx;
      let qPrompt = q.question || `Completa el hueco (${qNum}) del texto:`;
      if (qPrompt.toLowerCase().includes('completa el hueco') || qPrompt.includes('(')) {
        qPrompt = `Completa el hueco (${qNum}) del texto:`;
      }

      questions.push({
        id: `SIM_P2_Q${qNum}_${q.id || Math.random().toString(36).slice(2, 8)}`,
        number: qNum,
        part: 2,
        section: `Parte II: Gramática y Vocabulario — Texto ${cIdx + 1}: ${cloze.title}`,
        type: 'choice',
        readingText: renumberedText,
        question: qPrompt,
        options: { ...q.options },
        answer: q.answer,
        explanation: q.explanation || `Solución oficial para el hueco (${qNum}): opción ${q.answer}.`,
      });
    }
  }

  return {
    topicId: `simulacro_oficial_${Date.now()}`,
    title: 'Simulacro Oficial AGBS / Patronato (60 Preguntas)',
    badge: 'Oficial 2022',
    mode: 'exam',
    timeLimitMinutes: 90,
    totalTimeSeconds: 5400,
    isOfficialMock: true,
    questions,
  };
}
