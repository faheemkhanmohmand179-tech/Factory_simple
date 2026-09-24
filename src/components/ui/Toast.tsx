import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Info, Trash2, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'discard';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastApi {
  push: (msg: string, type?: ToastType, action?: ToastAction, ms?: number) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  discard: (msg: string) => void;
}

const Ctx = createContext<ToastApi>({
  push: () => undefined,
  success: () => undefined,
  error: () => undefined,
  info: () => undefined,
  discard: () => undefined
});

const STYLES: Record<ToastType, string> = {
  success: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  error: 'bg-gradient-to-r from-rose-500 to-red-500',
  info: 'bg-gradient-to-r from-cyan-500 to-cyan-500',
  discard: 'bg-gradient-to-r from-stone-500 to-stone-600'
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (msg: string, type: ToastType = 'info', action?: ToastAction, ms = 2600) => {
      const id = nextId.current++;
      setItems((arr) => [...arr.slice(-3), { id, msg, type, action }]);
      window.setTimeout(() => dismiss(id), action ? 8000 : ms);
    },
    [dismiss]
  );

  const api: ToastApi = {
    push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
    discard: (m) => push(m, 'discard')
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Toasts float above EVERYTHING, including modals */}
      <div className="fixed top-3 inset-x-0 z-[10050] flex flex-col items-center gap-2 px-3 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast-item pointer-events-auto max-w-md w-auto flex items-center gap-3 ${STYLES[t.type]} text-white rounded-2xl px-4 py-3 shadow-2xl font-semibold text-sm`}
          >
            <span className="h-7 w-7 shrink-0 rounded-full bg-white/25 grid place-items-center">
              {t.type === 'success' ? <Check className="h-4 w-4" /> : t.type === 'error' ? <X className="h-4 w-4" /> : t.type === 'discard' ? <Trash2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </span>
            <span className="leading-snug">{t.msg}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-xl bg-white/90 text-stone-900 px-3 py-1.5 text-xs font-extrabold hover:bg-white active:scale-95 transition"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} className="shrink-0 h-7 w-7 grid place-items-center rounded-full hover:bg-white/20 transition" aria-label="close">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
