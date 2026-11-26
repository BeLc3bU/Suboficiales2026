import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function PwaReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-xl md:bottom-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">
        {needRefresh
          ? 'Nueva versión de PATRONATO 2026 disponible.'
          : 'Aplicación lista para trabajar sin conexión.'}
      </div>
      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setOfflineReady(false);
          setNeedRefresh(false);
        }}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
