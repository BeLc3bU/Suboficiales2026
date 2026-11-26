import type { OptionLetter, Question } from '@/types';

export function checkTextAnswer(userVal: string, correctVal: string): boolean {
  if (!userVal || !correctVal) return false;
  const cleanUser = userVal.toLowerCase().replace(/['".,!?;]/g, '').trim();
  const options = correctVal
    .split('/')
    .map((s) => s.toLowerCase().replace(/['".,!?;]/g, '').trim());
  return options.includes(cleanUser);
}

/**
 * Devuelve una explicación diagnóstica en texto claro (sin HTML crudo)
 * indicando por qué la opción elegida no encaja frente a la correcta.
 */
export function getMistakeExplanation(q: Question, userPick: string): string {
  if (!q || !userPick || userPick === q.answer) return '';

  const isChoice = q.type === 'choice' && Boolean(q.options);
  const userLetter = isChoice ? (String(userPick).toUpperCase() as OptionLetter) : null;
  const userText = isChoice && userLetter ? (q.options?.[userLetter] || '').trim() : String(userPick).trim();
  const correctLetter = isChoice ? (String(q.answer).toUpperCase() as OptionLetter) : null;
  const correctText = isChoice && correctLetter ? (q.options?.[correctLetter] || '').trim() : String(q.answer).trim();

  const prompt = (q.question || '').toLowerCase();
  const userLower = userText.toLowerCase();
  const correctLower = correctText.toLowerCase();
  const section = (q.section || '').toLowerCase();

  if (q.readingText || section.includes('reading') || section.includes('comprensi')) {
    return `Según el texto de lectura, la opción elegida no se corresponde con los datos expuestos en el pasaje o contradice la información del autor. La opción correcta fundamentada en el texto es "${correctText}".`;
  }

  // 1a. to be + verbo base
  const beMatch = userLower.match(/\b(am|is|are|was|were)\s+([a-z]+)\b/);
  if (beMatch) {
    const [, beForm, nextWord] = beMatch;
    const isSpecial =
      ['going', 'not', 'being', 'having', 'doing'].includes(nextWord) ||
      nextWord.endsWith('ing') ||
      nextWord.endsWith('ed') ||
      nextWord.endsWith('en');
    if (
      !isSpecial &&
      !['very', 'so', 'too', 'quite', 'always', 'usually', 'often', 'never', 'just'].includes(nextWord)
    ) {
      return `La combinación de to be ("${beForm}") con un verbo en infinitivo simple ("${nextWord}") es agramatical en inglés. Para acción en desarrollo se requiere gerundio en -ing (${beForm} ${nextWord}ing) o pasiva con participio.`;
    }
  }

  // 1b. going to sin to be
  if (/^going\s+to\b/i.test(userLower) || (userLower.includes('going to') && !/\b(am|is|are|was|were)\b/.test(userLower))) {
    return `La perífrasis de futuro exige el auxiliar to be: am / is / are + going to + infinitivo. En "${userText}" falta to be.`;
  }

  // 1c. will + gerundio
  const willIngMatch = userLower.match(/\bwill\s+([a-z]+ing)\b/i);
  if (willIngMatch) {
    return `El modal "will" rige infinitivo sin 'to'. No puede ir seguido directamente de gerundio ("${willIngMatch[1]}"). El futuro continuo exige will be + -ing.`;
  }

  // 2. Genitivo sajón vs plural
  if ((userLower.includes("'s") || userLower.includes("s'")) && !correctLower.includes("'")) {
    return `Has elegido un genitivo sajón ("${userText}"), pero aquí no hay relación de posesión: se requiere el plural "${correctText}".`;
  }
  if (!userLower.includes("'") && (correctLower.includes("'s") || correctLower.includes("s'"))) {
    return `Existe una relación de posesión que exige el genitivo sajón ("${correctText}").`;
  }
  if (userLower.includes("s'") && correctLower.includes("'s")) {
    return `Los plurales irregulares que no acaban en -s (children, men, women) forman el genitivo con 's ("${correctText}"), no con s'.`;
  }
  if (userLower.includes("'s") && correctLower.includes("s'")) {
    return `Los plurales regulares terminados en -s forman el genitivo añadiendo solo el apóstrofo al final (s').`;
  }

  // 3. Plurales -y
  if (userLower.endsWith('ys') && correctLower.endsWith('ies')) {
    return `Regla de plurales: consonante + 'y' cambia a -ies ("${correctText}").`;
  }
  if (userLower.endsWith('ies') && correctLower.endsWith('ys')) {
    return `Regla de plurales: vocal + 'y' añade simplemente -s ("${correctText}").`;
  }

  // 4. Oraciones temporales con valor de futuro
  const timeClauseMatch = prompt.match(/\b(as soon as|when|until|till|before|after|unless|as long as|by the time)\b/i);
  if (timeClauseMatch && /\bwill\b/i.test(userLower)) {
    return `Regla de oro: tras la conjunción temporal "${timeClauseMatch[0]}" está prohibido usar 'will'. Se usa Presente Simple con valor de futuro ("${correctText}").`;
  }

  // 5. Futuro (evidencia vs opinión vs horario)
  if (/look\s+at\b|clouds|look!|watch\s+out|be\s+careful|sky/i.test(prompt) && /\bwill\b/i.test(userLower)) {
    return `Cuando existe evidencia visual o indicio presente directo, la norma exige "be going to" ("${correctText}"), no "will".`;
  }
  if (/i\s+think|probably|maybe|i\s+doubt|i\s+guess|perhaps|in\s+my\s+opinion/i.test(prompt) && correctLower.includes('will') && !userLower.includes('will')) {
    return `Con expresiones de opinión o predicción subjetiva se usa "will + infinitivo" ("${correctText}").`;
  }

  // 6. Good vs Well
  if (userLower === 'well' && correctLower === 'good') {
    return `Delante de un sustantivo o tras verbo copulativo se usa el adjetivo "good", no el adverbio "well".`;
  }
  if (userLower === 'good' && correctLower === 'well') {
    return `Para modificar a un verbo indicando modo se necesita el adverbio "well", no el adjetivo "good".`;
  }

  // 7. Adjetivo vs adverbio -ly
  if (correctLower.endsWith('ly') && !userLower.endsWith('ly')) {
    return `Esta posición modifica la acción del verbo y exige un adverbio en -ly ("${correctText}").`;
  }
  if (userLower.endsWith('ly') && !correctLower.endsWith('ly')) {
    return `"${userText}" es un adverbio; aquí se necesita el adjetivo "${correctText}".`;
  }

  // 8. Demostrativos
  if (['this', 'that'].includes(userLower) && ['these', 'those'].includes(correctLower)) {
    return `"${userText}" es singular y el contexto exige demostrativo plural ("${correctText}").`;
  }
  if (['these', 'those'].includes(userLower) && ['this', 'that'].includes(correctLower)) {
    return `"${userText}" es plural y el contexto exige demostrativo singular ("${correctText}").`;
  }

  // 9. Stative verbs
  const stativeVerbs = ['know', 'want', 'like', 'love', 'hate', 'understand', 'believe', 'remember', 'prefer', 'need', 'belong', 'mean', 'seem'];
  for (const sv of stativeVerbs) {
    if (userLower.includes(sv + 'ing') || userLower.includes(sv.slice(0, -1) + 'ing')) {
      return `"${sv}" es un stative verb (estado/cognición) y no admite tiempos continuos (-ing); requiere forma simple ("${correctText}").`;
    }
  }

  // 10. Participios -ed vs -ing
  if (userLower.endsWith('ed') && correctLower.endsWith('ing')) {
    return `Los adjetivos en -ed expresan cómo se siente alguien; para describir qué provoca la sensación se usa -ing ("${correctText}").`;
  }
  if (userLower.endsWith('ing') && correctLower.endsWith('ed')) {
    return `Para expresar cómo se siente una persona ante algo se utiliza la terminación -ed ("${correctText}").`;
  }

  const userDisplay = isChoice && userLetter ? `${userLetter}) "${userText}"` : `"${userText}"`;
  const correctDisplay = isChoice && correctLetter ? `${correctLetter}) "${correctText}"` : `"${correctText}"`;
  return `Has elegido ${userDisplay}, pero la respuesta correcta es ${correctDisplay}. Revisa la concordancia o tiempo verbal de la frase.`;
}
