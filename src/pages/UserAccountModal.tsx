import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/ui/Modal';
import { usersApi } from '@/api/endpoints';
import { useToast } from '@/ui/Toast';
import type { AccountStatus, UserRow } from '@/types';

const OPTIONS: { id: AccountStatus; label: string; hint: string }[] = [
  { id: 'active', label: 'Activa', hint: 'La cuenta puede usar la app normalmente.' },
  { id: 'suspended', label: 'Suspendida', hint: 'Bloqueo temporal — requiere fecha fin.' },
  { id: 'banned', label: 'Baneada', hint: 'Bloqueo permanente por violación de términos.' },
  { id: 'blocked', label: 'Bloqueada', hint: 'Bloqueo administrativo (por seguridad, verificación, etc.).' },
];

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function UserAccountModal({
  user, onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<AccountStatus>('active');
  const [reason, setReason] = useState('');
  const [suspendedUntil, setSuspendedUntil] = useState('');

  useEffect(() => {
    if (user) {
      setStatus(user.account_status || 'active');
      setReason(user.account_status_reason || '');
      setSuspendedUntil(toDatetimeLocal(user.suspended_until));
    }
  }, [user]);

  const mutate = useMutation({
    mutationFn: () => {
      const body: any = { status };
      if (reason.trim()) body.reason = reason.trim();
      if (status === 'suspended') {
        body.suspended_until = new Date(suspendedUntil).toISOString();
      }
      return usersApi.patchAccount(user!.id, body);
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const canSubmit = user && (status !== 'suspended' || !!suspendedUntil);

  return (
    <Modal open={!!user} onClose={onClose} title={`Estado de cuenta — ${user?.full_name || user?.email || ''}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutate.mutate(); }}
      >
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map(o => (
            <button
              key={o.id} type="button"
              onClick={() => setStatus(o.id)}
              className={
                'rounded-md border px-3 py-2 text-left ' +
                (status === o.id
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-line bg-night-800 text-white/70 hover:bg-night-700')
              }
            >
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-[11px] text-white/50 mt-0.5">{o.hint}</div>
            </button>
          ))}
        </div>

        {status === 'suspended' && (
          <div>
            <label className="label">Suspendida hasta</label>
            <input
              type="datetime-local"
              className="input"
              value={suspendedUntil}
              onChange={(e) => setSuspendedUntil(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label className="label">Motivo (opcional)</label>
          <textarea
            className="input min-h-[80px] text-sm"
            placeholder="Descripción visible en logs"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!canSubmit || mutate.isPending}
          >
            {mutate.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
