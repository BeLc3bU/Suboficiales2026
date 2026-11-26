import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Lightbulb, Play, Search, Timer } from 'lucide-react';
import type { TopicProgressSummary } from '@/hooks/useAppState';
import type { QuizMode, StudyData, Topic } from '@/types';
import { resolveStudySheet } from '@/utils/studySheetResolver';

interface TopicsViewProps {
  topics: Topic[];
  studyData: StudyData | null;
  getTopicProgress: (topicId: string, topicTitle?: string) => TopicProgressSummary;
  onStartTopicQuiz: (topic: Topic, mode: QuizMode) => void;
  onOpenStudySheet: (topicId: string) => void;
}

export function TopicsView({
  topics,
  studyData,
  getTopicProgress,
  onStartTopicQuiz,
  onOpenStudySheet,
}: TopicsViewProps) {
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const blocks = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const t of topics) {
      const bId = t.blockId || 'bloque_1';
      const bName = t.blockName || bId;
      const existing = map.get(bId);
      if (existing) existing.count++;
      else map.set(bId, { id: bId, name: bName, count: 1 });
    }
    return Array.from(map.values());
  }, [topics]);

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((t) => {
      if (blockFilter !== 'all' && (t.blockId || 'bloque_1') !== blockFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    });
  }, [blockFilter, search, topics]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Temario Oficial y Baterías
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {topics.length} unidades disponibles • Practica con explicación inmediata o evalúate con corte al 70%
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tema, gramática, unit..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Píldoras de filtro por bloque */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBlockFilter('all')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            blockFilter === 'all'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Todos ({topics.length})
        </button>
        {blocks.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBlockFilter(b.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              blockFilter === b.id
                ? 'bg-blue-700 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {b.name} ({b.count})
          </button>
        ))}
      </div>

      {/* Grid de temas simplificado */}
      {filteredTopics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No se encontraron temas que coincidan con "{search}".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTopics.map((topic) => {
            const prog = getTopicProgress(topic.id, topic.title);
            const sheet = resolveStudySheet(topic.id, studyData);
            const isPaused = prog.practice.isPaused || prog.exam.isPaused;

            return (
              <article
                key={topic.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {topic.badge || 'Tema'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isPaused && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="h-3 w-3" /> Pausado
                        </span>
                      )}
                      {prog.exam.passed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> APTO {prog.exam.bestScore}/10
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {topic.questions.length} Qs
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-2.5 text-base font-bold leading-snug text-slate-900 dark:text-white">
                    {topic.title}
                  </h3>
                  {topic.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {topic.description}
                    </p>
                  )}

                  {/* Barra de dominio limpia */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Dominio del tema</span>
                      <span className={prog.masteryPct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                        {prog.masteryPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          prog.masteryPct >= 70
                            ? 'bg-emerald-500'
                            : prog.masteryPct > 0
                              ? 'bg-blue-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ width: `${prog.masteryPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {sheet && (
                    <button
                      type="button"
                      onClick={() => onOpenStudySheet(topic.id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      Ficha de Estudio, Trampas y Flashcards
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onStartTopicQuiz(topic, 'practice')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Práctica
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartTopicQuiz(topic, 'exam')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
                    >
                      <Timer className="h-3.5 w-3.5" />
                      Examen
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
