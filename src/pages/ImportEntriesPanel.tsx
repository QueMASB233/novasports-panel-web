import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entriesApi } from '@/api/endpoints';
import { downloadFile } from '@/api/client';
import { useMeta } from '@/hooks/useMeta';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { IconUpload, IconX } from '@/ui/Icons';
import type { RankingType } from '@/types';

export function ImportEntriesPanel({
  rankingId, rankingType, onDone,
}: {
  rankingId: string;
  rankingType: RankingType;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const meta = useMeta();
  const [csv, setCsv] = useState('');
  const [replace, setReplace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formats = meta.data?.csv_formats;
  const dashKey = rankingType.replace(/_/g, '-');
  const format = formats?.[rankingType] || formats?.[dashKey];
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

  const lineCount = useMemo(() => {
    const raw = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    return Math.max(0, raw.length - 1); // menos header
  }, [csv]);

  const submit = useMutation({
    mutationFn: () => entriesApi.importCsv(rankingId, { csv, replace }),
    onSuccess: (d) => {
      toast.success(
        `Importadas ${d.imported}${replace ? `, reemplazadas ${d.replaced}` : ''}. ` +
        `Atletas recalculados: ${d.recalculated_athletes}.`
      );
      qc.invalidateQueries({ queryKey: ['ranking-entries', rankingId] });
      qc.invalidateQueries({ queryKey: ['ranking', rankingId] });
      onDone();
    },
    onError: (e) => toast.error(e),
  });

  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.readAsText(f);
  };

  const onSubmit = async () => {
    if (!csv.trim()) return toast.push('error', 'Pega o carga un CSV');
    if (replace) {
      const ok = await confirm({
        title: 'Reemplazar entradas',
        message: 'Se eliminarán todas las entradas actuales antes de importar la nueva lista. ¿Continuar?',
        confirmLabel: 'Reemplazar', danger: true,
      });
      if (!ok) return;
    }
    submit.mutate();
  };

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
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          Cargar archivo…
        </button>
        <button className="btn-ghost" onClick={() => setCsv('')}>Limpiar</button>
        <div className="text-xs text-white/50 ml-auto">
          {lineCount} filas detectadas
        </div>
      </div>

      <textarea
        className="input min-h-[200px] font-mono text-xs leading-relaxed"
        placeholder={format?.header || 'player_name,ranking_position\nJuan Pérez,1'}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox" checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          Reemplazar lista actual
        </label>
        <button
          className="btn-primary ml-auto"
          onClick={onSubmit}
          disabled={submit.isPending || !csv.trim()}
        >
          <IconUpload size={14} /> {submit.isPending ? 'Importando…' : 'Importar CSV'}
        </button>
      </div>
    </div>
  );
}
