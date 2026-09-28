import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsApi, type PatchReportBody } from '@/api/endpoints';
import { useReportsMeta } from '@/hooks/useReports';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { IconChevronLeft } from '@/ui/Icons';
import type { AccountStatus, ReportRow, ReportStatus } from '@/types';

const STATUS_STYLES: Record<ReportStatus, string> = {
  open: 'border-amber-400/40 bg-amber-400/[.12] text-amber-200',
  reviewing: 'border-nova-blue/40 bg-nova-blue/[.12] text-[#7fb6ff]',
  resolved: 'border-emerald-400/40 bg-emerald-400/[.12] text-emerald-200',
  dismissed: 'border-white/15 bg-white/[.06] text-white/60',
};

const TARGET_LABEL: Record<string, string> = {
  athlete: 'Jugador',
  coach: 'Coach',
  club: 'Club',
};

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReportDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const meta = useReportsMeta();
  const q = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id),
    enabled: !!id,
  });

  if (q.isLoading) return <div className="text-white/50 text-sm">Cargando…</div>;
  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        <button className="btn-ghost" onClick={() => nav('/reports')}>
          <IconChevronLeft size={14} /> Volver
        </button>
        <div className="text-red-300 text-sm">
          {(q.error as Error)?.message || 'Reporte no encontrado'}
        </div>
      </div>
    );
  }

  const report = q.data.report;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/reports" className="btn-ghost !px-2 !py-1">
          <IconChevronLeft size={14} /> Reportes
        </Link>
      </div>

      <div className="card p-5 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="heading">{report.reason_label}</h1>
          <span className={'badge border ' + STATUS_STYLES[report.status]}>
            {report.status_label}
          </span>
        </div>
        <div className="text-[12px] text-white/50">
          {new Date(report.created_at).toLocaleString()} ·
          {' '}<code className="text-white/60">{report.id}</code>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-4">
          <PartiesCard report={report} />
          {report.details && (
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">
                Detalles del denunciante
              </div>
              <p className="text-[14px] text-white/90 whitespace-pre-wrap leading-relaxed">
                {report.details}
              </p>
            </div>
          )}
          <div className="card p-5 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">
              Perfil reportado
            </div>
            <div className="text-[13px] text-white/80">
              Tipo: <span className="text-white">{TARGET_LABEL[report.target_type] || report.target_type}</span>
            </div>
            <div className="text-[13px] text-white/80">
              ID: <code className="text-white/90">{report.target_id}</code>
            </div>
          </div>
          {report.admin_notes && (
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">
                Notas del admin anteriores
              </div>
              <p className="text-[13px] text-white/80 whitespace-pre-wrap">
                {report.admin_notes}
              </p>
              {report.resolved_at && (
                <div className="text-[11px] text-white/50 mt-2">
                  Resuelto: {new Date(report.resolved_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        <ResolutionForm report={report} statuses={meta.data?.statuses || []} actions={meta.data?.account_actions || []} />
      </div>
    </div>
  );
}

function PartiesCard({ report }: { report: ReportRow }) {
  return (
    <div className="card p-5 space-y-4">
      <PartyBlock title="Denunciante" user={report.reporter} />
      <div className="h-px bg-line" />
      <PartyBlock
        title="Denunciado"
        user={report.target_user}
        emptyMsg="Cuenta eliminada — no se puede sancionar"
      />
    </div>
  );
}

function PartyBlock({
  title, user, emptyMsg,
}: {
  title: string;
  user: import('@/types').ReportUserSummary | null;
  emptyMsg?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">{title}</div>
      {user ? (
        <div className="flex items-center gap-3">
          {user.photo_url ? (
            <img src={user.photo_url} className="w-11 h-11 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">{user.full_name || '—'}</div>
            <div className="text-[12px] text-white/60 truncate">{user.email || '—'}</div>
            {user.account_status && (
              <div className="text-[11px] text-white/60 mt-0.5">
                Cuenta: <span className="text-white">{user.account_status}</span>
                {user.account_status_reason && (
                  <span className="text-white/45"> — {user.account_status_reason}</span>
                )}
              </div>
            )}
          </div>
          <Link
            to={`/users?q=${encodeURIComponent(user.email || '')}`}
            className="btn text-[12px] !py-1.5"
          >
            Ver usuario
          </Link>
        </div>
      ) : (
        <div className="text-[13px] text-white/50">{emptyMsg || '—'}</div>
      )}
    </div>
  );
}

function ResolutionForm({
  report, statuses, actions,
}: {
  report: ReportRow;
  statuses: { id: string; label: string }[];
  actions: { id: string; label: string }[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const targetExists = !!report.target_user;

  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [notes, setNotes] = useState(report.admin_notes || '');
  const [action, setAction] = useState<'none' | AccountStatus>('none');
  const [suspendedUntil, setSuspendedUntil] = useState('');
  const [accountReason, setAccountReason] = useState('');

  useEffect(() => {
    setStatus(report.status);
    setNotes(report.admin_notes || '');
    setAction('none');
    setSuspendedUntil(
      report.target_user?.account_status === 'suspended'
        ? toDatetimeLocal((report.target_user as any).suspended_until || null)
        : ''
    );
    setAccountReason(report.target_user?.account_status_reason || '');
  }, [report.id, report.status, report.admin_notes, report.target_user]);

  const needsDate = action === 'suspended';
  const notesTooLong = notes.length > 2000;
  const reasonTooLong = accountReason.length > 500;

  const patch = useMutation({
    mutationFn: (body: PatchReportBody) => reportsApi.patch(report.id, body),
    onSuccess: () => {
      toast.success('Reporte actualizado');
      qc.invalidateQueries({ queryKey: ['report', report.id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['reports-queue'] });
    },
    onError: (e) => toast.error(e),
  });

  const submit = async () => {
    if (notesTooLong) return toast.push('error', 'Notas > 2000 caracteres');
    if (reasonTooLong) return toast.push('error', 'Motivo > 500 caracteres');
    if (action === 'suspended' && !suspendedUntil) {
      return toast.push('error', 'Para suspender necesitas fecha fin');
    }

    const body: PatchReportBody = { status };
    body.admin_notes = notes.trim() ? notes.trim() : null;

    if (action !== 'none') {
      if (!targetExists) {
        return toast.push('error', 'El usuario denunciado ya no existe');
      }
      body.account_status = action;
      if (action === 'suspended') {
        body.suspended_until = new Date(suspendedUntil).toISOString();
      } else {
        body.suspended_until = null;
      }
      if (accountReason.trim()) body.account_reason = accountReason.trim();
    }

    const irreversible: AccountStatus[] = ['suspended', 'banned', 'blocked'];
    if (action !== 'none' && irreversible.includes(action as AccountStatus)) {
      const label = actions.find(a => a.id === action)?.label || action;
      const ok = await confirm({
        title: `${label} — confirmar`,
        message: (
          <>
            Se cambiará el estado de cuenta de{' '}
            <strong>{report.target_user?.full_name || report.target_user?.email}</strong>{' '}
            a <strong>{action}</strong>.
            {action === 'banned' || action === 'blocked' ? (
              <> Se cerrará su sesión global inmediatamente.</>
            ) : null}
          </>
        ),
        confirmLabel: label,
        danger: true,
      });
      if (!ok) return;
    }

    patch.mutate(body);
  };

  return (
    <aside className="card p-5 space-y-4 lg:sticky lg:top-20 h-fit">
      <div className="text-[11px] uppercase tracking-wider text-white/50">
        Resolver reporte
      </div>

      <div>
        <label className="label">Estado del reporte</label>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus)}
        >
          {statuses.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Notas del admin (opcional)</label>
        <textarea
          className={'input min-h-[110px] text-[13px] leading-relaxed ' + (notesTooLong ? '!border-red-500/60' : '')}
          placeholder="Contexto interno: evidencia, decisión, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className={'text-[11px] mt-1 text-right tabular-nums ' + (notesTooLong ? 'text-red-300' : 'text-white/40')}>
          {notes.length} / 2000
        </div>
      </div>

      <div className="h-px bg-line" />

      <div>
        <label className="label">Sanción a la cuenta denunciada</label>
        <select
          className="input"
          value={action}
          disabled={!targetExists}
          onChange={(e) => setAction(e.target.value as 'none' | AccountStatus)}
        >
          {actions.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        {!targetExists && (
          <div className="text-[11px] text-white/50 mt-1.5">
            El usuario denunciado ya no existe. Solo puedes cerrar el reporte.
          </div>
        )}
      </div>

      {needsDate && (
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

      {action !== 'none' && (
        <div>
          <label className="label">Motivo visible en el usuario (opcional)</label>
          <input
            className={'input ' + (reasonTooLong ? '!border-red-500/60' : '')}
            placeholder="p. ej. Acoso confirmado"
            value={accountReason}
            onChange={(e) => setAccountReason(e.target.value)}
          />
          <div className={'text-[11px] mt-1 text-right tabular-nums ' + (reasonTooLong ? 'text-red-300' : 'text-white/40')}>
            {accountReason.length} / 500
          </div>
        </div>
      )}

      <button
        className="btn-primary w-full h-10 text-[13px]"
        onClick={submit}
        disabled={patch.isPending}
      >
        {patch.isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </aside>
  );
}
