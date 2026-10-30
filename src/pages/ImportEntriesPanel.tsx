import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entriesApi, rankingsApi } from '@/api/endpoints';
import { downloadFile } from '@/api/client';
import { useMeta } from '@/hooks/useMeta';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { IconCheck, IconRefresh, IconUpload, IconX } from '@/ui/Icons';
import type {
  ImportMode, ImportModeOption, ImportSummary, RankingEntryFormat, RankingType,
} from '@/types';

const FALLBACK_MODES: ImportModeOption[] = [
  { id: 'update', label: 'Actualizar ranking', description: '', default: true },
  { id: 'replace', label: 'Reemplazar todo', description: '', requires_confirmation: true },
  { id: 'append', label: 'Solo agregar', description: '' },
];

export function ImportEntriesPanel({
  rankingId, rankingType, entryFormat, onDone,
}: {
  rankingId: string;
  rankingType: RankingType;
  entryFormat?: RankingEntryFormat;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const meta = useMeta();
  const modes = meta.data?.import_modes?.length ? meta.data.import_modes : FALLBACK_MODES;
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>(
    () => modes.find((m) => m.default)?.id ?? 'update',
  );
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  // CSV + modo con los que se generó la vista previa: si cambian, hay que volver a generarla.
  const [previewKey, setPreviewKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentKey = `${mode}\u0000${csv}`;
  const previewFresh = !!preview && previewKey === currentKey;
  const modeOption = modes.find((m) => m.id === mode);

  const formats = meta.data?.csv_formats;
  const dashKey = rankingType.replace(/_/g, '-');
  const typeFormat =
    formats?.[rankingType]
    || formats?.[dashKey]
    || (rankingType === 'fip_promises' ? formats?.fip : undefined);
  const format = entryFormat
    ? {
        description: entryFormat.description,
        required_columns: entryFormat.required_columns,
        optional_columns: entryFormat.optional_columns,
        example_download_path: rankingsApi.csvExamplePath(rankingId),
        example_filename: entryFormat.uses_national_categories
          ? 'ranking-import-con-categoria.csv'
          : 'ranking-import-sin-categoria.csv',
        header: entryFormat.required_columns.join(','),
      }
    : typeFormat;
  const [downloading, setDownloading] = useState(false);

  const onDownloadExample = async () => {
    if (!format?.example_download_path || !format?.example_filename) return;
    setDownloading(true);
    try {
      await downloadFile(format.example_download_path, format.example_filename);
    } catch (e) {
      toast.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const runPreview = useMutation({
    mutationFn: () => entriesApi.importCsv(rankingId, { csv, mode, preview: true }),
    onMutate: () => setPreviewKey(currentKey),
    onSuccess: (d) => setPreview(d),
    onError: (e) => {
      setPreview(null);
      toast.error(e);
    },
  });

  const apply = useMutation({
    mutationFn: () => entriesApi.importCsv(rankingId, { csv, mode, preview: false }),
    onSuccess: (d) => {
      const c = d.counts;
      toast.success(
        `${d.mode_label}: ${c.updated} actualizadas, ${c.inserted} nuevas, ${c.removed} eliminadas. ` +
        `OVR recalculado a ${d.recalculated_athletes ?? d.recalculated_athlete_ids.length} atletas.`
      );
      qc.invalidateQueries({ queryKey: ['ranking-entries', rankingId] });
      qc.invalidateQueries({ queryKey: ['ranking', rankingId] });
      onDone();
    },
    onError: (e) => toast.error(e),
  });

  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.readAsText(f);
  };

  const onPreview = () => {
    if (!csv.trim()) return toast.push('error', 'Pega o carga un CSV');
    runPreview.mutate();
  };

  const onApply = async () => {
    if (!preview || !previewFresh || !preview.can_apply) return;
    const c = preview.counts;
    if (mode === 'replace' || modeOption?.requires_confirmation) {
      const ok = await confirm({
        title: 'Reemplazar todo',
        message:
          `Se borrarán las ${c.removed} entradas actuales y se importarán ${c.inserted}. ` +
          `${c.unlinked} jugador(es) vinculado(s) perderán el ranking y su verificación. ¿Continuar?`,
        confirmLabel: 'Reemplazar', danger: true,
      });
      if (!ok) return;
    } else if (c.unlinked > 0) {
      const ok = await confirm({
        title: 'Jugadores que pierden el ranking',
        message:
          `${c.unlinked} jugador(es) vinculado(s) no vienen en el CSV y perderán el ranking. ` +
          'Revisa la lista en la vista previa. ¿Aplicar igual?',
        confirmLabel: 'Aplicar', danger: true,
      });
      if (!ok) return;
    }
    apply.mutate();
  };

  const busy = runPreview.isPending || apply.isPending;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-white/50">
          Importar entradas desde CSV
        </div>
        <button className="btn-ghost !px-2 !py-1" onClick={onDone} title="Cerrar">
          <IconX size={14} />
        </button>
      </div>

      {format && (
        <div className="rounded-md border border-line bg-night-800 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Formato esperado
            </div>
            {format.example_download_path && format.example_filename && (
              <button
                type="button"
                className="btn !py-1 text-xs"
                onClick={onDownloadExample}
                disabled={downloading}
              >
                {downloading ? 'Descargando…' : 'Descargar CSV de ejemplo'}
              </button>
            )}
          </div>
          {format.description && (
            <div className="text-[12px] text-white/70 leading-relaxed">
              {format.description}
            </div>
          )}
          {format.required_columns && format.required_columns.length > 0 && (
            <div className="text-[11px] text-white/60">
              <span className="text-white/40">Obligatorias:</span>{' '}
              {format.required_columns.map(c => (
                <code key={c} className="text-white/85 mr-1">{c}</code>
              ))}
            </div>
          )}
          {format.optional_columns && format.optional_columns.length > 0 && (
            <div className="text-[11px] text-white/60">
              <span className="text-white/40">Opcionales:</span>{' '}
              {format.optional_columns.map(c => (
                <code key={c} className="text-white/70 mr-1">{c}</code>
              ))}
            </div>
          )}
          {meta.data?.unique_id_rules && (
            <div className="text-[11px] text-white/50 leading-relaxed">{meta.data.unique_id_rules}</div>
          )}
          {format.header && (
            <code className="block text-xs text-white/80 font-mono break-all">
              {format.header}
            </code>
          )}
          {format.example && (
            <code className="block text-xs text-white/50 font-mono break-all">
              ej. {format.example}
            </code>
          )}
          {format.notes && (
            <div className="text-[11px] text-white/50">{format.notes}</div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file" accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          Cargar archivo…
        </button>
        <button className="btn-ghost" onClick={() => { setCsv(''); setFileName(''); setPreview(null); }}>
          Limpiar
        </button>
        <div className="text-xs text-white/50 ml-auto truncate max-w-[240px]">
          {fileName || (csv ? 'Texto pegado' : 'Sin archivo')}
        </div>
      </div>

      <textarea
        className="input min-h-[200px] font-mono text-xs leading-relaxed"
        placeholder={format?.header || 'unique_id,player_name,ranking_position\nNAC-0001,Juan Pérez,1'}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />

      <div className="space-y-2">
        <SegmentedControl
          ariaLabel="Modo de importación"
          segments={modes.map((m) => ({ id: m.id, label: m.label }))}
          value={mode}
          onChange={setMode}
        />
        {modeOption?.description && (
          <p className={
            'text-[12px] leading-relaxed ' +
            (mode === 'replace' ? 'text-red-300' : 'text-white/60')
          }>
            {modeOption.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {preview && !previewFresh && (
          <span className="text-[12px] text-amber-300">
            El CSV o el modo cambiaron: vuelve a generar la vista previa.
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <button className="btn" onClick={onPreview} disabled={busy || !csv.trim()}>
            <IconRefresh size={14} /> {runPreview.isPending ? 'Revisando…' : 'Vista previa'}
          </button>
          <button
            className={mode === 'replace' ? 'btn-danger' : 'btn-primary'}
            onClick={onApply}
            disabled={busy || !previewFresh || !preview?.can_apply}
            title={!previewFresh ? 'Genera primero la vista previa' : undefined}
          >
            <IconUpload size={14} /> {apply.isPending ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>

      {preview && previewFresh && <ImportPreview summary={preview} />}
    </div>
  );
}

// ---------- preview ----------
function ImportPreview({ summary: s }: { summary: ImportSummary }) {
  const meta = useMeta();
  const categoryLabel = (id: string | null) =>
    (id && meta.data?.national_categories?.find((c) => c.id === id)?.label) || id || '—';
  const c = s.counts;

  return (
    <div className="rounded-md border border-line bg-night-800 p-3 space-y-4">
      <div className="text-[11px] uppercase tracking-wider text-white/50">
        Vista previa · {s.mode_label} (no se ha guardado nada)
      </div>

      {s.errors.length > 0 && (
        <Section
          tone="danger"
          title={`El CSV tiene ${s.errors.length} error(es). Corrígelos y vuelve a generar la vista previa.`}
          items={s.errors}
          render={(e) => e.message}
        />
      )}

      {s.errors.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Count label="Filas del CSV" value={c.csv_rows} />
          <Count label="Actualizadas" value={c.updated} />
          <Count label="Sin cambios" value={c.unchanged} />
          <Count label="Nuevas" value={c.inserted} />
          <Count label="Salen del ranking" value={c.removed} />
          <Count label="Pierden el ranking" value={c.unlinked} tone={c.unlinked ? 'danger' : undefined} />
          <Count label="ID asignado por nombre" value={c.assigned_by_name} />
          <Count label="Cambios de OVR" value={c.ovr_changes} />
        </div>
      )}

      {s.unlinked.length > 0 && (
        <Section
          tone="danger"
          title="Jugadores vinculados que pierden el ranking"
          hint="No vienen en el CSV. Si es un error, corrige el CSV o pon el ID correcto en su fila y vuelve a generar la vista previa."
          items={s.unlinked}
          render={(u) => (
            <>
              <span className="text-white">{u.athlete_name || u.player_name}</span>
              {u.athlete_name && u.athlete_name !== u.player_name && (
                <span className="text-white/50"> (en el ranking: {u.player_name})</span>
              )}
              <span className="text-white/50">
                {' '}· ID <Code>{u.unique_id}</Code> · puesto {u.ranking_position ?? '—'}
              </span>
            </>
          )}
        />
      )}

      {s.possible_id_changes.length > 0 && (
        <Section
          tone="warning"
          title="Posibles cambios de ID"
          hint="Si es el mismo jugador, cambia el ID de su fila en la tabla de entradas (y también en el CSV) y vuelve a generar la vista previa. Así sigue vinculado."
          items={s.possible_id_changes}
          render={(p) => (
            <>
              <span className="text-white">"{p.player_name}"</span> (vinculado) sale con el ID{' '}
              <Code>{p.old_unique_id}</Code> y entra uno nuevo con el ID <Code>{p.new_unique_id}</Code>.
              ¿Cambió el ID?
            </>
          )}
        />
      )}

      {s.renamed_linked.length > 0 && (
        <Section
          tone="warning"
          title="Jugadores vinculados cuyo nombre cambia"
          hint="Puede indicar un ID equivocado en el CSV."
          items={s.renamed_linked}
          render={(r) => (
            <>
              <Code>{r.unique_id}</Code> {r.old_name} → <span className="text-white">{r.new_name}</span>
            </>
          )}
        />
      )}

      {s.name_assign_skipped.length > 0 && (
        <Section
          tone="warning"
          title="Filas sin ID que no se pudieron cruzar por nombre"
          items={s.name_assign_skipped}
          render={(n) => (
            <>
              Fila {n.row} · <Code>{n.unique_id}</Code> <span className="text-white">{n.player_name}</span>
              <span className="text-white/50"> — {n.message}</span>
            </>
          )}
        />
      )}

      {s.ovr_changes.length > 0 && (
        <Section
          title="Jugadores vinculados con nuevo puesto o categoría (se recalcula su OVR)"
          items={s.ovr_changes}
          render={(o) => (
            <>
              <span className="text-white">{o.player_name}</span>
              <span className="text-white/60">
                {o.old_ranking_position !== o.new_ranking_position &&
                  ` · puesto ${o.old_ranking_position ?? '—'} → ${o.new_ranking_position ?? '—'}`}
                {o.old_national_category !== o.new_national_category &&
                  ` · ${categoryLabel(o.old_national_category)} → ${categoryLabel(o.new_national_category)}`}
              </span>
            </>
          )}
        />
      )}

      {s.assigned_by_name.length > 0 && (
        <Section
          title="IDs asignados por nombre a filas que no tenían ID"
          hint="Solo pasa la primera vez que se actualiza un ranking con IDs."
          items={s.assigned_by_name}
          render={(a) => (
            <>
              <Code>{a.unique_id}</Code> <span className="text-white">{a.player_name}</span>
              {a.linked && <span className="text-emerald-300"> · vinculado, se conserva</span>}
            </>
          )}
        />
      )}

      {s.errors.length === 0 && s.can_apply && (
        <div className="flex items-center gap-1.5 text-[12px] text-white/60">
          <IconCheck size={12} /> Revisa y pulsa "Aplicar" para guardar.
        </div>
      )}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <div className={'text-lg tabular-nums font-semibold ' + (tone === 'danger' ? 'text-red-300' : 'text-white')}>
        {value}
      </div>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}

const SECTION_TONES = {
  danger: 'border-red-400/40 bg-red-400/[.06]',
  warning: 'border-amber-400/40 bg-amber-400/[.06]',
  neutral: 'border-line',
} as const;

const SECTION_LIMIT = 20;

function Section<T>({
  title, hint, items, render, tone = 'neutral',
}: {
  title: string;
  hint?: string;
  items: T[];
  render: (item: T) => ReactNode;
  tone?: keyof typeof SECTION_TONES;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, SECTION_LIMIT);
  return (
    <div className={'rounded-md border p-3 space-y-1.5 ' + SECTION_TONES[tone]}>
      <div className="text-[12.5px] font-medium text-white">
        {title} <span className="text-white/50 tabular-nums">({items.length})</span>
      </div>
      {hint && <div className="text-[11.5px] text-white/50 leading-snug">{hint}</div>}
      <ul className="space-y-1 text-[12px] text-white/75">
        {shown.map((item, i) => <li key={i}>{render(item)}</li>)}
      </ul>
      {items.length > SECTION_LIMIT && (
        <button className="btn-ghost !px-2 !py-0.5 text-[11.5px]" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ver menos' : `Ver todos (${items.length})`}
        </button>
      )}
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-white/85">{children ?? '—'}</code>;
}
