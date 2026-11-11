import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rankingsApi, type RankingsFilter } from '@/api/endpoints';
import { useMeta } from '@/hooks/useMeta';
import { TypeBadge, StatusDot } from '@/ui/Badge';
import { IconEdit, IconGrip, IconPlus, IconSearch, IconTrash } from '@/ui/Icons';
import { CreateRankingModal } from './CreateRankingModal';
import type { RankingType, RankingSummary } from '@/types';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { SegmentedControl, type Segment } from '@/ui/SegmentedControl';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { RankingLogoCell } from '@/ui/RankingLogoThumb';

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
  const [ordered, setOrdered] = useState<RankingSummary[]>([]);

  const filter: RankingsFilter = useMemo(() => ({
    ranking_type: tab === 'all' ? undefined : tab,
    country: country || undefined,
    age_bracket: ageBracket || undefined,
    is_active: active === '' ? undefined : active === 'true',
  }), [tab, country, ageBracket, active]);

  const canReorder = useMemo(() => {
    if (tab === 'all') return false;
    if (search.trim()) return false;
    if (country) return false;
    if (ageBracket) return false;
    if (active !== '') return false;
    return true;
  }, [tab, search, country, ageBracket, active]);

  const reorderHint = useMemo(() => {
    if (canReorder) {
      return 'Arrastra las filas para definir el orden en la app (1 = primero en las pills).';
    }
    if (tab === 'all') {
      return 'Elige un tipo de ranking para poder arrastrar y ordenar.';
    }
    if (search.trim() || country || ageBracket || active !== '') {
      return 'Quita búsqueda y filtros (país, categoría, estado) para reordenar todo el tipo.';
    }
    return null;
  }, [canReorder, tab, search, country, ageBracket, active]);

  const q = useQuery({
    queryKey: ['rankings', filter],
    queryFn: () => rankingsApi.list(filter),
  });

  const serverList = useMemo(() => {
    const list = q.data?.rankings || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter(r => r.display_name.toLowerCase().includes(s));
  }, [q.data, search]);

  useEffect(() => {
    setOrdered(serverList);
  }, [serverList]);

  const rankings = canReorder ? ordered : serverList;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const reorder = useMutation({
    mutationFn: (ordered_ids: string[]) => {
      if (tab === 'all') throw new Error('Elige un tipo para reordenar');
      return rankingsApi.reorder({
        ranking_type: tab,
        ordered_ids,
      });
    },
    onSuccess: (data) => {
      setOrdered(data.rankings);
      qc.setQueryData(['rankings', filter], { rankings: data.rankings });
      toast.success('Orden guardado');
    },
    onError: (e) => {
      setOrdered(serverList);
      toast.error(e);
    },
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

  const onDragEnd = (event: DragEndEvent) => {
    if (!canReorder || reorder.isPending) return;
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    const oldIndex = ordered.findIndex(r => r.id === dragActive.id);
    const newIndex = ordered.findIndex(r => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    reorder.mutate(next.map(r => r.id));
  };

  const colCount = canReorder ? 10 : 9;

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

      {reorderHint && (
        <p className={`text-[12px] ${canReorder ? 'text-nova-cyan/80' : 'text-white/40'}`}>
          {reorderHint}
          {reorder.isPending ? ' Guardando…' : null}
        </p>
      )}

      <div className="card overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <table className="w-full">
            <thead className="bg-white/[.02]">
              <tr>
                {canReorder && <th className="th w-10" aria-label="Orden" />}
                <th className="th w-8"></th>
                <th className="th w-10" aria-label="Logo"></th>
                <th className="th">Nombre</th>
                <th className="th">Tipo</th>
                <th className="th">Contexto</th>
                <th className="th text-right">Entradas</th>
                <th className="th text-right">Vinculados</th>
                <th className="th">Activo</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <SortableContext
              items={rankings.map(r => r.id)}
              strategy={verticalListSortingStrategy}
              disabled={!canReorder || reorder.isPending}
            >
              <tbody>
                {q.isLoading && (
                  <SkeletonRows
                    rows={6}
                    cols={colCount}
                    colSpans={
                      canReorder
                        ? ['24px', '12px', '28px', '55%', '40%', '50%', '30%', '30%', '40%', '40%']
                        : ['12px', '28px', '55%', '40%', '50%', '30%', '30%', '40%', '40%']
                    }
                  />
                )}
                {q.isError && (
                  <tr><td className="td text-red-300" colSpan={colCount}>
                    {(q.error as Error).message}
                  </td></tr>
                )}
                {!q.isLoading && rankings.length === 0 && (
                  <tr><td colSpan={colCount}>
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
                {rankings.map((r, index) => (
                  <RankingRow
                    key={r.id}
                    ranking={r}
                    index={index}
                    sortable={canReorder}
                    draggingDisabled={reorder.isPending}
                    onToggleActive={(v) => toggleActive.mutate({ id: r.id, is_active: v })}
                    onDelete={() => onDelete(r)}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      <CreateRankingModal open={openCreate} onClose={() => setOpenCreate(false)} />
    </div>
  );
}

function RankingRow({
  ranking: r,
  index,
  sortable,
  draggingDisabled,
  onToggleActive,
  onDelete,
}: {
  ranking: RankingSummary;
  index: number;
  sortable: boolean;
  draggingDisabled: boolean;
  onToggleActive: (v: boolean) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: r.id, disabled: !sortable || draggingDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-white/[.02] ${isDragging ? 'bg-white/[.04] relative z-10' : ''}`}
    >
      {sortable && (
        <td className="td">
          <button
            type="button"
            className="btn-ghost !px-1.5 !py-1 cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70"
            title={`Posición ${index + 1}. Arrastra para reordenar`}
            aria-label={`Arrastrar ${r.display_name}`}
            disabled={draggingDisabled}
            {...attributes}
            {...listeners}
          >
            <span className="inline-flex items-center gap-1 tabular-nums text-[11px]">
              <IconGrip size={14} />
              {index + 1}
            </span>
          </button>
        </td>
      )}
      <td className="td"><StatusDot active={r.is_active} /></td>
      <td className="td">
        <RankingLogoCell url={r.logo_url} size={28} />
      </td>
      <td className="td">
        <Link to={`/rankings/${r.id}`} className="hover:text-nova-cyan">
          {r.display_name}
        </Link>
        {r.gender_label && (
          <div className="text-[11px] text-white/50">{r.gender_label}</div>
        )}
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
        <Toggle checked={r.is_active} onChange={onToggleActive} />
      </td>
      <td className="td">
        <div className="flex justify-end gap-1">
          <Link to={`/rankings/${r.id}`} className="btn-ghost !px-2 !py-1" title="Editar">
            <IconEdit size={14} />
          </Link>
          <button
            className="btn-ghost !px-2 !py-1 text-red-300"
            title="Eliminar"
            onClick={onDelete}
          >
            <IconTrash size={14} />
          </button>
        </div>
      </td>
    </tr>
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
