import {
  createContext, useContext, useEffect, useMemo, useState, useCallback,
} from 'react';
import { authApi } from '@/api/endpoints';
import { readSession, writeSession } from '@/api/client';
import type { Admin, Session } from '@/types';

type AuthState = {
  status: 'loading' | 'anon' | 'authed';
  admin: Admin | null;
  signIn: (session: Session, admin: Admin) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [admin, setAdmin] = useState<Admin | null>(null);

  const hydrate = useCallback(async () => {
    const s = readSession();
    if (!s?.access_token) {
      setStatus('anon');
      setAdmin(null);
      return;
    }
    try {
      const { admin } = await authApi.me();
      setAdmin(admin);
      setStatus('authed');
    } catch {
      writeSession(null);
      setAdmin(null);
      setStatus('anon');
    }
  }, []);

  useEffect(() => {
    hydrate();
    const onSignedOut = () => {
      setAdmin(null);
      setStatus('anon');
    };
    window.addEventListener('novasports:signed-out', onSignedOut);
    return () => window.removeEventListener('novasports:signed-out', onSignedOut);
  }, [hydrate]);

  const signIn = useCallback((session: Session, admin: Admin) => {
    writeSession(session);
    setAdmin(admin);
    setStatus('authed');
  }, []);

  const signOut = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    writeSession(null);
    setAdmin(null);
    setStatus('anon');
  }, []);

  const value = useMemo(
    () => ({ status, admin, signIn, signOut }),
    [status, admin, signIn, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}
