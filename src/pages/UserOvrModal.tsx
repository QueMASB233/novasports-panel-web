import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/ui/Modal';
import { usersApi } from '@/api/endpoints';
import { useToast } from '@/ui/Toast';
import type { UserRow } from '@/types';

export function UserOvrModal({
  user, onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [ovr, setOvr] = useState('');
  const [clear, setClear] = useState(false);

  useEffect(() => {
    if (user) {
      setOvr(user.overall_rating_override != null ? String(user.overall_rating_override) : '');
      setClear(false);
    }
  }, [user]);

  const mutate = useMutation({
    mutationFn: () => {
      if (clear) return usersApi.patchOvr(user!.id, { clear_override: true });
      return usersApi.patchOvr(user!.id, { overall_rating: Number(ovr) });
    },
    onSuccess: () => {
      toast.success('OVR actualizado');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const canSubmit = user && (clear || (ovr.trim() && Number.isFinite(Number(ovr))));

  return (
    <Modal open={!!user} onClose={onClose} title={`OVR — ${user?.full_name || user?.email || ''}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutate.mutate(); }}
      >
        <div className="text-xs text-white/60">
          OVR calculado actual: <span className="text-white">{user?.overall_rating ?? '—'}</span>
          {user?.overall_rating_override != null && (
            <> · Override activo: <span className="text-nova-cyan">{user.overall_rating_override}</span></>
          )}
        </div>

        <div>
          <label className="label">Override manual</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="p.ej. 82"
            value={ovr}
            disabled={clear}
            onChange={(e) => setOvr(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} />
          Eliminar override (volver al OVR calculado)
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!canSubmit || mutate.isPending}>
            {mutate.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
