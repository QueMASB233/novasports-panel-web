import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/ui/Modal';
import { usersApi } from '@/api/endpoints';
import { useToast } from '@/ui/Toast';
import type { PillarSeedFieldState, PillarSeedPatchBody, PillarSeedState, UserRow } from '@/types';

type FieldKey = 'phys' | 'tech' | 'tact' | 'ment' | 'aerial' | 'volley' | 'consistency';

const FIELDS: { key: FieldKey; label: string; group: 'pillar' | 'skill' }[] = [
  { key: 'phys', label: 'Físico', group: 'pillar' },
  { key: 'tech', label: 'Técnico', group: 'pillar' },
  { key: 'tact', label: 'Táctico', group: 'pillar' },
  { key: 'ment', label: 'Mental', group: 'pillar' },
  { key: 'aerial', label: 'Aéreo', group: 'skill' },
  { key: 'volley', label: 'Volea', group: 'skill' },
  { key: 'consistency', label: 'Consistencia', group: 'skill' },
];

function fieldState(seed: PillarSeedState | undefined, key: FieldKey): PillarSeedFieldState | null {
  if (!seed) return null;
  if (key === 'aerial' || key === 'volley' || key === 'consistency') return seed[key];
  return seed.pillars[key];
}

function originLabel(origin: PillarSeedFieldState['origin']): string {
  if (origin === 'coach') return 'Eval coach';
  if (origin === 'admin_seed') return 'Seed admin';
  if (origin === 'self') return 'Autoevaluación';
  return 'Sin dato';
}

function sanitizeScoreInput(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, 3);
}

function parseScore(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0 || n > 100) return undefined;
  return n;
}

export function UserPillarSeedModal({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    phys: '',
    tech: '',
    tact: '',
    ment: '',
    aerial: '',
    volley: '',
    consistency: '',
  });
  const [clearAll, setClearAll] = useState(false);

  const query = useQuery({
    queryKey: ['user-pillar-seed', user?.id],
    queryFn: () => usersApi.getPillarSeed(user!.id),
    enabled: !!user,
  });

  const seed = query.data?.seed;

  useEffect(() => {
    if (!seed) return;
    setClearAll(false);
    setValues({
      phys: seed.pillars.phys.value != null ? String(seed.pillars.phys.value) : '',
      tech: seed.pillars.tech.value != null ? String(seed.pillars.tech.value) : '',
      tact: seed.pillars.tact.value != null ? String(seed.pillars.tact.value) : '',
      ment: seed.pillars.ment.value != null ? String(seed.pillars.ment.value) : '',
      aerial: seed.aerial.value != null ? String(seed.aerial.value) : '',
      volley: seed.volley.value != null ? String(seed.volley.value) : '',
      consistency: seed.consistency.value != null ? String(seed.consistency.value) : '',
    });
  }, [seed]);

  const mutate = useMutation({
    mutationFn: () => {
      if (clearAll) {
        return usersApi.patchPillarSeed(user!.id, { clear_all: true });
      }
      const body: PillarSeedPatchBody = {};
      for (const { key } of FIELDS) {
        const st = fieldState(seed, key);
        if (st?.locked) continue;
        const parsed = parseScore(values[key]);
        if (parsed === undefined) {
          throw new Error(`${FIELDS.find((f) => f.key === key)?.label || key}: usa un entero 0–100`);
        }
        // Solo enviar campos que cambiaron. Vacío en un campo ya vacío no debe
        // mandar null (limpiaba skills y, con tech bloqueado, abortaba phys/tact/ment).
        const current = st?.value ?? null;
        if (parsed === current) continue;
        body[key] = parsed;
      }
      if (
        body.phys === undefined &&
        body.tech === undefined &&
        body.tact === undefined &&
        body.ment === undefined &&
        body.aerial === undefined &&
        body.volley === undefined &&
        body.consistency === undefined
      ) {
        throw new Error('No hay cambios para guardar');
      }
      return usersApi.patchPillarSeed(user!.id, body);
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Seed de pilares guardado');
      qc.invalidateQueries({ queryKey: ['user-pillar-seed', user?.id] });
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const unlockedCount = useMemo(() => {
    if (!seed) return 0;
    return FIELDS.filter((f) => !fieldState(seed, f.key)?.locked).length;
  }, [seed]);

  const canSubmit = !!user && !query.isLoading && !query.isError && (clearAll || unlockedCount > 0);

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Pilares — ${user?.full_name || user?.email || ''}`}
      width="max-w-xl"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mutate.mutate();
        }}
      >
        <p className="text-xs text-white/60 leading-relaxed">
          Eval coach, seed admin, autoevaluación o vacío. El ranking solo (ceros de ficha) no aparece.
          No cambia el OVR ni cuenta para logros. Vaciar un campo (si no está bloqueado) limpia ese
          seed; limpiar todo no borra la autoevaluación.
        </p>

        {query.isLoading && (
          <div className="text-sm text-white/50 py-6 text-center">Cargando pilares…</div>
        )}

        {query.isError && (
          <div className="text-sm text-red-200/90 border border-red-500/30 rounded-lg px-3 py-2">
            {(query.error as Error)?.message || 'No se pudo cargar el estado de pilares'}
          </div>
        )}

        {seed && (
          <>
            <div className="text-[11px] text-white/45">
              OVR actual: <span className="text-white/70">{seed.overall_rating ?? '—'}</span>
              {seed.ovr_source ? <> · fuente {seed.ovr_source}</> : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(({ key, label, group }) => {
                const st = fieldState(seed, key)!;
                const locked = st.locked;
                return (
                  <div key={key} className={group === 'skill' ? 'col-span-1' : undefined}>
                    <label className="label flex items-center justify-between gap-2">
                      <span>{label}</span>
                      <span
                        className={
                          'text-[10px] font-normal ' +
                          (locked
                            ? 'text-amber-300/90'
                            : st.origin === 'admin_seed'
                              ? 'text-nova-cyan'
                              : st.origin === 'self'
                                ? 'text-white/55'
                                : 'text-white/40')
                        }
                      >
                        {locked ? 'Bloqueado · eval coach' : originLabel(st.origin)}
                      </span>
                    </label>
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder={locked ? '—' : '0–100'}
                      value={values[key]}
                      disabled={locked || clearAll}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [key]: sanitizeScoreInput(e.target.value),
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            <label className="flex items-start gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                className="mt-1"
                checked={clearAll}
                disabled={unlockedCount === 0}
                onChange={(e) => setClearAll(e.target.checked)}
              />
              <span>
                Limpiar todos los seeds admin (no toca pilares con evaluación de coach)
                {unlockedCount === 0 && (
                  <span className="block text-xs text-white/40 mt-0.5">
                    Este jugador ya tiene eval de coach en todos los pilares tocables.
                  </span>
                )}
              </span>
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!canSubmit || mutate.isPending}>
            {mutate.isPending ? 'Guardando…' : clearAll ? 'Limpiar seeds' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
