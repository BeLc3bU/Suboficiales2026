import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { ActiveQuiz, AppView, HistoryEntry, Topic } from '@/types';

interface DashboardViewProps {
  totalQuestions: number;
  topics: Topic[];
  history: HistoryEntry[];
  errorsCount: number;
  favsCount: number;
  activeQuiz: ActiveQuiz | null;
  onResumeQuiz: () => void;
  onDiscardQuiz: () => void;
  onStartOfficialMock: () => void;
  onStartGlobalExam: (count: number) => void;
  onStartSmartReview: (count?: number) => void;
  onStartErrorsQuiz: () => void;
  onStartFavsQuiz: () => void;
  onNavigate: (view: AppView) => void;
  onOpenStudySheet: (topicId: string) => void;
  onStartTopicQuiz: (topic: Topic, mode: 'practice' | 'exam') => void;
}

export function DashboardView({
  totalQuestions,
  topics,
  history,
  errorsCount,
  favsCount,
  activeQuiz,
  onResumeQuiz,
  onDiscardQuiz,
  onStartOfficialMock,
  onStartGlobalExam,
  onStartSmartReview,
  onStartErrorsQuiz,
  onStartFavsQuiz,
  onNavigate,
  onOpenStudySheet,
  onStartTopicQuiz,
}: DashboardViewProps) {
  const totalAttempted = history.reduce((acc, h) => acc + (h.total || 0), 0);
  const totalCorrect = history.reduce((acc, h) => acc + (h.correct || 0), 0);
  const globalAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const aptosCount = history.filter((h) => h.passed).length;

  // Detectar los últimos 3 temas sin aprobar o pendientes para sugerir "Próximo paso"
  const passedTopicIds = new Set(history.filter((h) => h.passed && h.topicId).map((h) => h.topicId));
  const suggestedTopics = topics.filter((t) => !passedTopicIds.has(t.id)).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Banner de Test Pausado */}
      {activeQuiz && !activeQuiz.isFinished && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm sm:flex-row sm:items-center dark:border-amber-800/80 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Test pausado
                </span>
                <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  {Object.keys(activeQuiz.userAnswers || {}).length}/{activeQuiz.questions.length} respondidas
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{activeQuiz.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResumeQuiz}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 sm:flex-none"
            >
              <Play className="h-4 w-4" />
              Reanudar
            </button>
            <button
              type="button"
              onClick={onDiscardQuiz}
              className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white p-2 text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-300"
              title="Descartar test pausado"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero + Objetivo 70% APTO */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-900/20 bg-gradient-to-br from-[#0f2354] via-[#17357a] to-[#1e40af] p-5 text-white shadow-lg sm:p-7">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-blue-100 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Baremo Oficial Patronato • Sin penalización de fallos
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tu preparación hacia el APTO (70%)
            </h2>
            <p className="text-sm text-blue-100/90 sm:text-base">
              Entrena con {totalQuestions.toLocaleString('es-ES')} preguntas oficiales, textos Reading & Cloze y fichas de trampas de examen.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:min-w-[340px]">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <div className="text-xl font-extrabold sm:text-2xl">{totalQuestions}</div>
              <div className="text-[11px] font-medium text-blue-100/80">Preguntas</div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm transition hover:bg-white/20"
            >
              <div
                className={`text-xl font-extrabold sm:text-2xl ${
                  globalAccuracy >= 70 ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {globalAccuracy}%
              </div>
              <div className="text-[11px] font-medium text-blue-100/80">Acierto global</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm transition hover:bg-white/20"
            >
              <div className="text-xl font-extrabold sm:text-2xl">{history.length}</div>
              <div className="text-[11px] font-medium text-blue-100/80">
                Tests ({aptosCount} aptos)
              </div>
            </button>
          </div>
        </div>

        {/* Barra de meta 70% */}
        <div className="relative z-10 mt-5 rounded-xl bg-black/20 p-3 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-blue-100">Progreso medio respecto al corte oficial</span>
            <span className={globalAccuracy >= 70 ? 'text-emerald-300' : 'text-amber-300'}>
              {globalAccuracy >= 70 ? 'En zona APTO (≥70%)' : `Faltan +${70 - globalAccuracy}% para el corte`}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                globalAccuracy >= 70 ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, globalAccuracy)}%` }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-white shadow"
              style={{ left: '70%' }}
              title="Corte oficial 70%"
            />
          </div>
        </div>
      </section>

      {/* Bloque: Tu sesión de hoy */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Tu sesión de hoy
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('topics')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Explorar {topics.length} temas
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* 1. Simulacro Oficial Procedural */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-blue-600/30 bg-white p-5 shadow-sm transition hover:border-blue-600/60 hover:shadow-md dark:border-blue-500/30 dark:bg-slate-900">
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Award className="h-3.5 w-3.5" />
                  Formato Oficial 2022
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">90 min • 60 Qs</span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Simulacro Oficial AGBS
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Examen único cada vez: 30 de <strong>Reading</strong> + 30 de <strong>Use of English (3 Cloze)</strong>. Corte 42/60.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartOfficialMock}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
            >
              <Play className="h-4 w-4" />
              Iniciar Simulacro (60 Qs)
            </button>
          </div>

          {/* 2. Repaso Inteligente IA */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Brain className="h-3.5 w-3.5" />
                  Prioridad inteligente
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">25 Preguntas</span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Repaso Inteligente
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Mezcla automáticamente tus <strong>{errorsCount} fallos pendientes</strong> con preguntas inéditas que aún no has practicado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartSmartReview(25)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Brain className="h-4 w-4" />
              Entrenar Ahora (25 Qs)
            </button>
          </div>

          {/* 3. Simulacro Rápido + Refuerzo */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Entrenamiento rápido
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Tests Mixtos y Bancos
              </h4>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[25, 50, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onStartGlobalExam(n)}
                    className="rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-800 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-400"
                  >
                    {n} Qs
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onStartErrorsQuiz}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Fallos ({errorsCount})
              </button>
              <button
                type="button"
                onClick={onStartFavsQuiz}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <Star className="h-3.5 w-3.5" />
                Favs ({favsCount})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos temas recomendados */}
      {suggestedTopics.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Siguientes temas recomendados
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('topics')}
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Ver todo el temario
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {topic.badge}
                    </span>
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {topic.questions.length} preguntas
                    </span>
                  </div>
                  <h4 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                    {topic.title}
                  </h4>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenStudySheet(topic.id)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartTopicQuiz(topic, 'practice')}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Practicar
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartTopicQuiz(topic, 'exam')}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    Examen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Último test: <strong className="text-slate-900 dark:text-white">{history[0].title}</strong> ({history[0].score}/10)
          </span>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Ver histórico
          </button>
        </div>
      )}
    </div>
  );
}
