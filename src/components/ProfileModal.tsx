import { useState } from 'react';
import { UserCheck, X } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  currentCode: string;
  onClose: () => void;
  onSaveCode: (newCode: string) => void;
}

export function ProfileModal({ open, currentCode, onClose, onSaveCode }: ProfileModalProps) {
  const [draft, setDraft] = useState(currentCode);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Perfil de Sincronización en Nube
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Por defecto se usa el perfil compartido <code>master</code>. Si compartes la URL de Vercel con otros compañeros, introduce tu propio alias (por ejemplo <code>sargento-juan</code>) para aislar tu progreso entre tu PC y tu móvil.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveCode(draft);
            onClose();
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="master o tu-alias-unico"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
            >
              Guardar y Sincronizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
