export type RankingType = 'national' | 'country_open' | 'fip' | 'fip_promises';

export type RankingCreateField =
  | 'ranking_type'
  | 'display_name'
  | 'country'
  | 'age_bracket'
  | 'fip_sub_category'
  | 'is_active';

export type RankingCreateSpec = {
  required_fields: RankingCreateField[];
  example?: Record<string, unknown>;
};

export type RankingEntryFormat = {
  uses_national_categories: boolean;
  show_category_column: boolean;
  required_columns: string[];
  optional_columns: string[];
  description: string;
};

export type RankingSummary = {
  id: string;
  ranking_type: RankingType;
  ranking_type_label: string;
  display_name: string;
  country: string | null;
  age_bracket: string | null;
  age_bracket_label: string | null;
  fip_sub_category: string | null;
  gender_id?: string | null;
  gender_label?: string | null;
  ranking_scope: string | null;
  uses_national_categories?: boolean;
  uses_national_categories_editable?: boolean;
  entry_format?: RankingEntryFormat;
  /** URL pública del logo (opcional). Recomendado 1:1. */
  logo_url?: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  entry_count?: number;
  matched_count?: number;
};

export type MultiCategoryLinkConflict = {
  athlete_id: string;
  athlete_name: string | null;
  entry_count: number;
  categories: string[];
  category_labels: string[];
};

export type MatchedAthlete = {
  id: string;
  full_name: string;
  photo_url: string | null;
  overall_rating: number | null;
};

export type IdVerification = {
  available: boolean;
  uploaded_at?: string | null;
  photo_url_path?: string | null;
};

export type LinkStatus = 'pending' | 'confirmed';

export type Entry = {
  id: string;
  ranking_id: string;
  /** ID del jugador en el CSV del cliente. null solo en filas anteriores a la migración 094. */
  unique_id?: string | null;
  player_name: string;
  country: string | null;
  ranking_position: number | null;
  category_position: number | null;
  national_category: string | null;
  national_category_label: string | null;
  display_label: string | null;
  linked_by_self: boolean;
  linked_at: string | null;
  admin_verified?: boolean;
  admin_verified_at?: string | null;
  matched_athlete: MatchedAthlete | null;
  id_verification?: IdVerification | null;
  updated_at: string | null;
};

export type LinkedEntry = Entry & {
  ranking_display_name: string;
  ranking_gender_label?: string | null;
  ranking_type: RankingType;
  ranking_type_label: string;
  status?: LinkStatus;
  pending?: boolean;
  can_confirm?: boolean;
  can_unlink?: boolean;
  admin_verified?: boolean;
  admin_verified_at?: string | null;
  is_nova_verified?: boolean;
};

export type MetaOption = {
  id: string;
  label: string;
  ovr?: number;
  /** Presentación de ranking_genders (meta); el panel no lo pinta aún. */
  icon_key?: string | null;
  color_hex?: string | null;
};
export type CountryOption = { code: string; name: string };
export type EntryColumn = {
  key: string;
  label: string;
  hint?: string;
  ranking_types?: string[];
  /** En estos tipos se puede guardar una fila vieja sin categoría. El alta y el CSV siguen exigiéndola. */
  allow_blank_edit_types?: string[];
};
export type OvrRow = { max_position: number; ovr: number };

export type OvrReferenceCategoryBand = {
  table: OvrRow[];
  /** Techo del #1 en esa categoría. */
  cap: number;
  beyond: string;
};

export type OvrReferenceBoard = {
  table: OvrRow[];
  beyond: string;
  categories_note?: string;
  by_category?: Record<string, OvrReferenceCategoryBand>;
};

export type CsvFormat = {
  header?: string;
  example?: string;
  description?: string;
  required_columns?: string[];
  optional_columns?: string[];
  notes?: string;
  example_filename?: string;
  example_download_path?: string;
};

export type ImportMode = 'update' | 'replace' | 'append';

export type ImportModeOption = {
  id: ImportMode;
  label: string;
  description: string;
  default?: boolean;
  requires_confirmation?: boolean;
};

export type Meta = {
  ranking_types: MetaOption[];
  age_brackets: MetaOption[];
  fip_sub_categories: MetaOption[];
  national_categories: MetaOption[];
  ranking_genders?: MetaOption[];
  countries: CountryOption[];
  entry_columns?: EntryColumn[];
  ovr_reference: Record<string, OvrReferenceBoard>;
  csv_formats?: Record<string, CsvFormat>;
  unique_id_rules?: string;
  import_modes?: ImportModeOption[];
  create_ranking_bodies?: Record<string, RankingCreateSpec>;
  uses_national_categories?: {
    label: string;
    hint?: string;
    editable_ranking_types: RankingType[];
    default_by_type: Record<RankingType, boolean>;
  };
};

// ---------- ranking import (preview / apply) ----------
export type ImportRowError = {
  code: string;
  message: string;
  row?: number;
  rows?: number[];
  unique_id?: string;
};

export type ImportCounts = {
  csv_rows: number;
  updated: number;
  unchanged: number;
  inserted: number;
  removed: number;
  unlinked: number;
  assigned_by_name: number;
  ovr_changes: number;
};

