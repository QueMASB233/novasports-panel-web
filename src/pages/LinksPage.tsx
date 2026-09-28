import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { linksApi, rankingsApi, type LinksFilter } from '@/api/endpoints';
import { useMeta } from '@/hooks/useMeta';
import { TypeBadge } from '@/ui/Badge';
import { IconCheck, IconUnlink } from '@/ui/Icons';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { IdPhotoModal } from './IdPhotoModal';
import { SegmentedControl, type Segment } from '@/ui/SegmentedControl';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import type { LinkedEntry } from '@/types';

type Tab = 'pending' | 'confirmed' | 'all';

const TABS: Segment<Tab>[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'confirmed', label: 'Aprobados' },
  { id: 'all', label: 'Todos' },
];

export function LinksPage() {
  const meta = useMeta();
  const positionLabel = meta.data?.entry_columns?.find((c) => c.key === 'ranking_position')?.label;
  const [tab, setTab] = useState<Tab>('pending');
  const [rankingId, setRankingId] = useState('');
  const [photoEntry, setPhotoEntry] = useState<{ id: string; name: string } | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const rankings = useQuery({
    queryKey: ['rankings', {}],
    queryFn: () => rankingsApi.list({}),
  });

  const filter: LinksFilter = useMemo(() => ({
    status: tab,
    ranking_id: rankingId || undefined,
  }), [tab, rankingId]);

  const q = useQuery({
    queryKey: ['links-self', filter],
    queryFn: () => linksApi.listSelf(filter),
  });

  const approve = useMutation({
    mutationFn: (entryId: string) => linksApi.confirm(entryId),
    onSuccess: () => {
      toast.success('Vínculo aprobado');
      qc.invalidateQueries({ queryKey: ['links-self'] });
      qc.invalidateQueries({ queryKey: ['rankings'] });
    },
    onError: (e) => toast.error(e),
  });

  const unlink = useMutation({
    mutationFn: (entryId: string) => linksApi.unlink(entryId),
    onSuccess: () => {
      toast.success('Vínculo eliminado');
      qc.invalidateQueries({ queryKey: ['links-self'] });
      qc.invalidateQueries({ queryKey: ['rankings'] });
    },
    onError: (e) => toast.error(e),
  });

  const askApprove = async (l: LinkedEntry) => {
    const ok = await confirm({
      title: 'Aprobar vínculo',
      message: `Se confirmará la identidad de "${l.matched_athlete?.full_name || l.player_name}". El OVR de este ranking se aplica al confirmar.`,
      confirmLabel: 'Aprobar',
    });
    if (ok) approve.mutate(l.id);
  };

  const askUnlink = async (l: LinkedEntry) => {
    const name = l.matched_athlete?.full_name || l.player_name;
    const isPending = l.pending ?? (l.status === 'pending');
    const ok = await confirm({
      title: isPending ? 'Rechazar solicitud' : 'Revertir vínculo',
      message: isPending
        ? `Se eliminará la solicitud de "${name}". El jugador podrá volver a solicitarla.`
        : `Se romperá el vínculo con "${name}" y se recalculará su OVR.`,
      confirmLabel: isPending ? 'Rechazar' : 'Revertir',
      danger: true,
    });
    if (ok) unlink.mutate(l.id);
  };

  const links = q.data?.links || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display">Revisión de vínculos</h1>
        <p className="text-[13px] text-white/55 mt-2 max-w-lg">
          Verifica la identidad del jugador contra la entrada del ranking. Aprueba o rechaza.
        </p>
      </div>

      <SegmentedControl<Tab>
        segments={TABS.map(t => ({
          ...t,
          count: tab === t.id ? links.length : undefined,
        }))}
        value={tab}
        onChange={setTab}
        ariaLabel="Estado del vínculo"
      />

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[260px]">
          <label className="label">Ranking</label>
          <select
            className="input" value={rankingId}
            onChange={(e) => setRankingId(e.target.value)}
          >
            <option value="">Todos los rankings</option>
            {rankings.data?.rankings.map(r => (
              <option key={r.id} value={r.id}>{r.display_name}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-white/50 ml-auto">
          {q.isLoading ? 'Cargando…' : `${links.length} vínculo${links.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th">Jugador (app)</th>
              <th className="th">Entrada</th>
              <th className="th">Ranking</th>
              <th className="th w-28 text-right">{positionLabel || '…'}</th>
              <th className="th w-28">Estado</th>
              <th className="th w-32">Verificación</th>
              <th className="th w-40">Vinculado</th>
              <th className="th w-56 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <SkeletonRows rows={5} cols={8} colSpans={['70%','50%','60%','30%','40%','40%','60%','40%']} />}
            {q.isError && (
              <tr><td className="td text-red-300" colSpan={8}>{(q.error as Error).message}</td></tr>
            )}
            {!q.isLoading && links.length === 0 && (
              <tr><td colSpan={8}>
                <EmptyState
                  compact
                  title={
                    tab === 'pending'
                      ? 'Sin solicitudes pendientes'
                      : tab === 'confirmed'
                      ? 'Ningún vínculo confirmado'
                      : 'Sin vínculos'
                  }
                  hint={
                    tab === 'pending'
                      ? 'Cuando un jugador se vincule desde la app aparecerá aquí para revisión.'
                      : undefined
                  }
                />
              </td></tr>
            )}
            {links.map(l => {
              const isPending = l.pending ?? (l.status === 'pending');
              return (
                <tr key={l.id} className="hover:bg-white/[.02]">
                  <td className="td">
                    {l.matched_athlete ? (
                      <div className="flex items-center gap-2.5">
                        {l.matched_athlete.photo_url ? (
                          <img
                            src={l.matched_athlete.photo_url}
                            className="w-8 h-8 rounded-full object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10" />
                        )}
                        <div>
                          <div className="font-medium">{l.matched_athlete.full_name}</div>
                          <div className="text-[11px] text-white/50">
                            OVR {l.matched_athlete.overall_rating ?? '—'}
                          </div>
                        </div>
                      </div>
                    ) : <span className="text-white/40">—</span>}
                  </td>
                  <td className="td">
                    <div>{l.player_name}</div>
                    {l.country && <div className="text-[11px] text-white/50">{l.country}</div>}
                  </td>
                  <td className="td">
                    <div className="flex flex-col gap-1">
                      <Link to={`/rankings/${l.ranking_id}`} className="hover:text-white transition-colors">
                        {l.ranking_display_name}
                      </Link>
                      <TypeBadge type={l.ranking_type} label={l.ranking_type_label} />
                    </div>
                  </td>
                  <td className="td text-right tabular-nums">{l.ranking_position ?? '—'}</td>
                  <td className="td">
                    {isPending ? (
                      <span className="badge border border-amber-400/40 bg-amber-400/[.12] text-amber-200">
                        Pendiente
                      </span>
                    ) : (
                      <span className="badge border border-emerald-400/40 bg-emerald-400/[.12] text-emerald-200">
                        Aprobado
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {l.id_verification?.available ? (
                      <button
                        className="btn !py-1 text-xs"
                        onClick={() => setPhotoEntry({
                          id: l.id,
                          name: l.matched_athlete?.full_name || l.player_name,
                        })}
                      >
                        Ver foto
                      </button>
                    ) : (
                      <span className="badge border border-line bg-white/[.04] text-white/50">
                        Sin foto
                      </span>
                    )}
                  </td>
                  <td className="td text-[11px] text-white/60">
                    {l.linked_at ? new Date(l.linked_at).toLocaleString() : '—'}
                    {l.admin_verified_at && (
                      <div className="text-emerald-300/80 mt-0.5">
                        Aprobado: {new Date(l.admin_verified_at).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      {l.can_confirm && (
                        <button
                          className="btn-primary !py-1 !px-2.5 text-xs"
                          onClick={() => askApprove(l)}
                          disabled={approve.isPending}
                        >
                          <IconCheck size={13} /> Aprobar
                        </button>
                      )}
                      {(l.can_unlink ?? true) && (
                        <button
                          className="btn-danger !py-1 !px-2.5 text-xs"
                          onClick={() => askUnlink(l)}
                          disabled={unlink.isPending}
                        >
                          <IconUnlink size={13} />
                          {isPending ? 'Rechazar' : 'Revertir'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <IdPhotoModal
        entryId={photoEntry?.id ?? null}
        playerName={photoEntry?.name}
        onClose={() => setPhotoEntry(null)}
      />
    </div>
  );
}
