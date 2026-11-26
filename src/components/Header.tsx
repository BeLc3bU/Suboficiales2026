import { BarChart3, Cloud, CloudOff, History, Loader2, Moon, Sun, UserCheck } from 'lucide-react';
import type { AppView, SyncStatus, ThemeMode } from '@/types';

interface HeaderProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  syncStatus: SyncStatus;
  profileCode: string;
  onOpenProfileModal: () => void;
}

export function Header({
  view,
  onNavigate,
  theme,
  onToggleTheme,
  syncStatus,
  profileCode,
  onOpenProfileModal,
}: HeaderProps) {
  const syncMeta = {
    saved: {
      label: 'Guardado',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      icon: <Cloud className="h-3.5 w-3.5" />,
    },
    saving: {
      label: 'Guardando…',
      cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    loading: {
      label: 'Sincronizando…',
      cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    offline: {
      label: 'Local',
      cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      icon: <CloudOff className="h-3.5 w-3.5" />,
    },
  }[syncStatus];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-[#0f1626]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="group flex items-center gap-2.5 text-left focus:outline-none"
          title="Volver al inicio"
        >
          <span className="inline-flex items-center rounded-lg bg-gradient-to-br from-blue-900 to-blue-600 px-2.5 py-1 text-xs font-extrabold tracking-wider text-white shadow-sm transition-transform group-hover:scale-[1.03]">
            PATRONATO
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-white">
              Tests de Inglés
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Suboficiales 2026 • Corte 70%
            </p>
          </div>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {(
            [
              ['dashboard', 'Inicio'],
              ['topics', 'Temario'],
              ['history', 'Histórico'],
              ['analytics', 'Progreso 70%'],
            ] as Array<[AppView, string]>
          ).map(([target, label]) => {
            const active = view === target || (target === 'history' && view === 'history-detail');
            return (
              <button
                key={target}
                type="button"
                onClick={() => onNavigate(target)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${syncMeta.cls}`}
            title={`Sincronización automática (${syncMeta.label})`}
          >
            {syncMeta.icon}
            <span className="hidden sm:inline">{syncMeta.label}</span>
          </span>

          <button
            type="button"
            onClick={onOpenProfileModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Configurar perfil de sincronización en nube"
          >
            <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline max-w-[90px] truncate">
              {profileCode === 'master' ? 'Perfil' : profileCode}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="inline-flex md:hidden items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
            title="Progreso y Analítica"
          >
            <BarChart3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="hidden sm:inline-flex md:hidden items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-1.5 text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
