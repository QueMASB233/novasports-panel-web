import type { RankingType } from '@/types';

const TYPE_STYLES: Record<RankingType, string> = {
  national: 'border-nova-blue/40 bg-nova-blue/[.12] text-[#7fb6ff]',
  country_open: 'border-nova-cyan/40 bg-nova-cyan/[.12] text-nova-cyan',
  fip: 'border-nova-gold/40 bg-nova-gold/[.12] text-nova-gold',
  fip_promises: 'border-nova-violet/40 bg-nova-violet/15 text-[#d7a3f8]',
};

export function TypeBadge({ type, label }: { type: RankingType; label: string }) {
  return (
    <span className={`badge border ${TYPE_STYLES[type]}`}>{label}</span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={
        'inline-block w-2 h-2 rounded-full ' +
        (active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/25')
      }
      title={active ? 'Activo' : 'Inactivo'}
    />
  );
}
