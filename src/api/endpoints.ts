import { apiRequest } from './client';
import type {
  Admin, Entry, LinkedEntry, Meta, RankingSummary, RankingEntryFormat, Session, RankingType,
  UserRow, AccountStatus, AccountStatusChange, PanelAdminRow, StorageCleanupSummary,
  ReportRow, ReportsMeta, ReportStatus, ReportsQueue,
  CoachTestimonial, TestimonialFilter, CoachCertification, CertificationFilter,
  CoachesPendingCounts, ImportMode, ImportSummary,
} from '@/types';

// ---------- auth ----------
export const authApi = {
  sendCode: (email: string) =>
    apiRequest<{ message: string; email: string }>(
      '/admin/auth/send-code',
      { method: 'POST', body: { email }, auth: false }
    ),
  verifyCode: (email: string, code: string) =>
    apiRequest<{ session: Session; admin: Admin }>(
      '/admin/auth/verify-code',
      { method: 'POST', body: { email, code }, auth: false }
    ),
  me: () => apiRequest<{ admin: Admin }>('/admin/auth/me'),
  logout: () => apiRequest<{ success?: boolean }>(
    '/admin/auth/logout', { method: 'POST' }
  ),
};

// ---------- meta ----------
export const metaApi = {
  get: () => apiRequest<Meta>('/admin/rankings/meta'),
};

// ---------- rankings ----------
export type RankingsFilter = {
  ranking_type?: RankingType;
  country?: string;
  age_bracket?: string;
  is_active?: boolean;
};

export type CreateRankingBody = {
  ranking_type: RankingType;
  display_name: string;
  country?: string;
  age_bracket?: string;
  fip_sub_category?: string;
  gender_id?: string | null;
  is_active?: boolean;
  uses_national_categories?: boolean;
};

export type PatchRankingBody = Partial<{
  display_name: string;
  is_active: boolean;
  country: string;
  age_bracket: string;
  fip_sub_category: string;
  gender_id: string | null;
  uses_national_categories: boolean;
}>;

export type RankingPatchResult = {
  ranking: RankingSummary;
  warnings?: Array<{ code: string; count: number; message: string }>;
};

