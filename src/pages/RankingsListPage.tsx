import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rankingsApi, type RankingsFilter } from '@/api/endpoints';
import { useMeta } from '@/hooks/useMeta';
import { TypeBadge, StatusDot } from '@/ui/Badge';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@/ui/Icons';
import { CreateRankingModal } from './CreateRankingModal';
import type { RankingType, RankingSummary } from '@/types';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { SegmentedControl, type Segment } from '@/ui/SegmentedControl';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';


export function RankingsListPage() {
  const meta = useMeta();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | RankingType>('all');
  const tabs: Segment<'all' | RankingType>[] = useMemo(() => {
    const fromMeta = (meta.data?.ranking_types || []).map(t => ({
      id: t.id as RankingType, label: t.label,
    }));
    return [{ id: 'all', label: 'Todos' }, ...fromMeta];
  }, [meta.data]);
  const [country, setCountry] = useState('');
  const [ageBracket, setAgeBracket] = useState('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [search, setSearch] = useState('');
  const [openCreate, setOpenCreate] = useState(false);

  const filter: RankingsFilter = useMemo(() => ({
    ranking_type: tab === 'all' ? undefined : tab,
    country: country || undefined,
    age_bracket: ageBracket || undefined,
    is_active: active === '' ? undefined : active === 'true',
  }), [tab, country, ageBracket, active]);

  const q = useQuery({
    queryKey: ['rankings', filter],
    queryFn: () => rankingsApi.list(filter),
  });

  const rankings = useMemo(() => {
    const list = q.data?.rankings || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter(r => r.display_name.toLowerCase().includes(s));
  }, [q.data, search]);

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      rankingsApi.patch(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rankings'] }),
    onError: (e) => toast.error(e),
  });

  const remove = useMutation({
    mutationFn: (id: string) => rankingsApi.remove(id),
    onSuccess: (d) => {
      toast.success(`Ranking eliminado (${d.recalculated_athletes} atletas recalculados)`);
      qc.invalidateQueries({ queryKey: ['rankings'] });
    },
    onError: (e) => toast.error(e),
  });

  const onDelete = async (r: RankingSummary) => {
    const ok = await confirm({
      title: 'Eliminar ranking',
      message: (
        <>
          Se eliminará <strong>{r.display_name}</strong> y todas sus entradas.
          Los atletas vinculados serán recalculados. Esta acción no se puede deshacer.
        </>
      ),
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) remove.mutate(r.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display">Rankings</h1>
          <p className="text-[13px] text-white/50 mt-2 max-w-lg">
            Los tableros que alimentan el onboarding. El OVR lo calcula el servidor.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpenCreate(true)}>
          <IconPlus size={16} /> Nuevo ranking
        </button>
      </div>

      <SegmentedControl<'all' | RankingType>
        segments={tabs}
        value={tab}
        onChange={setTab}
        ariaLabel="Tipo de ranking"
      />

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Buscar</label>
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="input pl-8"
              placeholder="Nombre del ranking…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {(tab === 'all' || tab === 'national' || tab === 'country_open') && (
          <div className="min-w-[180px]">
            <label className="label">País</label>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Todos</option>
              {meta.data?.countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {(tab === 'all' || tab === 'national') && (
          <div className="min-w-[180px]">
            <label className="label">Categoría</label>
            <select className="input" value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)}>
              <option value="">Todas</option>
              {meta.data?.age_brackets.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="min-w-[140px]">
          <label className="label">Estado</label>
          <select className="input" value={active} onChange={(e) => setActive(e.target.value as any)}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th w-8"></th>
              <th className="th">Nombre</th>
              <th className="th">Tipo</th>
              <th className="th">Contexto</th>
              <th className="th text-right">Entradas</th>
              <th className="th text-right">Vinculados</th>
              <th className="th">Activo</th>
              <th className="th text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <SkeletonRows rows={6} cols={8} colSpans={['12px','60%','40%','50%','30%','30%','40%','40%']} />}
            {q.isError && (
              <tr><td className="td text-red-300" colSpan={8}>
                {(q.error as Error).message}
              </td></tr>
            )}
            {!q.isLoading && rankings.length === 0 && (
              <tr><td colSpan={8}>
                <EmptyState
                  compact
                  title="Sin rankings con los filtros seleccionados"
                  hint="Cambia los filtros o crea el primero."
                  action={
                    <button className="btn-primary" onClick={() => setOpenCreate(true)}>
                      <IconPlus size={16} /> Nuevo ranking
                    </button>
                  }
                />
              </td></tr>
            )}
            {rankings.map(r => (
              <tr key={r.id} className="hover:bg-white/[.02]">
                <td className="td"><StatusDot active={r.is_active} /></td>
                <td className="td">
                  <Link to={`/rankings/${r.id}`} className="hover:text-nova-cyan">
                    {r.display_name}
                  </Link>
                </td>
                <td className="td">
                  <TypeBadge type={r.ranking_type} label={r.ranking_type_label} />
                </td>
                <td className="td text-white/70">
                  {r.ranking_type === 'national'
                    ? `${r.country || '—'} · ${r.age_bracket_label || r.age_bracket || '—'}`
                    : r.ranking_type === 'country_open'
                    ? (r.country || '—')
                    : r.ranking_type === 'fip_promises'
                    ? (r.fip_sub_category || '—')
                    : '—'}
                </td>
                <td className="td text-right tabular-nums">{r.entry_count ?? 0}</td>
                <td className="td text-right tabular-nums">{r.matched_count ?? 0}</td>
                <td className="td">
                  <Toggle
                    checked={r.is_active}
                    onChange={(v) => toggleActive.mutate({ id: r.id, is_active: v })}
                  />
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <Link to={`/rankings/${r.id}`} className="btn-ghost !px-2 !py-1" title="Editar">
                      <IconEdit size={14} />
                    </Link>
                    <button
                      className="btn-ghost !px-2 !py-1 text-red-300"
                      title="Eliminar"
                      onClick={() => onDelete(r)}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateRankingModal open={openCreate} onClose={() => setOpenCreate(false)} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' +
        (checked ? 'bg-nova-cyan/60' : 'bg-white/15')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0.5')
        }
      />
    </button>
  );
}
