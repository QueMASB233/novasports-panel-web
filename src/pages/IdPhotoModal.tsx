import { useEffect, useState } from 'react';
import { entriesApi } from '@/api/endpoints';
import { Modal } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';

type Props = {
  entryId: string | null;
  playerName?: string;
  onClose: () => void;
};

type Data = {
  signed_url: string;
  uploaded_at: string | null;
  expires_at: number; // ms epoch
};

export function IdPhotoModal({ entryId, playerName, onClose }: Props) {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entryId) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    setData(null);
    entriesApi.idPhoto(entryId)
      .then(r => {
        if (cancelled) return;
        setData({
          signed_url: r.signed_url,
          uploaded_at: r.uploaded_at ?? null,
          expires_at: Date.now() + (r.expires_in ?? 120) * 1000,
        });
      })
      .catch(e => { if (!cancelled) toast.error(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entryId, toast]);

  return (
    <Modal
      open={!!entryId}
      onClose={onClose}
      title={`Foto de identificación${playerName ? ` — ${playerName}` : ''}`}
      width="max-w-2xl"
    >
      {loading && <div className="text-white/50 text-sm">Cargando foto…</div>}

      {data && (
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-black overflow-hidden flex items-center justify-center">
            <img
              src={data.signed_url}
              alt="Documento de identificación"
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-white/60">
            <div>
              Subida:{' '}
              <span className="text-white/80">
                {data.uploaded_at ? new Date(data.uploaded_at).toLocaleString() : '—'}
              </span>
            </div>
            <div>
              La URL firmada expira en 2 minutos. No se guarda en caché.
            </div>
          </div>
        </div>
      )}

      {!loading && !data && entryId && (
        <div className="text-white/50 text-sm">No se pudo obtener la foto.</div>
      )}
    </Modal>
  );
}
