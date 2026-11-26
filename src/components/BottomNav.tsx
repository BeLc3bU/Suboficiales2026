import { BarChart3, BookOpen, Brain, History, Home } from 'lucide-react';
import type { AppView } from '@/types';

interface BottomNavProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onStartSmartReview: () => void;
  errorCount: number;
}

export function BottomNav({ view, onNavigate, onStartSmartReview, errorCount }: BottomNavProps) {
  if (view === 'quiz') return null;

  const items: Array<{
    id: string;
    label: string;
    icon: typeof Home;
    active: boolean;
    badge?: number;
    onClick: () => void;
  }> = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: Home,
      active: view === 'dashboard',
      onClick: () => onNavigate('dashboard'),
    },
    {
      id: 'topics',
      label: 'Temario',
      icon: BookOpen,
      active: view === 'topics' || view === 'study-sheet',
      onClick: () => onNavigate('topics'),
    },
    {
      id: 'review',
      label: 'Repaso IA',
      icon: Brain,
      active: false,
      badge: errorCount > 0 ? errorCount : undefined,
      onClick: onStartSmartReview,
    },
    {
      id: 'history',
      label: 'Histórico',
      icon: History,
      active: view === 'history' || view === 'history-detail',
      onClick: () => onNavigate('history'),
    },
    {
      id: 'analytics',
      label: '70% APTO',
      icon: BarChart3,
      active: view === 'analytics',
      onClick: () => onNavigate('analytics'),
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#0f1626]/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Menú inferior móvil"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                item.active
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
