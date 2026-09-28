import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { RankingsListPage } from '@/pages/RankingsListPage';
import { RankingEditorPage } from '@/pages/RankingEditorPage';
import { LinksPage } from '@/pages/LinksPage';
import { UsersPage } from '@/pages/UsersPage';
import { ReportsListPage } from '@/pages/ReportsListPage';
import { ReportDetailPage } from '@/pages/ReportDetailPage';
import { AppLayout } from '@/layout/AppLayout';
import { ConfirmProvider } from '@/ui/Confirm';

function Guard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'anon') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AnonOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authed') return <Navigate to="/rankings" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center text-white/40 text-sm">
      Cargando…
    </div>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      <div className="relative min-h-screen">
        <div className="relative z-10">
          <Routes>
            <Route path="/login" element={<AnonOnly><LoginPage /></AnonOnly>} />
            <Route element={<Guard><AppLayout /></Guard>}>
              <Route index element={<Navigate to="/rankings" replace />} />
              <Route path="/rankings" element={<RankingsListPage />} />
              <Route path="/rankings/:id" element={<RankingEditorPage />} />
              <Route path="/links" element={<LinksPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/reports" element={<ReportsListPage />} />
              <Route path="/reports/:id" element={<ReportDetailPage />} />
              <Route path="*" element={<Navigate to="/rankings" replace />} />
            </Route>
          </Routes>
        </div>
      </div>
    </ConfirmProvider>
  );
}
