import { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  Zap,
} from 'lucide-react';
import type { SrsMap, SrsStatus, StudySheet } from '@/types';
import { isSpeechSupported, speakEnglish } from '@/utils/speech';
import { getSrsCardKey } from '@/utils/studySheetResolver';

interface StudySheetViewProps {
  sheet: StudySheet;
  srs: SrsMap;
  onSetSrsStatus: (cardKey: string, status: SrsStatus) => void;
  onBack: () => void;
  onStartTopicTest: () => void;
}

export function StudySheetView({
  sheet,
  srs,
  onSetSrsStatus,
  onBack,
  onStartTopicTest,
}: StudySheetViewProps) {
  const [mode, setMode] = useState<'summary' | 'flashcards'>('summary');
  const [onlyPending, setOnlyPending] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const speechReady = isSpeechSupported();

  const indexedCards = useMemo(() => {
    return (sheet.flashcards || []).map((card, idx) => ({
      card,
      idx,
      key: getSrsCardKey(sheet.topicId, idx),
      status: srs[getSrsCardKey(sheet.topicId, idx)] || null,
    }));
  }, [sheet.flashcards, sheet.topicId, srs]);

  const visibleCards = useMemo(() => {
    if (!onlyPending) return indexedCards;
    const pending = indexedCards.filter((c) => c.status !== 'mastered');
    return pending.length > 0 ? pending : indexedCards;
  }, [indexedCards, onlyPending]);

  const masteredCount = indexedCards.filter((c) => c.status === 'mastered').length;
  const currentEntry = visibleCards[Math.min(cardIndex, Math.max(0, visibleCards.length - 1))];

  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
  }, [sheet.topicId, onlyPending]);

  // Atajos de teclado en modo Flashcards
  useEffect(() => {
    if (mode !== 'flashcards' || !currentEntry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFlipped(false);
        setCardIndex((i) => Math.min(visibleCards.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFlipped(false);
        setCardIndex((i) => Math.max(0, i - 1));
      } else if (e.key === '1') {
        onSetSrsStatus(currentEntry.key, 'repeat');
      } else if (e.key === '2') {
        onSetSrsStatus(currentEntry.key, 'doubt');
      } else if (e.key === '3') {
        onSetSrsStatus(currentEntry.key, 'mastered');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentEntry, mode, onSetSrsStatus, visibleCards.length]);

  const handleGradeCard = (status: SrsStatus) => {
    if (!currentEntry) return;
    onSetSrsStatus(currentEntry.key, status);
    if (cardIndex < visibleCards.length - 1) {
      setFlipped(false);
      setCardIndex((i) => i + 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Temario
          </button>
          <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {sheet.badge}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('summary')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              mode === 'summary'
                ? 'bg-blue-700 text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Resumen & Tips
          </button>
          <button
            type="button"
            onClick={() => setMode('flashcards')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              mode === 'flashcards'
                ? 'bg-blue-700 text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Flashcards SRS ({masteredCount}/{indexedCards.length})
          </button>
        </div>
      </div>

      {/* Título */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{sheet.title}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sheet.summary}</p>
      </div>

      {mode === 'summary' ? (
        <div className="space-y-5">
          {/* Reglas de Oro */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <Trophy className="h-5 w-5 text-amber-500" />
              Reglas de Oro (Imprescindibles)
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {sheet.goldenRules.map((rule, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">{rule.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{rule.content}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Trampas del Tribunal */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <AlertOctagon className="h-5 w-5 text-rose-500" />
              Trampas Típicas del Tribunal Examinador
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {sheet.examTraps.map((trap, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{trap.trap}</div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="rounded-lg bg-rose-50 px-2.5 py-1.5 font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                      {trap.exampleBad}
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                      <span>{trap.exampleGood}</span>
                      {speechReady && (
                        <button
                          type="button"
                          onClick={() => speakEnglish(trap.exampleGood.replace(/[✔️❌]/g, ''))}
                          className="shrink-0 rounded p-1 text-emerald-700 hover:bg-emerald-200/60 dark:text-emerald-300"
                          title="Escuchar pronunciación en inglés"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{trap.explanation}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tips de Descarte */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <Zap className="h-5 w-5 text-blue-600" />
              Tips de Descarte Rápido (Estrategia 70% Apto)
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {sheet.examTips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"
                >
                  <div className="text-xs font-extrabold uppercase tracking-wide text-blue-800 dark:text-blue-300">
                    {tip.rule}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{tip.tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Vocabulario Clave con Audio */}
          {sheet.vocabularyKeys?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Vocabulario y Expresiones Clave
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sheet.vocabularyKeys.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{v.term}</span>
                      {speechReady && (
                        <button
                          type="button"
                          onClick={() => speakEnglish(v.term)}
                          className="shrink-0 rounded-lg border border-slate-200 p-1 text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
                          title="Escuchar pronunciación en inglés"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">{v.meaning}</div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{v.distractorRole}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode('flashcards')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              🃏 Practicar Flashcards SRS
            </button>
            <button
              type="button"
              onClick={onStartTopicTest}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Play className="h-4 w-4" />
              Hacer Test de este Tema
            </button>
          </div>
        </div>
      ) : (
        /* MODO FLASHCARDS SRS */
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tarjeta {cardIndex + 1} de {visibleCards.length} • Dominadas: {masteredCount}/{indexedCards.length}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              Solo pendientes / repasar
            </label>
          </div>

          {currentEntry && (
            <>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setFlipped((f) => !f);
                }}
                className={`min-h-[260px] cursor-pointer rounded-2xl border-2 p-6 shadow-md transition-all flex flex-col justify-between ${
                  flipped
                    ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/25'
                    : 'border-blue-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      flipped
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                    }`}
                  >
                    {flipped ? '💡 Solución y Regla' : '❓ Pregunta / Reto'}
                  </span>
                  {currentEntry.status && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Estado: {currentEntry.status === 'mastered' ? 'Dominada' : currentEntry.status === 'doubt' ? 'Dudosa' : 'Repetir'}
                    </span>
                  )}
                </div>

                <div className="my-6 whitespace-pre-line text-center text-base font-bold leading-relaxed text-slate-900 sm:text-lg dark:text-white">
                  {flipped ? currentEntry.card.back : currentEntry.card.front}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Pulsa la tarjeta o Espacio para girar</span>
                  {speechReady && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEnglish(flipped ? currentEntry.card.back : currentEntry.card.front);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Escuchar
                    </button>
                  )}
                </div>
              </div>

              {/* Botones SRS */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleGradeCard('repeat')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    currentEntry.status === 'repeat'
                      ? 'border-rose-500 bg-rose-600 text-white'
                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Repetir (1)
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeCard('doubt')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    currentEntry.status === 'doubt'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Dudosa (2)
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeCard('mastered')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    currentEntry.status === 'mastered'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Dominada (3)
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={cardIndex === 0}
                  onClick={() => {
                    setFlipped(false);
                    setCardIndex((i) => Math.max(0, i - 1));
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFlipped(false);
                    setCardIndex((i) => Math.min(visibleCards.length - 1, i + 1));
                  }}
                  disabled={cardIndex >= visibleCards.length - 1}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  Siguiente
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
