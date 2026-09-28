import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entriesApi, rankingsApi } from '@/api/endpoints';
import { useMeta } from '@/hooks/useMeta';
import { TypeBadge, StatusDot } from '@/ui/Badge';
import {
  IconCheck, IconChevronLeft, IconEdit, IconPlus, IconRefresh,
  IconSearch, IconTrash, IconUpload, IconX,
} from '@/ui/Icons';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import type { Entry, RankingSummary, RankingType } from '@/types';
import { ImportEntriesPanel } from './ImportEntriesPanel';

export function RankingEditorPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const meta = useMeta();

  const [search, setSearch] = useState('');
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const rq = useQuery({
    queryKey: ['ranking', id],
    queryFn: () => rankingsApi.get(id),
    enabled: !!id,
  });
  const eq = useQuery({
    queryKey: ['ranking-entries', id, { search, linkedOnly }],
    queryFn: () => entriesApi.list(id, {
      search: search || undefined,
      linked: linkedOnly || undefined,
    }),
    enabled: !!id,
  });

  const ranking = rq.data?.ranking;

  const patch = useMutation({
    mutationFn: (body: Parameters<typeof rankingsApi.patch>[1]) =>
      rankingsApi.patch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ranking', id] });
      qc.invalidateQueries({ queryKey: ['rankings'] });
    },
    onError: (e) => toast.error(e),
  });

  const recalc = useMutation({
    mutationFn: () => rankingsApi.recalc(id),
    onSuccess: (d) => toast.success(`OVR recalculado: ${d.recalculated_athletes} atletas`),
    onError: (e) => toast.error(e),
  });

  const remove = useMutation({
    mutationFn: () => rankingsApi.remove(id),
    onSuccess: (d) => {
      toast.success(`Ranking eliminado (${d.recalculated_athletes} atletas)`);
      qc.invalidateQueries({ queryKey: ['rankings'] });
      nav('/rankings');
    },
    onError: (e) => toast.error(e),
  });

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Eliminar ranking',
      message: 'Esta acción elimina el ranking y todas sus entradas, y recalcula el OVR de los atletas vinculados.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) remove.mutate();
  };

  if (rq.isLoading) return <div className="text-white/50 text-sm">Cargando…</div>;
  if (rq.isError || !ranking) {
    return (
      <div className="text-red-300 text-sm">
        {(rq.error as Error)?.message || 'Ranking no encontrado'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <Link to="/rankings" className="btn-ghost !px-2 !py-1">
          <IconChevronLeft size={14} /> Rankings
        </Link>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="min-w-0">
            {editingHeader ? (
              <HeaderEdit
                ranking={ranking}
                onCancel={() => setEditingHeader(false)}
                onSave={(body) => {
                  patch.mutate(body, { onSuccess: () => setEditingHeader(false) });
                }}
              />
            ) : (
              <>
                <h1 className="heading">{ranking.display_name}</h1>
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                  <TypeBadge type={ranking.ranking_type} label={ranking.ranking_type_label} />
                  {ranking.country && (
                    <span className="badge border border-line bg-white/5 text-white/70">
                      {ranking.country}
                    </span>
                  )}
                  {ranking.age_bracket_label && (
                    <span className="badge border border-line bg-white/5 text-white/70">
                      {ranking.age_bracket_label}
                    </span>
                  )}
                  {ranking.fip_sub_category && (
                    <span className="badge border border-line bg-white/5 text-white/70">
                      {ranking.fip_sub_category}
                    </span>
                  )}
                  <span className="badge border border-line bg-white/5 text-white/70">
                    {ranking.entry_count ?? 0} entradas
                  </span>
                  <span className="badge border border-line bg-white/5 text-white/70">
                    {ranking.matched_count ?? 0} vinculados
                  </span>
                </div>
                <button
                  className="btn-ghost mt-2 !px-2 !py-1 text-xs text-white/60"
                  onClick={() => setEditingHeader(true)}
                >
                  <IconEdit size={12} /> Editar detalles
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-2 text-xs text-white/70 px-2 py-1 border border-line rounded-md">
              <StatusDot active={ranking.is_active} />
              Activo
              <input
                type="checkbox" checked={ranking.is_active}
                onChange={(e) => patch.mutate({ is_active: e.target.checked })}
              />
            </label>
            <button className="btn" onClick={() => recalc.mutate()} disabled={recalc.isPending}>
              <IconRefresh size={14} /> {recalc.isPending ? 'Recalculando…' : 'Recalcular OVR'}
            </button>
            <button className="btn-danger" onClick={onDelete}>
              <IconTrash size={14} /> Eliminar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="label">Buscar</label>
              <div className="relative">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  className="input pl-8" placeholder="Jugador…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={linkedOnly}
                onChange={(e) => setLinkedOnly(e.target.checked)} />
              Solo vinculados
            </label>
            <div className="flex gap-2 ml-auto">
              <button className="btn" onClick={() => setShowAdd(true)}>
                <IconPlus size={14} /> Añadir
              </button>
              <button className="btn" onClick={() => setShowImport(v => !v)}>
                <IconUpload size={14} /> Importar
              </button>
            </div>
          </div>

          {showImport && (
            <ImportEntriesPanel
              rankingId={id}
              rankingType={ranking.ranking_type}
              onDone={() => setShowImport(false)}
            />
          )}

          {showAdd && (
            <AddEntryPanel
              rankingId={id}
              rankingType={ranking.ranking_type}
              onDone={() => setShowAdd(false)}
            />
          )}

          <EntriesTable
            entries={eq.data?.entries || []}
            loading={eq.isLoading}
            error={eq.error as Error | null}
            rankingId={id}
            rankingType={ranking.ranking_type}
          />
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
              Referencia OVR
            </div>
            <OvrReference
              rankingType={ranking.ranking_type}
              meta={meta.data?.ovr_reference}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------- header edit ----------
function HeaderEdit({
  ranking, onSave, onCancel,
}: {
  ranking: RankingSummary;
  onSave: (body: Parameters<typeof rankingsApi.patch>[1]) => void;
  onCancel: () => void;
}) {
  const meta = useMeta();
  const [displayName, setDisplayName] = useState(ranking.display_name);
  const [country, setCountry] = useState(ranking.country || '');
  const [ageBracket, setAgeBracket] = useState(ranking.age_bracket || '');
  const [fipSub, setFipSub] = useState(ranking.fip_sub_category || '');

  return (
    <form
      className="space-y-3 min-w-[300px]"
      onSubmit={(e) => {
        e.preventDefault();
        const body: any = { display_name: displayName.trim() };
        if (ranking.ranking_type === 'national') {
          body.country = country;
          body.age_bracket = ageBracket;
        }
        if (ranking.ranking_type === 'country_open') {
          body.country = country;
        }
        if (ranking.ranking_type === 'fip_promises') body.fip_sub_category = fipSub;
        onSave(body);
      }}
    >
      <div>
        <label className="label">Nombre</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      {ranking.ranking_type === 'national' && (
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">País…</option>
            {meta.data?.countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <select className="input" value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)}>
            <option value="">Categoría…</option>
            {meta.data?.age_brackets.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
      )}
      {ranking.ranking_type === 'country_open' && (
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">País…</option>
          {meta.data?.countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      )}
      {ranking.ranking_type === 'fip_promises' && (
        <select className="input" value={fipSub} onChange={(e) => setFipSub(e.target.value)}>
          <option value="">SUB…</option>
          {meta.data?.fip_sub_categories.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      )}
      <div className="flex gap-2">
        <button className="btn-primary"><IconCheck size={14} /> Guardar</button>
        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ---------- entries table ----------
function EntriesTable({
  entries, loading, error, rankingId, rankingType,
}: {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
  rankingId: string;
  rankingType: RankingType;
}) {
  const isNational = rankingType === 'national';
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const pa = a.ranking_position ?? 999999;
      const pb = b.ranking_position ?? 999999;
      return pa - pb;
    });
  }, [entries]);

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => entriesApi.patch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ranking-entries', rankingId] });
      qc.invalidateQueries({ queryKey: ['ranking', rankingId] });
      setEditingId(null);
    },
    onError: (e) => toast.error(e),
  });

  const remove = useMutation({
    mutationFn: (entryId: string) => entriesApi.remove(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ranking-entries', rankingId] });
      qc.invalidateQueries({ queryKey: ['ranking', rankingId] });
    },
    onError: (e) => toast.error(e),
  });

  const askDelete = async (e: Entry) => {
    const ok = await confirm({
      title: 'Eliminar entrada',
      message: `¿Eliminar "${e.player_name}" del ranking?`,
      confirmLabel: 'Eliminar', danger: true,
    });
    if (ok) remove.mutate(e.id);
  };

  const colSpan = isNational ? 7 : 6;
  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-white/[.02]">
          <tr>
            <th className="th w-16 text-right">#</th>
            <th className="th">Jugador</th>
            {isNational && <th className="th w-32">Categoría</th>}
            <th className="th w-24">País</th>
            <th className="th w-28 text-right">Puntos</th>
            <th className="th">Vínculo</th>
            <th className="th w-28 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td className="td text-white/50" colSpan={colSpan}>Cargando…</td></tr>}
          {error && <tr><td className="td text-red-300" colSpan={colSpan}>{error.message}</td></tr>}
          {!loading && sorted.length === 0 && (
            <tr><td className="td text-white/50" colSpan={colSpan}>
              Sin entradas. Añade una o importa una lista.
            </td></tr>
          )}
          {sorted.map(e => (
            editingId === e.id ? (
              <InlineEditRow
                key={e.id} entry={e}
                rankingType={rankingType}
                onCancel={() => setEditingId(null)}
                onSave={(body) => patch.mutate({ id: e.id, body })}
                saving={patch.isPending}
              />
            ) : (
              <tr key={e.id} className="hover:bg-white/[.02]">
                <td className="td text-right tabular-nums text-white/60">
                  {e.ranking_position ?? '—'}
                </td>
                <td className="td font-medium">{e.player_name}</td>
                {isNational && (
                  <td className="td text-white/70">
                    {e.national_category_label || e.national_category || '—'}
                  </td>
                )}
                <td className="td text-white/60">{e.country || '—'}</td>
                <td className="td text-right tabular-nums text-white/70">
                  {e.points ?? '—'}
                </td>
                <td className="td">
                  {e.matched_athlete ? (
                    <div className="flex items-center gap-2 text-xs">
                      {e.matched_athlete.photo_url ? (
                        <img
                          src={e.matched_athlete.photo_url}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10" />
                      )}
                      <div>
                        <div className="text-white flex items-center gap-1">
                          {e.matched_athlete.full_name}
                          {e.admin_verified && (
                            <span
                              className="badge border border-emerald-400/40 bg-emerald-400/[.12] text-emerald-200"
                              title="Verificado por admin"
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-white/50">
                          OVR {e.matched_athlete.overall_rating ?? '—'}
                          {e.linked_by_self && !e.admin_verified && (
                            <span className="ml-1 text-amber-300">· pendiente</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-white/40 text-xs">Sin vínculo</span>
                  )}
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost !px-2 !py-1" title="Editar"
                      onClick={() => setEditingId(e.id)}>
                      <IconEdit size={14} />
                    </button>
                    <button className="btn-ghost !px-2 !py-1 text-red-300" title="Eliminar"
                      onClick={() => askDelete(e)}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineEditRow({
  entry, rankingType, onCancel, onSave, saving,
}: {
  entry: Entry;
  rankingType: RankingType;
  onCancel: () => void;
  onSave: (body: {
    player_name: string; ranking_position: number;
    points?: number; country?: string; national_category?: string;
  }) => void;
  saving: boolean;
}) {
  const meta = useMeta();
  const isNational = rankingType === 'national';
  const [name, setName] = useState(entry.player_name);
  const [pos, setPos] = useState(String(entry.ranking_position ?? ''));
  const [country, setCountry] = useState(entry.country ?? '');
  const [points, setPoints] = useState(entry.points != null ? String(entry.points) : '');
  const [nationalCategory, setNationalCategory] = useState(entry.national_category ?? '');

  const save = () => {
    const p = Number(pos);
    if (!name.trim() || !Number.isFinite(p)) return;
    if (isNational && !nationalCategory) return;
    const body: any = { player_name: name.trim(), ranking_position: p };
    if (country.trim()) body.country = country.trim().toUpperCase();
    if (isNational) {
      body.national_category = nationalCategory;
    } else if (points.trim()) {
      body.points = Number(points);
    }
    onSave(body);
  };

  return (
    <tr className="bg-white/[.02]">
      <td className="td">
        <input className="input !py-1 !px-2 w-16 text-right" value={pos}
          onChange={(e) => setPos(e.target.value.replace(/[^0-9]/g, ''))} />
      </td>
      <td className="td">
        <input className="input !py-1 !px-2" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      {isNational && (
        <td className="td">
          <select
            className="input !py-1 !px-2"
            value={nationalCategory}
            onChange={(e) => setNationalCategory(e.target.value)}
          >
            <option value="">—</option>
            {meta.data?.national_categories?.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </td>
      )}
      <td className="td">
        <input className="input !py-1 !px-2 w-20 uppercase" value={country}
          onChange={(e) => setCountry(e.target.value)} maxLength={3} />
      </td>
      <td className="td">
        {isNational ? (
          <span className="text-white/40 text-xs">—</span>
        ) : (
          <input className="input !py-1 !px-2 w-24 text-right" value={points}
            onChange={(e) => setPoints(e.target.value.replace(/[^0-9.]/g, ''))} />
        )}
      </td>
      <td className="td text-white/40">—</td>
      <td className="td">
        <div className="flex justify-end gap-1">
          <button className="btn-primary !px-2 !py-1" onClick={save} disabled={saving}>
            <IconCheck size={14} />
          </button>
          <button className="btn-ghost !px-2 !py-1" onClick={onCancel}>
            <IconX size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------- add entry ----------
function AddEntryPanel({
  rankingId, rankingType, onDone,
}: {
  rankingId: string;
  rankingType: RankingType;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const meta = useMeta();
  const isNational = rankingType === 'national';
  const [name, setName] = useState('');
  const [pos, setPos] = useState('');
  const [country, setCountry] = useState('');
  const [points, setPoints] = useState('');
  const [nationalCategory, setNationalCategory] = useState('');

  const create = useMutation({
    mutationFn: () => {
      const body: any = {
        player_name: name.trim(),
        ranking_position: Number(pos),
      };
      if (country.trim()) body.country = country.trim().toUpperCase();
      if (isNational) {
        body.national_category = nationalCategory;
      } else if (points.trim()) {
        body.points = Number(points);
      }
      return entriesApi.create(rankingId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ranking-entries', rankingId] });
      qc.invalidateQueries({ queryKey: ['ranking', rankingId] });
      toast.success('Entrada añadida');
      onDone();
    },
    onError: (e) => toast.error(e),
  });

  const canSubmit = name.trim() && pos && (!isNational || nationalCategory);

  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Añadir entrada</div>
      <div
        className={
          'grid grid-cols-1 gap-2 ' +
          (isNational
            ? 'sm:grid-cols-[80px_1fr_140px_80px_auto]'
            : 'sm:grid-cols-[80px_1fr_80px_100px_auto]')
        }
      >
        <input className="input" placeholder="#" value={pos}
          onChange={(e) => setPos(e.target.value.replace(/[^0-9]/g, ''))} />
        <input className="input" placeholder="Nombre del jugador" value={name}
          onChange={(e) => setName(e.target.value)} />
        {isNational && (
          <select
            className="input"
            value={nationalCategory}
            onChange={(e) => setNationalCategory(e.target.value)}
          >
            <option value="">Categoría…</option>
            {meta.data?.national_categories?.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        )}
        <input className="input uppercase" placeholder="País" maxLength={3} value={country}
          onChange={(e) => setCountry(e.target.value)} />
        {!isNational && (
          <input className="input" placeholder="Puntos" value={points}
            onChange={(e) => setPoints(e.target.value.replace(/[^0-9.]/g, ''))} />
        )}
        <div className="flex gap-2">
          <button
            className="btn-primary"
            onClick={() => canSubmit && create.mutate()}
            disabled={!canSubmit || create.isPending}
          >
            Añadir
          </button>
          <button className="btn" onClick={onDone}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ---------- OVR reference ----------
function OvrReference({
  rankingType, meta,
}: {
  rankingType: string;
  meta?: Record<string, { table: { max_position: number; ovr: number }[]; beyond: string }>;
}) {
  const ref = meta?.[rankingType];
  if (!ref) return <div className="text-white/40 text-xs">Sin referencia para este tipo.</div>;
  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="th text-left !py-1">Hasta puesto</th>
            <th className="th text-right !py-1">OVR</th>
          </tr>
        </thead>
        <tbody>
          {ref.table.map((r, i) => (
            <tr key={i}>
              <td className="td !py-1 text-white/70">≤ {r.max_position}</td>
              <td className="td !py-1 text-right tabular-nums font-semibold text-nova-cyan">
                {r.ovr}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-white/50 mt-2 leading-relaxed">{ref.beyond}</p>
    </div>
  );
}
