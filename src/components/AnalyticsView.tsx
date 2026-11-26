import { useMemo } from 'react';
import { AlertTriangle, Award, BarChart3, Lightbulb, Play, TrendingUp } from 'lucide-react';
import type { HistoryEntry, SrsMap, StudyData, Topic } from '@/types';
import { resolveStudySheet } from '@/utils/studySheetResolver';

interface AnalyticsViewProps {
  history: HistoryEntry[];
  topics: Topic[];
  studyData: StudyData | null;
  srs: SrsMap;
  errorsCount: number;
  onStartTopicQuiz: (topic: Topic, mode: 'practice' | 'exam') => void;
  onOpenStudySheet: (topicId: string) => void;
  onStartSmartReview: () => void;
}

export function AnalyticsView({
  history,
  topics,
  studyData,
  srs,
  errorsCount,
  onStartTopicQuiz,
  onOpenStudySheet,
  onStartSmartReview,
}: AnalyticsViewProps) {
  const recentTests = useMemo(() => [...history].slice(0, 14).reverse(), [history]);

  const stats = useMemo(() => {
    if (!history.length) {
      return { avgScore: 0, aptoRate: 0, globalAccuracy: 0 };
    }
    const avgScore = history.reduce((acc, h) => acc + (h.score || 0), 0) / history.length;
    const aptos = history.filter((h) => h.passed).length;
    const totalQ = history.reduce((acc, h) => acc + (h.total || 0), 0);
    const totalOk = history.reduce((acc, h) => acc + (h.correct || 0), 0);
    return {
      avgScore: Number(avgScore.toFixed(1)),
      aptoRate: Math.round((aptos / history.length) * 100),
      globalAccuracy: totalQ > 0 ? Math.round((totalOk / totalQ) * 100) : 0,
    };
  }, [history]);

  // Rendimiento por bloque
  const blockStats = useMemo(() => {
    const map = new Map<string, { name: string; correct: number; total: number }>();
    const topicBlock = new Map<string, { id: string; name: string }>();
    topics.forEach((t) => {
      topicBlock.set(t.id, { id: t.blockId || 'otros', name: t.blockName || 'Otros' });
    });

    history.forEach((h) => {
      const b = (h.topicId && topicBlock.get(h.topicId)) || {
        id: h.isOfficialMock ? 'oficial' : 'general',
        name: h.isOfficialMock ? 'Simulacros Oficiales' : 'Simulacros Generales',
      };
      const cur = map.get(b.id) || { name: b.name, correct: 0, total: 0 };
      cur.correct += h.correct || 0;
      cur.total += h.total || 0;
      map.set(b.id, cur);
    });

    return Array.from(map.values()).map((b) => ({
      ...b,
      pct: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0,
    }));
  }, [history, topics]);

  // Top 3 temas con menor nota media (< 70% o menor acierto)
  const weakestTopics = useMemo(() => {
    const byTopic = new Map<string, { topic: Topic; correct: number; total: number }>();
    const topicMap = new Map(topics.map((t) => [t.id, t]));

    history.forEach((h) => {
      if (!h.topicId) return;
      const t = topicMap.get(h.topicId);
      if (!t) return;
      const cur = byTopic.get(t.id) || { topic: t, correct: 0, total: 0 };
      cur.correct += h.correct || 0;
      cur.total += h.total || 0;
      byTopic.set(t.id, cur);
    });

    return Array.from(byTopic.values())
      .map((item) => ({
        ...item,
        pct: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
  }, [history, topics]);

  const srsValues = Object.values(srs);
  const srsMastered = srsValues.filter((v) => v === 'mastered').length;
  const srsRepeat = srsValues.filter((v) => v === 'repeat').length;

  // Coordenadas SVG para gráfica de evolución
  const svgWidth = 600;
  const svgHeight = 190;
  const padX = 28;
  const padY = 18;
  const usableW = svgWidth - padX * 2;
  const usableH = svgHeight - padY * 2;
  const thresholdY = padY + usableH * (1 - 0.7); // Línea 7.0 / 70%

  const points = recentTests.map((t, i) => {
    const x =
      recentTests.length === 1
        ? padX + usableW / 2
        : padX + (i / (recentTests.length - 1)) * usableW;
    const clampedScore = Math.max(0, Math.min(10, t.score || 0));
    const y = padY + usableH * (1 - clampedScore / 10);
    return { x, y, test: t };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Analítica de Preparación (Objetivo 70% APTO)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Evolución de notas, rendimiento por bloque y focos prioritarios de mejora
          </p>
        </div>

        <button
          type="button"
          onClick={onStartSmartReview}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          <Play className="h-3.5 w-3.5" />
          Atacar {errorsCount} fallos pendientes
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Acierto Global</div>
          <div
            className={`mt-1 text-2xl font-extrabold ${
              stats.globalAccuracy >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {stats.globalAccuracy}%
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nota Media</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{stats.avgScore} / 10</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tasa de APTO</div>
          <div className="mt-1 text-2xl font-extrabold text-blue-700 dark:text-blue-400">{stats.aptoRate}%</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Flashcards SRS</div>
          <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            <span className="text-emerald-600">{srsMastered}</span> dom. •{' '}
            <span className="text-rose-600">{srsRepeat}</span> rep.
          </div>
        </div>
      </div>

      {/* Gráfica SVG de evolución */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Evolución últimos {recentTests.length} tests
          </h3>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            --- Corte oficial 7.0 (70%)
          </span>
        </div>

        {recentTests.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Realiza tu primer test para ver la gráfica de evolución hacia el 70% APTO.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-48 w-full min-w-[380px]">
              {/* Línea de corte 7.0 */}
              <line
                x1={padX}
                y1={thresholdY}
                x2={svgWidth - padX}
                y2={thresholdY}
                stroke="#10b981"
                strokeDasharray="6 4"
                strokeWidth="1.5"
              />
              <text x={padX} y={thresholdY - 5} fill="#10b981" fontSize="10" fontWeight="bold">
                7.0 APTO
              </text>

              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill={p.test.passed ? '#10b981' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    className="fill-slate-700 dark:fill-slate-200"
                  >
                    {p.test.score}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Desglose por bloque */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <Award className="h-4 w-4 text-blue-600" />
            Rendimiento por bloque
          </h3>
          {blockStats.length === 0 ? (
            <p className="text-xs text-slate-500">Sin datos suficientes todavía.</p>
          ) : (
            <div className="space-y-3">
              {blockStats.map((b) => (
                <div key={b.name}>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{b.name}</span>
                    <span className={b.pct >= 70 ? 'text-emerald-600' : 'text-amber-600'}>
                      {b.pct}% ({b.correct}/{b.total})
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${b.pct >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top 3 temas más flojos */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Temas prioritarios para reforzar
          </h3>
          {weakestTopics.length === 0 ? (
            <p className="text-xs text-slate-500">Completa algún tema para detectar tus puntos débiles.</p>
          ) : (
            <div className="space-y-2.5">
              {weakestTopics.map(({ topic, pct }) => {
                const hasSheet = Boolean(resolveStudySheet(topic.id, studyData));
                return (
                  <div
                    key={topic.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{topic.title}</div>
                      <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        Acierto medio: {pct}%
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasSheet && (
                        <button
                          type="button"
                          onClick={() => onOpenStudySheet(topic.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                        >
                          <Lightbulb className="h-3 w-3" />
                          Ficha
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onStartTopicQuiz(topic, 'practice')}
                        className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        Repasar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
