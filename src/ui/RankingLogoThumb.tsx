const LOGO_ACCEPT = 'image/jpeg,image/png,image/webp';

export const RANKING_LOGO_HINT = 'Opcional. Recomendado 1:1 (cuadrado).';

export function RankingLogoThumb({
  url,
  size = 28,
  alt = 'Logo del ranking',
}: {
  url: string;
  size?: number;
  alt?: string;
}) {
  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover border border-white/15 bg-white/5"
      style={{ width: size, height: size }}
    />
  );
}

/** Círculo vacío (borde punteado), igual que el placeholder del editor. */
export function RankingLogoPlaceholder({ size = 28 }: { size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full border border-dashed border-white/20 bg-white/[.03]"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/** Logo o placeholder; para lista / celdas fijas. */
export function RankingLogoCell({
  url,
  size = 28,
}: {
  url?: string | null;
  size?: number;
}) {
  if (url) return <RankingLogoThumb url={url} size={size} alt="" />;
  return <RankingLogoPlaceholder size={size} />;
}

export function RankingLogoFileInput({
  id,
  onChange,
  disabled,
}: {
  id?: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="file"
      accept={LOGO_ACCEPT}
      disabled={disabled}
      className="block w-full text-[12px] text-white/60 file:mr-3 file:rounded-md file:border file:border-line file:bg-night-800 file:px-3 file:py-1.5 file:text-[12px] file:text-white/80 hover:file:bg-night-700"
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        onChange(file);
      }}
    />
  );
}
