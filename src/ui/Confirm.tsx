import { useState, useCallback, createContext, useContext } from 'react';
import { Modal } from './Modal';

type ConfirmOptions = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Ctx = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<Ctx | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    opts: ConfirmOptions;
    resolve?: (v: boolean) => void;
  }>({ open: false, opts: { title: '', message: '' } });

  const confirm = useCallback<Ctx>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, resolve });
    });
  }, []);

  const close = (v: boolean) => {
    state.resolve?.(v);
    setState({ open: false, opts: { title: '', message: '' } });
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={state.open} onClose={() => close(false)} title={state.opts.title}>
        <div className="text-sm text-white/80 mb-4">{state.opts.message}</div>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={() => close(false)}>
            {state.opts.cancelLabel || 'Cancelar'}
          </button>
          <button
            className={state.opts.danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => close(true)}
          >
            {state.opts.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const v = useContext(ConfirmCtx);
  if (!v) throw new Error('useConfirm outside provider');
  return v;
}
