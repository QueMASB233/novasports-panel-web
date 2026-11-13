import type { CoachCertification, CoachSummary } from '@/types';
import { Avatar } from '@/ui/Avatar';

export function PersonCell({
  name, photoUrl, sub, fallbackName = 'Usuario',
}: {
  name: string | null | undefined;
  photoUrl: string | null | undefined;
  sub?: React.ReactNode;
  fallbackName?: string;
}) {
  const label = (name || '').trim() || fallbackName;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={label} photoUrl={photoUrl} size={32} />
      <div className="min-w-0">
        <div className="font-medium truncate">{label}</div>
        {sub && <div className="text-[11px] text-white/50">{sub}</div>}
      </div>
    </div>
  );
}

export function CoachCell({ coach }: { coach: CoachSummary | null }) {
  if (!coach) return <span className="text-white/40">—</span>;
  return (
    <PersonCell
      name={coach.full_name}
      photoUrl={coach.photo_url}
      fallbackName="Usuario"
      sub={coach.onboarding_completed ? 'Onboarding completo' : 'En onboarding'}
    />
  );
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

const CERT_STATUS_CLASS: Record<CoachCertification['status'], string> = {
  pending: 'border-amber-400/40 bg-amber-400/[.12] text-amber-200',
  approved: 'border-emerald-400/40 bg-emerald-400/[.12] text-emerald-200',
  rejected: 'border-red-400/40 bg-red-400/[.12] text-red-200',
};

const MODERATION_CLASS: Record<string, string> = {
  clean: 'border-emerald-400/30 bg-emerald-400/[.08] text-emerald-200/90',
  flagged: 'border-amber-400/40 bg-amber-400/[.12] text-amber-200',
  blocked: 'border-red-400/40 bg-red-400/[.12] text-red-200',
  skipped: 'border-line bg-white/[.04] text-white/55',
};

export function CertificationStatusBadge({ certification }: { certification: CoachCertification }) {
  return (
    <span className={`badge border ${CERT_STATUS_CLASS[certification.status]}`}>
      {certification.status_label}
      {certification.auto_rejected ? ' (automático)' : ''}
    </span>
  );
}

export function ModerationBadge({ certification }: { certification: CoachCertification }) {
  const m = certification.moderation;
  return (
    <span className={`badge border ${MODERATION_CLASS[m.status || 'skipped']}`} title="Google Vision">
      Vision: {m.status_label}
    </span>
  );
}
