import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
};

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="overlay-scrim absolute inset-0" onClick={onClose} />
      <div className={`overlay-surface relative w-full ${width} card p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <button
            className="btn-ghost !px-2 !py-2 -mr-2"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
