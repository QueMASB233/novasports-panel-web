import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { IconLogout } from '@/ui/Icons';
import { useReportsQueueCount } from '@/hooks/useReports';

export function AppLayout() {
  const { admin, signOut } = useAuth();
  const queueQ = useReportsQueueCount();
  const queue = queueQ.data?.queue;
  const reportsCount = (queue?.open ?? 0) + (queue?.reviewing ?? 0);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="chrome">
        <div className="max-w-[1400px] mx-auto px-6 h-[52px] flex items-center gap-6">
          <Link to="/rankings" className="flex items-baseline gap-3 group shrink-0">
            <span
              className="font-semibold text-[14px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              NovaSports
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/35 hidden sm:inline">
              Admin
            </span>
          </Link>

          <nav className="flex items-center gap-0.5 ml-2">
            <TopNav to="/rankings">Rankings</TopNav>
            <TopNav to="/users">Usuarios</TopNav>
            <TopNav to="/links">Vínculos</TopNav>
            <TopNav to="/reports" badge={reportsCount}>Reportes</TopNav>
          </nav>

          <div className="ml-auto flex items-center gap-2 text-[12.5px]">
            <span className="text-white/55 hidden md:inline truncate max-w-[240px]">
              {admin?.email}
            </span>
            <button className="btn-ghost !py-1.5" onClick={() => signOut()}>
              <IconLogout size={13} /> Salir
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function TopNav({
  to, children, badge,
}: {
  to: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'px-3 py-1.5 text-[13px] rounded-lg transition-colors inline-flex items-center gap-2 ' +
        'duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
        (isActive
          ? 'text-white bg-white/[.07] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'text-white/60 hover:text-white hover:bg-white/[.04] border border-transparent')
      }
    >
      {children}
      {typeof badge === 'number' && badge > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-semibold tabular-nums bg-red-500/90 text-white"
          aria-label={`${badge} pendientes`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

