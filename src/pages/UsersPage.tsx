import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UsersFilter } from '@/api/endpoints';
import { IconSearch, IconEdit } from '@/ui/Icons';
import { AccountStatusModal, type AccountTarget } from './AccountStatusModal';
import { UserOvrModal } from './UserOvrModal';
import { useToast } from '@/ui/Toast';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { APP_ROLE_LABEL, AccountStatusBadge, RoleBadges } from '@/ui/Badge';
import type { AccountStatus, UserRow } from '@/types';
import { formatOvr } from '@/lib/formatOvr';

const DELETED_HINT = 'Cuenta eliminada: no se puede modificar';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 50;

function toAccountTarget(u: UserRow): AccountTarget {
  return {
    id: u.id,
    name: u.full_name || u.email || 'Usuario',
    account_status: u.account_status,
    account_status_reason: u.account_status_reason,
    suspended_until: u.suspended_until,
  };
}

export function UsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'' | AccountStatus>('');
  const [offset, setOffset] = useState(0);
  const [accountUser, setAccountUser] = useState<AccountTarget | null>(null);
  const [ovrUser, setOvrUser] = useState<UserRow | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const filter: UsersFilter = useMemo(() => ({
    q: q || undefined,
    role: role || undefined,
    account_status: status || undefined,
    limit: PAGE_SIZE,
    offset,
  }), [q, role, status, offset]);

  const query = useQuery({
    queryKey: ['users', filter],
    queryFn: () => usersApi.list(filter),
  });

  const toggleWizard = useMutation({
    mutationFn: ({ userId, granted }: { userId: string; granted: boolean }) =>
      usersApi.patchWizard(userId, granted),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e),
  });

  const users = query.data?.users || [];
  const total = query.data?.total;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = users.length === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display">Usuarios</h1>
        <p className="text-[13px] text-white/55 mt-2 max-w-lg">
          Busca jugadores, coaches y clubes, cambia el estado de su cuenta y ajusta el OVR manualmente.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="label">Buscar</label>
          <div className="relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="input pl-8"
              placeholder="Email o nombre…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOffset(0); }}
            />
          </div>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Rol</label>
          <select
            className="input" value={role}
            onChange={(e) => { setRole(e.target.value); setOffset(0); }}
          >
            <option value="">Todos</option>
            {Object.entries(APP_ROLE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Estado</label>
          <select
            className="input" value={status}
            onChange={(e) => { setStatus(e.target.value as any); setOffset(0); }}
          >
            <option value="">Todos</option>
            <option value="active">Activa</option>
            <option value="suspended">Suspendida</option>
            <option value="banned">Baneada</option>
            <option value="blocked">Bloqueada</option>
            <option value="deleted">Eliminada</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th">Usuario</th>
              <th className="th">Email</th>
              <th className="th w-36">Rol</th>
              <th className="th w-32">Estado</th>
              <th className="th w-24 text-right">OVR</th>
              <th className="th w-28">Mago (varita)</th>
              <th className="th w-32 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && <SkeletonRows rows={7} cols={7} colSpans={['70%','80%','35%','40%','30%','30%','40%']} />}
            {query.isError && (
              <tr><td className="td text-red-300" colSpan={7}>
                {(query.error as Error).message}
              </td></tr>
            )}
            {!query.isLoading && users.length === 0 && (
              <tr><td colSpan={7}>
                <EmptyState
                  compact
                  title="Sin usuarios con los filtros seleccionados"
                  hint="Ajusta el buscador o los filtros."
                />
              </td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/[.02]">
                <td className="td">
                  <div className="flex items-center gap-2">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/10" />
                    )}
                    <div>
                      <div className="font-medium">{u.full_name || '—'}</div>
                      {u.club_name && (
                        <div className="text-[11px] text-white/50">
                          {u.club_name}
                          {u.club_closed_at && (
                            <span className="text-amber-300"> · Club cerrado el {formatDate(u.club_closed_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="td text-white/70">{u.email || '—'}</td>
                <td className="td"><RoleBadges roles={u.roles || []} /></td>
                <td className="td"><AccountStatusBadge status={u.account_status} /></td>
                <td className="td text-right tabular-nums">
                  <div>{formatOvr(u.overall_rating)}</div>
                  {u.overall_rating_override != null && (
                    <div className="text-[10px] text-nova-cyan">override {formatOvr(u.overall_rating_override)}</div>
                  )}
                </td>
                <td className="td">
                  {(() => {
                    const pending =
                      toggleWizard.isPending &&
                      toggleWizard.variables?.userId === u.id;
                    const checked = !!u.wizard_granted;
                    const deleted = u.account_status === 'deleted';
                    return (
                      <label
                        title={deleted ? DELETED_HINT : undefined}
                        className={
                          'inline-flex items-center gap-2 select-none ' +
                          (pending ? 'cursor-wait opacity-60' : deleted ? 'opacity-40' : 'cursor-pointer')
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={pending || deleted}
                          onChange={(e) =>
                            toggleWizard.mutate({
                              userId: u.id,
                              granted: e.target.checked,
                            })
                          }
                          aria-label="Mago (varita)"
                        />
                      </label>
                    );
                  })()}
                </td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button
                      className="btn-ghost !px-2 !py-1"
                      onClick={() => setAccountUser(toAccountTarget(u))}
                      disabled={u.account_status === 'deleted'}
                      title={u.account_status === 'deleted' ? DELETED_HINT : 'Cambiar estado'}
                    >
                      Estado
                    </button>
                    <button
                      className="btn-ghost !px-2 !py-1"
                      onClick={() => setOvrUser(u)}
                      disabled={u.account_status === 'deleted'}
                      title={u.account_status === 'deleted' ? DELETED_HINT : 'Editar OVR'}
                    >
                      <IconEdit size={14} /> OVR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-white/60">
        <div>
          Página {page}
          {total != null && <> · {total} usuarios totales</>}
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

      <AccountStatusModal
        target={accountUser}
        audience="app"
        save={usersApi.patchAccount}
        invalidateKey="users"
        onClose={() => setAccountUser(null)}
      />
      <UserOvrModal
        user={ovrUser}
        onClose={() => setOvrUser(null)}
      />
    </div>
  );
}
