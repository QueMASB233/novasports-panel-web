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

export type RankingSummary = {
  id: string;
  ranking_type: RankingType;
  ranking_type_label: string;
  display_name: string;
  country: string | null;
  age_bracket: string | null;
  age_bracket_label: string | null;
  fip_sub_category: string | null;
  ranking_scope: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  entry_count?: number;
  matched_count?: number;
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

export type MetaOption = { id: string; label: string; ovr?: number };
export type CountryOption = { code: string; name: string };
export type EntryColumn = {
  key: string;
  label: string;
  hint?: string;
  ranking_types?: string[];
};
export type OvrRow = { max_position: number; ovr: number };

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

export type Meta = {
  ranking_types: MetaOption[];
  age_brackets: MetaOption[];
  fip_sub_categories: MetaOption[];
  national_categories: MetaOption[];
  countries: CountryOption[];
  entry_columns?: EntryColumn[];
  ovr_reference: Record<
    string,
    { table: OvrRow[]; beyond: string }
  >;
  csv_formats?: Record<string, CsvFormat>;
  create_ranking_bodies?: Record<string, RankingCreateSpec>;
};

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'blocked';

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
  role: string | null;
  account_status: AccountStatus | null;
  account_status_reason: string | null;
  suspended_until: string | null;
  overall_rating: number | null;
  overall_rating_override: number | null;
  wizard_granted?: boolean;
  created_at: string | null;
  updated_at: string | null;
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
};
