/** Initials from a display name (e.g. "Carlos M." → "CM", "Usuario" → "U"). */
export function displayInitials(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const SIZE_CLASS: Record<28 | 32 | 44, { box: string; text: string }> = {
  28: { box: 'w-7 h-7', text: 'text-[10px]' },
  32: { box: 'w-8 h-8', text: 'text-[11px]' },
  44: { box: 'w-11 h-11', text: 'text-[13px]' },
};

type AvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  /** Matches the panel sizes already in use. Default 28 (w-7 h-7). */
  size?: 28 | 32 | 44;
  className?: string;
};

/**
 * Same circle as before: photo when present; if not, initials inside the empty circle.
 */
export function Avatar({ name, photoUrl, size = 28, className = '' }: AvatarProps) {
  const { box, text } = SIZE_CLASS[size];
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${box} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      className={
        `${box} rounded-full bg-white/10 text-white/70 font-semibold ` +
        `${text} flex items-center justify-center shrink-0 select-none ${className}`
      }
      aria-hidden
    >
      {displayInitials(name)}
    </div>
  );
}