export type ImportSummary = {
  mode: ImportMode;
  mode_label: string;
  preview: boolean;
  can_apply: boolean;
  errors: ImportRowError[];
  counts: ImportCounts;
  unlinked: {
    entry_id: string;
    unique_id: string | null;
    player_name: string;
    ranking_position: number | null;
    athlete_id: string;
    athlete_name: string | null;
  }[];
  renamed_linked: {
    entry_id: string;
    unique_id: string;
    old_name: string;
    new_name: string;
    athlete_id: string;
  }[];
  ovr_changes: {
    entry_id: string;
    unique_id: string;
    player_name: string;
    athlete_id: string;
    old_ranking_position: number | null;
    new_ranking_position: number | null;
    old_national_category: string | null;
    new_national_category: string | null;
  }[];
  assigned_by_name: {
    entry_id: string;
    unique_id: string;
    player_name: string;
    linked: boolean;
  }[];
  name_assign_skipped: {
    row: number;
    unique_id: string;
    player_name: string;
    reason: string;
    message: string;
  }[];
  possible_id_changes: {
    entry_id: string;
    old_unique_id: string | null;
    new_unique_id: string;
    player_name: string;
    athlete_id: string;
  }[];
  recalculated_athlete_ids: string[];
  /** Solo al aplicar. */
  imported?: number;
  recalculated_athletes?: number;
};

/** 'deleted' is only set by the account deletion flow; the panel can't choose it. */
export type AccountStatus = 'active' | 'suspended' | 'banned' | 'blocked' | 'deleted';
export type SettableAccountStatus = Exclude<AccountStatus, 'deleted'>;

export type AccountStatusChange = {
  status: SettableAccountStatus;
  reason?: string;
  suspended_until?: string;
};

// ---------- reports ----------
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportTargetType = 'athlete' | 'coach' | 'club';
export type ReportAccountAction = 'none' | AccountStatus;

export type ReportUserSummary = {
  id: string;
  email: string | null;
  full_name: string | null;
  photo_url: string | null;
  account_status?: AccountStatus | null;
  account_status_reason?: string | null;
};

export type ReportRow = {
  id: string;
  created_at: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  reason_label: string;
  details: string | null;
  status: ReportStatus;
  status_label: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  reporter: ReportUserSummary | null;
  target_user: ReportUserSummary | null;
};

export type ReportsMeta = {
  statuses: MetaOption[];
  reasons: MetaOption[];
  account_actions: MetaOption[];
};

export type ReportsQueue = { open: number; reviewing: number };

export type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  photo_url: string | null;
  /** App roles: 'player' | 'coach' | 'club_admin'. Panel admins are not listed. */
  roles: string[];
  account_status: AccountStatus | null;
  account_status_reason: string | null;
  suspended_until: string | null;
  overall_rating: number | null;
  overall_rating_override: number | null;
  wizard_granted?: boolean;
  /** Club this account administers, if any. */
  club_name?: string | null;
  club_closed_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// ---------- maintenance ----------
export type StorageCleanupSummary = {
  dry_run: boolean;
  unfinished_deletions: { found: number; fixed: number; blocked_open_club: number; failed: number };
  auth_leftovers: { found: number; fixed: number; failed: number };
  orphan_files: { folders: number; files: number; removed: number; failed: number; by_bucket: Record<string, number> };
  expired_media: { videos: number; photos: number };
};

// ---------- coaches ----------
export type CoachSummary = {
  id: string | null;
  full_name: string | null;
  photo_url: string | null;
  onboarding_completed: boolean;
  onboarding_step?: number;
};

export type TestimonialFilter = 'pending' | 'confirmed' | 'all';

export type CoachTestimonial = {
  id: string;
  athlete_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | null;
  status_label: string;
  status_hint: string;
  requested_at: string | null;
  responded_at: string | null;
  admin_verified: boolean;
  counts_in_legacy: boolean;
  requires_player_approval: boolean;
  player_has_app: boolean;
  athlete: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    national_position: number | null;
    fip_position: number | null;
    has_id_photo: boolean;
  } | null;
  coach: CoachSummary | null;
};

export type CertificationStatus = 'pending' | 'approved' | 'rejected';
export type CertificationFilter = CertificationStatus | 'all';

export type ModerationStatus = 'clean' | 'flagged' | 'blocked' | 'skipped';

export type CoachCertification = {
  id: string;
  /** Name the coach gave it; shown on their card once approved. */
  title: string;
  /** Original file name, for reference only. */
  file_name: string | null;
  status: CertificationStatus;
  status_label: string;
  created_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  auto_rejected: boolean;
  image_url: string | null;
  moderation: {
    status: ModerationStatus | null;
    status_label: string;
    flags: { category: string; category_label: string; likelihood: string; likelihood_label: string }[];
  };
  moderation_text: string | null;
  can_approve: boolean;
  can_reject: boolean;
  coach: CoachSummary | null;
};

export type CoachesPendingCounts = {
  testimonials: number;
  certifications: number;
  total: number;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | string;
};

export type Admin = {
  id: string;
  email: string;
  is_admin: boolean;
  is_super_admin?: boolean;
};

/** Row of the admins page (super admin only). */
export type PanelAdminRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_super_admin: boolean;
  is_self: boolean;
  account_status: AccountStatus;
  account_status_label: string;
  account_status_reason: string | null;
  suspended_until: string | null;
  created_at: string | null;
  /** App roles left over from before admins were panel-only accounts. */
  app_roles: string[];
  can_change_status: boolean;
  status_locked_reason: string | null;
};
