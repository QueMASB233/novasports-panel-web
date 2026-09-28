import type { Session } from '@/types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://novasports-api.onrender.com/api/v1').replace(/\/+$/, '');
const STORAGE_KEY = 'novasports.session';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

let refreshInFlight: Promise<Session | null> | null = null;

async function tryRefresh(): Promise<Session | null> {
  const current = readSession();
  if (!current?.refresh_token) return null;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        writeSession(null);
        return null;
      }
      const session: Session = json.data?.session;
      if (!session?.access_token) {
        writeSession(null);
        return null;
      }
      writeSession(session);
      return session;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  _isRetry?: boolean;
};

export async function apiRequest<T = any>(
  path: string,
  opts: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, query, auth = true, _isRetry = false } = opts;

  const url = new URL(API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) {
    const s = readSession();
    if (s?.access_token) headers.authorization = `Bearer ${s.access_token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }

  if (res.status === 401 && auth && !_isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...opts, _isRetry: true });
    }
    writeSession(null);
    const err = new ApiError(
      json?.error?.message || 'Sesión expirada',
      json?.error?.code || 'AUTH_UNAUTHORIZED',
      401
    );
    // Notify auth listeners
    window.dispatchEvent(new CustomEvent('novasports:signed-out'));
    throw err;
  }

  if (res.status === 429) {
    throw new ApiError(
      'Demasiadas solicitudes, intenta en un momento.',
      json?.error?.code || 'RATE_LIMIT',
      429
    );
  }

  if (!res.ok || !json?.success) {
    const message =
      json?.error?.message ||
      json?.message ||
      `Error ${res.status}`;
    const code = json?.error?.code || 'UNKNOWN';
    throw new ApiError(message, code, res.status);
  }

  return json.data as T;
}

export async function downloadFile(path: string, filename: string) {
  const s = readSession();
  const res = await fetch(API_BASE + path, {
    headers: s?.access_token ? { authorization: `Bearer ${s.access_token}` } : {},
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const json = await res.json();
      msg = json?.error?.message || msg;
    } catch { /* ignore */ }
    throw new ApiError(msg, 'DOWNLOAD_FAILED', res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { API_BASE };
