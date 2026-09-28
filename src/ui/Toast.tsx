import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; kind: 'info' | 'success' | 'error'; text: string };
type Ctx = {
  toasts: Toast[];
  push: (kind: Toast['kind'], text: string) => void;
  error: (e: unknown) => void;
  success: (text: string) => void;
};

const ToastCtx = createContext<Ctx | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const error = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    push('error', msg);
  }, [push]);
  const success = useCallback((text: string) => push('success', text), [push]);

  return (
    <ToastCtx.Provider value={{ toasts, push, error, success }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={
              'toast-item rounded-xl border px-3.5 py-2.5 text-[13px] leading-snug ' +
              'shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-10px_rgba(0,0,0,0.6)] ' +
              'backdrop-blur-xl ' +
              (t.kind === 'error'
                ? 'border-red-500/40 bg-red-500/[.12] text-red-100'
                : t.kind === 'success'
                ? 'border-emerald-400/40 bg-emerald-400/[.12] text-emerald-100'
                : 'border-white/10 bg-white/[.08] text-white/85')
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error('useToast outside provider');
  return v;
}
