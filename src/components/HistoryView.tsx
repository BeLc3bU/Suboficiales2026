import { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Eye, History, Search, Trash2 } from 'lucide-react';
import type { HistoryEntry } from '@/types';

interface HistoryViewProps {
  history: HistoryEntry[];
  onViewDetail: (testId: string) => void;
  onDeleteItem: (testId: string) => void;
  onClearAll: () => void;
}

export function HistoryView({ history, onViewDetail, onDeleteItem, onClearAll }: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'score-asc'>('date-desc');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = history.filter((h) => {
      if (resultFilter === 'passed' && !h.passed) return false;
      if (resultFilter === 'failed' && h.passed) return false;
      if (q && !h.title.toLowerCase().includes(q) && !(h.badge || '').toLowerCase().includes(q)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortOrder === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOrder === 'score-desc') return (b.score || 0) - (a.score || 0);
      if (sortOrder === 'score-asc') return (a.score || 0) - (b.score || 0);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [history, resultFilter, search, sortOrder]);

  const passedCount = history.filter((h) => h.passed).length;
  const failedCount = history.length - passedCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
            <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Histórico de Tests Realizados
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pulsa en cualquier intento para inspeccionar el desglose pregunta a pregunta o repetir fallos.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar historial
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o tema..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', `Todos (${history.length})`],
              ['passed', `Aptos (${passedCount})`],
              ['failed', `No Aptos (${failedCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setResultFilter(id)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                resultFilter === id
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="date-desc">Más recientes</option>
            <option value="date-asc">Más antiguos</option>
            <option value="score-desc">Mejor nota</option>
            <option value="score-asc">Menor nota</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No hay registros que coincidan con el filtro actual.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => {
            const pct = h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0;
            const dateStr = new Date(h.date).toLocaleString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={h.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        h.passed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {h.passed ? '🎖️ APTO' : '❌ NO APTO'}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {h.badge || (h.mode === 'exam' ? 'Examen' : 'Práctica')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {dateStr}
                    </span>
                  </div>
                  <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{h.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {h.correct}/{h.total} aciertos ({pct}%)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(h.timeSeconds / 60)}m {h.timeSeconds % 60}s
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="mr-2 text-right">
                    <div className="text-lg font-black text-slate-900 dark:text-white">{h.score}/10</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewDetail(h.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(h.id)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700"
                    title="Eliminar registro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">¿Limpiar todo el historial?</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Esta acción eliminará todos los intentos registrados de tu dispositivo y nube.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClear(false);
                  onClearAll();
                }}
                className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Borrar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryDetailHeader({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Volver al Histórico
    </button>
  );
}
