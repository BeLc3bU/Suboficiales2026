import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Grid,
  Keyboard,
  Pause,
  Star,
  X,
} from 'lucide-react';
import type { ActiveQuiz, OptionLetter, Question } from '@/types';
import { checkTextAnswer, getMistakeExplanation } from '@/utils/mistakeExplainer';

interface QuizViewProps {
  quiz: ActiveQuiz;
  favorites: string[];
  onAnswer: (q: Question, answer: string, isInteractive?: boolean) => void;
  onRevealInteractive: (qId: string) => void;
  onSetIndex: (index: number) => void;
  onToggleFavorite: (qId: string) => void;
  onFinish: () => void;
  onPause: () => void;
  onDiscard: () => void;
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ClozeHighlightedText({ text, activeNum }: { text: string; activeNum?: number }) {
  const parts = useMemo(() => {
    if (!activeNum) return [text];
    const token = `(${activeNum})`;
    const regex = new RegExp(`(\\(\\s*${activeNum}\\s*\\)\\s*_{2,}|\\(\\s*${activeNum}\\s*\\))`, 'g');
    const chunks = text.split(regex);
    return chunks.length > 1 ? chunks : text.includes(token) ? text.split(token) : [text];
  }, [text, activeNum]);

  if (parts.length === 1) {
    return <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">{text}</div>;
  }

  return (
    <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
      {parts.map((part, idx) => {
        const isCurrentGap =
          activeNum !== undefined &&
          (part.trim().startsWith(`(${activeNum})`) || part === `(${activeNum})`);
        if (isCurrentGap) {
          return (
            <mark
              key={idx}
              className="mx-0.5 inline-block rounded-md bg-blue-600 px-1.5 py-0.5 font-extrabold text-white shadow-sm"
            >
              {part}
            </mark>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </div>
  );
}

export function QuizView({
  quiz,
  favorites,
  onAnswer,
  onRevealInteractive,
  onSetIndex,
  onToggleFavorite,
  onFinish,
  onPause,
  onDiscard,
}: QuizViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [mobileReadingExpanded, setMobileReadingExpanded] = useState(true);
  const [textDraft, setTextDraft] = useState('');

  const q = quiz.questions[quiz.currentIndex];
  const total = quiz.questions.length;
  const userSelected = quiz.userAnswers[q.id];
  const isPractice = quiz.mode === 'practice';
  const isInteractive = !(q.type === 'choice' && q.options);
  const isChecked = isInteractive ? Boolean(quiz.interactiveChecked[q.id]) : userSelected !== undefined;
  const isFav = favorites.includes(q.id);
  const answeredCount = Object.keys(quiz.userAnswers).length;

  useEffect(() => {
    setTextDraft(quiz.userAnswers[q.id] || '');
  }, [q.id, quiz.userAnswers]);

  // Atajos de teclado en escritorio (1-4 / A-D, ← / →, F)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (exitModalOpen || finishConfirmOpen) return;

      const key = e.key.toLowerCase();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (quiz.currentIndex > 0) onSetIndex(quiz.currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (quiz.currentIndex < total - 1) onSetIndex(quiz.currentIndex + 1);
      } else if (key === 'f') {
        e.preventDefault();
        onToggleFavorite(q.id);
      } else if (!isInteractive && !(isPractice && isChecked)) {
        const keyMap: Record<string, OptionLetter> = {
          '1': 'A',
          '2': 'B',
          '3': 'C',
          '4': 'D',
          a: 'A',
          b: 'B',
          c: 'C',
          d: 'D',
        };
        const letter = keyMap[key];
        if (letter && q.options?.[letter]) {
          e.preventDefault();
          onAnswer(q, letter);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    exitModalOpen,
    finishConfirmOpen,
    isChecked,
    isInteractive,
    isPractice,
    onAnswer,
    onSetIndex,
    onToggleFavorite,
    q,
    quiz.currentIndex,
    total,
  ]);

  const handleRequestFinish = () => {
    if (quiz.mode === 'exam' && answeredCount < total) {
      setFinishConfirmOpen(true);
      return;
    }
    onFinish();
  };

  const isCorrectAnswer = useMemo(() => {
    if (!userSelected) return false;
    return isInteractive ? checkTextAnswer(userSelected, q.answer) : userSelected === q.answer;
  }, [isInteractive, q.answer, userSelected]);

  const mistakeText = useMemo(() => {
    if (!isPractice || !isChecked || isCorrectAnswer || !userSelected) return '';
    return getMistakeExplanation(q, userSelected);
  }, [isChecked, isCorrectAnswer, isPractice, q, userSelected]);

  const hasReading = Boolean(q.readingText);
  const progressPct = ((quiz.currentIndex + 1) / total) * 100;

  return (
    <div className="space-y-4">
      {/* Cabecera de Quiz */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {quiz.badge}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isPractice ? 'Modo Práctica' : 'Modo Examen (Corte 70%)'}
            </span>
          </div>
          <h2 className="mt-1 truncate text-base font-extrabold text-slate-900 sm:text-lg dark:text-white">
            {quiz.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quiz.mode === 'exam' && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                quiz.isOfficialMock && quiz.elapsedSeconds >= 5400
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatSeconds(quiz.elapsedSeconds)}
              {quiz.isOfficialMock && ' / 90:00'}
            </div>
          )}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Grid className="h-3.5 w-3.5" />
            {answeredCount}/{total}
          </button>

          <button
            type="button"
            onClick={() => setExitModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Pause className="h-3.5 w-3.5" />
            Pausar / Salir
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Layout Split-Pane */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Panel Reading / Cloze (Izquierda sticky en desktop, plegable en móvil) */}
        {hasReading && q.readingText && (
          <aside className="lg:col-span-5">
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 shadow-sm lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col dark:border-blue-900/60 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMobileReadingExpanded((v) => !v)}
                className="flex w-full items-center justify-between border-b border-blue-200/70 px-4 py-3 text-left lg:cursor-default dark:border-slate-800"
              >
                <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  <BookOpenText className="h-4 w-4" />
                  {q.part === 1
                    ? 'Parte I • Comprensión Escrita'
                    : q.part === 2
                      ? 'Parte II • Cloze (Use of English)'
                      : 'Texto de referencia'}
                </span>
                <span className="text-blue-700 lg:hidden dark:text-blue-300">
                  {mobileReadingExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              <div
                className={`overflow-y-auto p-4 ${
                  mobileReadingExpanded ? 'max-h-60 lg:max-h-none' : 'hidden lg:block'
                }`}
              >
                <ClozeHighlightedText text={q.readingText} activeNum={q.number} />
              </div>
            </div>
          </aside>
        )}

        {/* Columna principal de pregunta */}
        <div className={hasReading ? 'lg:col-span-7 space-y-4' : 'lg:col-span-8 space-y-4'}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                Pregunta {quiz.currentIndex + 1} de {total}
              </span>
              <div className="flex items-center gap-2">
                {q.section && (
                  <span className="max-w-[240px] truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {q.section}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onToggleFavorite(q.id)}
                  className={`rounded-lg border p-1.5 transition ${
                    isFav
                      ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/50'
                      : 'border-slate-200 text-slate-400 hover:text-amber-500 dark:border-slate-700'
                  }`}
                  title="Marcar como favorita (Tecla F)"
                  aria-label="Marcar como favorita"
                >
                  <Star className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            <div className="mb-5 whitespace-pre-line text-base font-semibold leading-relaxed text-slate-900 sm:text-lg dark:text-white">
              {q.question}
            </div>

            {/* Opciones Choice */}
            {!isInteractive && q.options ? (
              <div className="space-y-2.5">
                {(['A', 'B', 'C', 'D'] as OptionLetter[]).map((letter) => {
                  const optText = q.options?.[letter];
                  if (!optText) return null;

                  let style =
                    'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-500';
                  if (isPractice && isChecked) {
                    if (letter === q.answer) {
                      style =
                        'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100';
                    } else if (letter === userSelected) {
                      style =
                        'border-rose-500 bg-rose-50 text-rose-950 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-100';
                    } else {
                      style = 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900';
                    }
                  } else if (!isPractice && userSelected === letter) {
                    style =
                      'border-blue-600 bg-blue-50 ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/60';
                  }

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={isPractice && isChecked}
                      onClick={() => onAnswer(q, letter)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition sm:text-base ${style}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                        {letter}
                      </span>
                      <span className="flex-1">{optText}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Input interactivo */
              <div className="space-y-3">
                <input
                  type="text"
                  value={textDraft}
                  disabled={isPractice && isChecked}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textDraft.trim()) {
                      onAnswer(q, textDraft.trim(), true);
                    }
                  }}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPractice && isChecked}
                    onClick={() => textDraft.trim() && onAnswer(q, textDraft.trim(), true)}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    Comprobar
                  </button>
                  <button
                    type="button"
                    disabled={isPractice && isChecked}
                    onClick={() => onRevealInteractive(q.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver solución
                  </button>
                </div>
              </div>
            )}

            {/* Feedback inmediato en modo práctica */}
            {isPractice && isChecked && (
              <div
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  isCorrectAnswer
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
                    : 'border-rose-200 bg-rose-50/70 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100'
                }`}
              >
                <div className="font-extrabold">
                  {isCorrectAnswer ? '✓ ¡Correcto!' : userSelected ? '✕ Respuesta incorrecta' : 'ℹ️ Solución oficial'}
                </div>
                {mistakeText && <p className="mt-1.5 text-xs leading-relaxed opacity-90">{mistakeText}</p>}
                {q.explanation && (
                  <p className="mt-2 border-t border-black/10 pt-2 text-xs leading-relaxed dark:border-white/10">
                    <strong>Regla:</strong> {q.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Controles inferiores */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={quiz.currentIndex === 0}
              onClick={() => onSetIndex(quiz.currentIndex - 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </button>

            <div className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 md:flex">
              <Keyboard className="h-3.5 w-3.5" />
              A-D / 1-4 responder • ←/→ navegar • F favorita
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestFinish}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" />
                Finalizar
              </button>
              {quiz.currentIndex < total - 1 && (
                <button
                  type="button"
                  onClick={() => onSetIndex(quiz.currentIndex + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* En split-pane, navegador compacto debajo */}
          {hasReading && (
            <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>Navegador de preguntas</span>
                <span>
                  {answeredCount} / {total} respondidas
                </span>
              </div>
              <QuestionGrid
                questions={quiz.questions}
                currentIndex={quiz.currentIndex}
                userAnswers={quiz.userAnswers}
                isPractice={isPractice}
                onSelect={onSetIndex}
              />
            </div>
          )}
        </div>

        {/* Navegador lateral en desktop cuando NO hay reading */}
        {!hasReading && (
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>Navegador</span>
                <span>
                  {answeredCount} / {total}
                </span>
              </div>
              <QuestionGrid
                questions={quiz.questions}
                currentIndex={quiz.currentIndex}
                userAnswers={quiz.userAnswers}
                isPractice={isPractice}
                onSelect={onSetIndex}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Drawer móvil de preguntas */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs lg:hidden">
          <div className="flex h-full w-80 max-w-[85vw] flex-col bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Navegador ({answeredCount}/{total})
              </h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuestionGrid
                questions={quiz.questions}
                currentIndex={quiz.currentIndex}
                userAnswers={quiz.userAnswers}
                isPractice={isPractice}
                onSelect={(idx) => {
                  onSetIndex(idx);
                  setDrawerOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Salir / Pausar */}
      {exitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Salir del Test</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ¿Qué deseas hacer con el progreso de este intento?
            </p>
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setExitModalOpen(false);
                  onPause();
                }}
                className="w-full rounded-xl bg-blue-700 px-4 py-3 text-left text-sm font-bold text-white hover:bg-blue-800"
              >
                ⏸️ Pausar y guardar para continuar luego
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitModalOpen(false);
                  onDiscard();
                }}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              >
                🗑️ Descartar intento y volver al inicio
              </button>
              <button
                type="button"
                onClick={() => setExitModalOpen(false)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Seguir haciendo el test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar entrega con preguntas en blanco */}
      {finishConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Entregar examen</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Tienes <strong>{total - answeredCount}</strong> pregunta(s) sin responder. Recuerda que en el Patronato los fallos no restan. ¿Deseas entregar ahora?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFinishConfirmOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinishConfirmOpen(false);
                  onFinish();
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Entregar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionGrid({
  questions,
  currentIndex,
  userAnswers,
  isPractice,
  onSelect,
}: {
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, string>;
  isPractice: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6">
      {questions.map((q, idx) => {
        const ans = userAnswers[q.id];
        const isCurrent = idx === currentIndex;
        let cls = 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
        if (ans !== undefined && ans !== '') {
          if (isPractice) {
            const ok = q.type === 'choice' ? ans === q.answer : checkTextAnswer(ans, q.answer);
            cls = ok
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-rose-500 bg-rose-500 text-white';
          } else {
            cls = 'border-blue-600 bg-blue-600 text-white';
          }
        }
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(idx)}
            className={`h-8 rounded-lg border text-xs font-bold transition ${cls} ${
              isCurrent ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900' : ''
            }`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