export const rankingsApi = {
  list: (filter: RankingsFilter = {}) =>
    apiRequest<{ rankings: RankingSummary[] }>('/admin/rankings', { query: filter as any }),
  get: (id: string) =>
    apiRequest<{ ranking: RankingSummary }>(`/admin/rankings/${id}`),
  create: (body: CreateRankingBody) =>
    apiRequest<{ ranking: RankingSummary }>('/admin/rankings', { method: 'POST', body }),
  patch: (id: string, body: PatchRankingBody) =>
    apiRequest<RankingPatchResult>(`/admin/rankings/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiRequest<{ deleted: true; recalculated_athletes: number }>(
      `/admin/rankings/${id}`, { method: 'DELETE' }
    ),
  recalc: (id: string) =>
    apiRequest<{ recalculated_athletes: number }>(
      `/admin/rankings/${id}/recalc`, { method: 'POST' }
    ),
  csvExamplePath: (id: string) => `/admin/rankings/${id}/csv-example`,
  /** Multipart field `logo`. No forma parte del create; fallos no deshacen el ranking. */
  uploadLogo: (id: string, file: File) => {
    const body = new FormData();
    body.append('logo', file);
    return apiRequest<{ ranking: RankingSummary }>(
      `/admin/rankings/${id}/logo`,
      { method: 'POST', body },
    );
  },
  removeLogo: (id: string) =>
    apiRequest<{ ranking: RankingSummary }>(
      `/admin/rankings/${id}/logo`,
      { method: 'DELETE' },
    ),
};

// ---------- entries ----------
export type EntryInput = {
  unique_id?: string;
  player_name: string;
  ranking_position: number;
  category_position?: number | null;
  country?: string;
  national_category?: string;
};

export const entriesApi = {
  list: (rankingId: string, params: { search?: string; linked?: boolean } = {}) =>
    apiRequest<{
      ranking: RankingSummary;
      entries: Entry[];
      entry_format?: RankingEntryFormat;
    }>(
      `/admin/rankings/${rankingId}/entries`,
      { query: params }
    ),
  create: (rankingId: string, body: EntryInput) =>
    apiRequest<{ entry: Entry }>(
      `/admin/rankings/${rankingId}/entries`, { method: 'POST', body }
    ),
  /** Con `preview: true` el backend no escribe nada: devuelve lo que pasaría. */
  importCsv: (
    rankingId: string,
    body: { csv: string; mode: ImportMode; preview: boolean }
  ) =>
    apiRequest<ImportSummary>(
      `/admin/rankings/${rankingId}/entries/import-csv`, { method: 'POST', body }
    ),
  patch: (entryId: string, body: Partial<EntryInput>) =>
    apiRequest<{ entry: Entry }>(
      `/admin/rankings/entries/${entryId}`, { method: 'PATCH', body }
    ),
  remove: (entryId: string) =>
    apiRequest<{ deleted: true }>(
      `/admin/rankings/entries/${entryId}`, { method: 'DELETE' }
    ),
  idPhoto: (entryId: string) =>
    apiRequest<{ signed_url: string; expires_in: number; uploaded_at?: string | null }>(
      `/admin/rankings/entries/${entryId}/id-photo`
    ),
};

// ---------- users ----------
export type UsersFilter = {
  q?: string;
  role?: string;
  account_status?: AccountStatus | '';
  limit?: number;
  offset?: number;
};

export const usersApi = {
  list: (filter: UsersFilter = {}) =>
    apiRequest<{ users: UserRow[]; total?: number; limit?: number; offset?: number }>(
      '/admin/users', { query: filter as any }
    ),
  patchAccount: (userId: string, body: AccountStatusChange) =>
    apiRequest<{ user: UserRow }>(
      `/admin/users/${userId}/account`, { method: 'PATCH', body }
    ),
  patchOvr: (
    userId: string,
    body: { overall_rating: number } | { clear_override: true }
  ) =>
    apiRequest<{ user: UserRow }>(
      `/admin/users/${userId}/ovr`, { method: 'PATCH', body }
    ),
  patchWizard: (userId: string, granted: boolean) =>
    apiRequest<{ user: UserRow }>(
      `/admin/users/${userId}/wizard`,
      { method: 'PATCH', body: { granted } }
    ),
};

// ---------- admins (super admin only) ----------
export const adminsApi = {
  list: () => apiRequest<{ admins: PanelAdminRow[] }>('/admin/admins'),
  patchAccount: (userId: string, body: AccountStatusChange) =>
    apiRequest<{ admin: PanelAdminRow }>(
      `/admin/admins/${userId}/account`, { method: 'PATCH', body }
    ),
};

// ---------- maintenance ----------
export const maintenanceApi = {
  previewStorageCleanup: () =>
    apiRequest<StorageCleanupSummary>('/admin/maintenance/storage-cleanup'),
  runStorageCleanup: () =>
    apiRequest<StorageCleanupSummary>('/admin/maintenance/storage-cleanup', { method: 'POST' }),
};

// ---------- reports ----------
export type ReportsFilter = {
  status?: ReportStatus | '';
  limit?: number;
  offset?: number;
};

export type PatchReportBody = {
  status: ReportStatus;
  admin_notes?: string | null;
  account_status?: AccountStatus;
  suspended_until?: string | null;
  account_reason?: string | null;
};

export const reportsApi = {
  meta: () => apiRequest<ReportsMeta>('/admin/reports/meta'),
  list: (filter: ReportsFilter = {}) =>
    apiRequest<{
      reports: ReportRow[];
      total: number;
      limit: number;
      offset: number;
      queue: ReportsQueue;
    }>('/admin/reports', { query: filter as any }),
  get: (id: string) =>
    apiRequest<{ report: ReportRow }>(`/admin/reports/${id}`),
  patch: (id: string, body: PatchReportBody) =>
    apiRequest<{ report: ReportRow }>(`/admin/reports/${id}`, { method: 'PATCH', body }),
};

// ---------- coaches ----------
export const coachesApi = {
  pendingCounts: () =>
    apiRequest<CoachesPendingCounts>('/admin/coaches/pending-counts'),
  testimonials: (status: TestimonialFilter) =>
    apiRequest<{ testimonials: CoachTestimonial[] }>('/admin/coaches/testimonials', {
      query: { status },
    }),
  reviewTestimonial: (id: string, action: 'confirm' | 'reject') =>
    apiRequest<{ testimonial: CoachTestimonial | null }>(
      `/admin/coaches/testimonials/${id}/review`,
      { method: 'POST', body: { action } }
    ),
  certifications: (status: CertificationFilter) =>
    apiRequest<{ certifications: CoachCertification[] }>('/admin/coaches/certifications', {
      query: { status },
    }),
  reviewCertification: (id: string, body: { action: 'approve' | 'reject'; reason?: string }) =>
    apiRequest<{ certification: CoachCertification | null }>(
      `/admin/coaches/certifications/${id}/review`,
      { method: 'POST', body }
    ),
};

// ---------- links ----------
export type LinksFilter = {
  status?: 'pending' | 'confirmed' | 'all';
  ranking_id?: string;
};

export const linksApi = {
  listSelf: (filter: LinksFilter = {}) =>
    apiRequest<{ links: LinkedEntry[] }>('/admin/rankings/links/self', {
      query: filter as any,
    }),
  confirm: (entryId: string) =>
    apiRequest<{ entry: Entry }>(
      `/admin/rankings/entries/${entryId}/confirm`, { method: 'POST' }
    ),
  unlink: (entryId: string) =>
    apiRequest<{ entry: Entry }>(
      `/admin/rankings/entries/${entryId}/unlink`, { method: 'POST' }
    ),
  link: (entryId: string, athleteId: string) =>
    apiRequest<{ entry: Entry }>(
      `/admin/rankings/entries/${entryId}/link`,
      { method: 'POST', body: { athlete_id: athleteId } }
    ),
};
