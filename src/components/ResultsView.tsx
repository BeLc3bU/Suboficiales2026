import { useMemo, useState } from 'react';
import { Award, CheckCircle2, Home, RotateCcw, Star, XCircle } from 'lucide-react';
import type { HistoryEntry, OptionLetter } from '@/types';

interface ResultsViewProps {
  entry: HistoryEntry;
  favorites: string[];
  onToggleFavorite: (qId: string) => void;
  onRetry: (onlyFailed: boolean) => void;
  onGoHome: () => void;
  onGoHistory: () => void;
}

export function ResultsView({
  entry,
  favorites,
  onToggleFavorite,
  onRetry,
  onGoHome,
  onGoHistory,
}: ResultsViewProps) {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'blank'>('all');

  const pct = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
  const needed = Math.ceil(entry.total * 0.7);
  const mins = Math.floor(entry.timeSeconds / 60);
  const secs = entry.timeSeconds % 60;

  const filteredQuestions = useMemo(() => {
    const list = entry.questionsReview || [];
    if (filter === 'wrong') return list.filter((q) => !q.isCorrect && !q.isBlank);
    if (filter === 'correct') return list.filter((q) => q.isCorrect);
    if (filter === 'blank') return list.filter((q) => q.isBlank);
    return list;
  }, [entry.questionsReview, filter]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div
          className={`mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold ${
            entry.passed
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {entry.passed ? <Award className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {entry.passed ? 'APTO (≥70%)' : 'NO APTO (<70%)'}
        </div>

        <div className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          {entry.score} <span className="text-xl font-bold text-slate-400">/ 10</span>
        </div>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Has acertado <strong>{entry.correct}</strong> de <strong>{entry.total}</strong> preguntas ({pct}%).{' '}
          {entry.passed
            ? 'Superas el corte oficial del 70%.'
            : `Necesitas mínimo ${needed} aciertos (te faltaron ${Math.max(0, needed - entry.correct)}).`}
        </p>

        {entry.isOfficialMock && (
          <div className="mx-auto mt-4 grid max-w-lg grid-cols-2 gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs dark:border-blue-900 dark:bg-blue-950/30">
            <div>
              <div className="font-semibold text-slate-500 dark:text-slate-400">Parte I • Reading</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {entry.part1Score || `${entry.part1Correct ?? 0} / 30`}
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-500 dark:text-slate-400">Parte II • Cloze</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {entry.part2Score || `${entry.part2Correct ?? 0} / 30`}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto mt-5 grid max-w-xl grid-cols-4 gap-2">
          <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{entry.correct}</div>
            <div className="text-[11px] font-semibold text-slate-500">Aciertos</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-2.5 dark:bg-rose-950/30">
            <div className="text-lg font-extrabold text-rose-700 dark:text-rose-300">{entry.wrong}</div>
            <div className="text-[11px] font-semibold text-slate-500">Fallos</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-2.5 dark:bg-amber-950/30">
            <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300">{entry.blank}</div>
            <div className="text-[11px] font-semibold text-slate-500">En blanco</div>
          </div>
          <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">Tiempo</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onRetry(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Repetir Todo
          </button>
          {entry.wrong > 0 && (
            <button
              type="button"
              onClick={() => onRetry(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Repetir Falladas ({entry.wrong})
            </button>
          )}
          <button
            type="button"
            onClick={onGoHistory}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            Ver Histórico
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Home className="h-3.5 w-3.5" />
            Inicio
          </button>
        </div>
      </div>

      {/* Revisión detallada */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Revisión de preguntas ({filteredQuestions.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', `Todas (${entry.total})`],
                ['wrong', `Falladas (${entry.wrong})`],
                ['correct', `Acertadas (${entry.correct})`],
                ['blank', `En blanco (${entry.blank})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  filter === id
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const isFav = favorites.includes(q.id);
            const userText =
              q.userAnswer && q.options
                ? `${q.userAnswer}) ${q.options[q.userAnswer as OptionLetter] || q.userAnswer}`
                : q.userAnswer || 'Sin responder';
            const correctText = q.options
              ? `${q.answer}) ${q.options[q.answer as OptionLetter] || q.answer}`
              : q.answer;

            return (
              <div
                key={`${q.id}_${idx}`}
                className={`rounded-2xl border p-4 ${
                  q.isCorrect
                    ? 'border-emerald-200 bg-white dark:border-emerald-900/50 dark:bg-slate-900'
                    : q.isBlank
                      ? 'border-amber-200 bg-white dark:border-amber-900/50 dark:bg-slate-900'
                      : 'border-rose-200 bg-white dark:border-rose-900/50 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {q.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className={`h-4 w-4 ${q.isBlank ? 'text-amber-500' : 'text-rose-600'}`} />
                    )}
                    <span className="text-slate-500 dark:text-slate-400">#{q.number || idx + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(q.id)}
                    className={`rounded p-1 ${isFav ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                  >
                    <Star className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{q.question}</p>

                <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
                    <span className="font-semibold text-slate-500">Tu respuesta: </span>
                    <span className={q.isCorrect ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'font-bold text-rose-700 dark:text-rose-300'}>
                      {userText}
                    </span>
                  </div>
                  <div className="rounded-lg bg-emerald-50/70 px-3 py-1.5 dark:bg-emerald-950/30">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Correcta: </span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">{correctText}</span>
                  </div>
                </div>

                {q.explanation && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{q.explanation}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
