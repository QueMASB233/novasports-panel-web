import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type ReportsFilter } from '@/api/endpoints';
import { useReportsMeta } from '@/hooks/useReports';
import { SegmentedControl, type Segment } from '@/ui/SegmentedControl';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import type { ReportRow, ReportStatus, AccountStatus } from '@/types';

const PAGE_SIZE = 50;

const STATUS_STYLES: Record<ReportStatus, string> = {
  open: 'border-amber-400/40 bg-amber-400/[.12] text-amber-200',
  reviewing: 'border-nova-blue/40 bg-nova-blue/[.12] text-[#7fb6ff]',
  resolved: 'border-emerald-400/40 bg-emerald-400/[.12] text-emerald-200',
  dismissed: 'border-white/15 bg-white/[.06] text-white/60',
};

const ACCOUNT_STATUS_STYLES: Record<AccountStatus, string> = {
  active: 'text-emerald-300',
  suspended: 'text-amber-300',
  banned: 'text-red-300',
  blocked: 'text-white/60',
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  athlete: 'Jugador',
  coach: 'Coach',
  club: 'Club',
};

export function ReportsListPage() {
  const meta = useReportsMeta();
  const [status, setStatus] = useState<ReportStatus>('open');
  const [offset, setOffset] = useState(0);

  const filter: ReportsFilter = useMemo(() => ({
    status, limit: PAGE_SIZE, offset,
  }), [status, offset]);

  const q = useQuery({
    queryKey: ['reports', filter],
    queryFn: () => reportsApi.list(filter),
  });

  const reports = q.data?.reports || [];
  const total = q.data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display">Reportes</h1>
        <p className="text-[13px] text-white/55 mt-2 max-w-lg">
          Modera denuncias de la comunidad. Cierra el caso y, si corresponde, sanciona la cuenta.
        </p>
      </div>

      {(() => {
        const statuses: Segment<ReportStatus>[] = (meta.data?.statuses || []).map(s => ({
          id: s.id as ReportStatus,
          label: s.label,
          count: s.id === status ? total : undefined,
        }));
        return (
          <SegmentedControl<ReportStatus>
            segments={statuses}
            value={status}
            onChange={(id) => { setStatus(id); setOffset(0); }}
            ariaLabel="Estado del reporte"
          />
        );
      })()}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th w-40">Fecha</th>
              <th className="th">Denunciante</th>
              <th className="th">Denunciado</th>
              <th className="th w-24">Perfil</th>
              <th className="th">Motivo</th>
              <th className="th w-32">Estado</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <SkeletonRows rows={5} cols={6} colSpans={['70%','60%','60%','40%','80%','35%']} />}
            {q.isError && (
              <tr><td className="td text-red-300" colSpan={6}>
                {(q.error as Error).message}
              </td></tr>
            )}
            {!q.isLoading && reports.length === 0 && (
              <tr><td colSpan={6}>
                <EmptyState
                  compact
                  title={status === 'open' ? 'No hay reportes abiertos' : 'Sin reportes en este estado'}
                  hint={
                    status === 'open'
                      ? 'La cola está limpia. Todo bajo control.'
                      : 'Prueba con otro estado en la parte de arriba.'
                  }
                />
              </td></tr>
            )}
            {reports.map(r => (
              <ReportListRow key={r.id} report={r} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-white/60">
        <div>
          {total > 0 && (
            <>Página {page} de {totalPages} · {total} reporte{total === 1 ? '' : 's'}</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn" disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            ← Anterior
          </button>
          <button
            className="btn" disabled={!hasNext}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportListRow({ report }: { report: ReportRow }) {
  const nav = useNavigate();
  return (
    <tr
      className={
        'hover:bg-white/[.02] transition-colors ' +
        'duration-100 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer'
      }
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        nav(`/reports/${report.id}`);
      }}
    >
      <td className="td text-[12px] text-white/70 whitespace-nowrap">
        {new Date(report.created_at).toLocaleString()}
      </td>
      <td className="td">
        <UserCell user={report.reporter} />
      </td>
      <td className="td">
        {report.target_user ? (
          <UserCell user={report.target_user} />
        ) : (
          <span className="text-white/40 text-[12px]">Cuenta eliminada</span>
        )}
      </td>
      <td className="td text-white/70 text-[12px]">
        {TARGET_TYPE_LABEL[report.target_type] || report.target_type}
      </td>
      <td className="td">
        <div className="text-white">{report.reason_label}</div>
        {report.details && (
          <div className="text-[11px] text-white/50 line-clamp-1 max-w-md">
            {report.details}
          </div>
        )}
      </td>
      <td className="td">
        <Link
          to={`/reports/${report.id}`}
          className={'badge border ' + STATUS_STYLES[report.status]}
        >
          {report.status_label}
        </Link>
      </td>
    </tr>
  );
}

function UserCell({ user }: { user: import('@/types').ReportUserSummary | null }) {
  if (!user) return <span className="text-white/40 text-[12px]">—</span>;
  return (
    <div className="flex items-center gap-2">
      {user.photo_url ? (
        <img src={user.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-white/10" />
      )}
      <div className="min-w-0">
        <div className="text-white truncate">{user.full_name || '—'}</div>
        <div className="text-[11px] text-white/50 truncate">
          {user.email || '—'}
          {user.account_status && (
            <span className={'ml-1 ' + (ACCOUNT_STATUS_STYLES[user.account_status] || '')}>
              · {user.account_status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
