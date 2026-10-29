/** OVR siempre entero para display (red de seguridad si llega decimal en caché). */
export function formatOvr(value: unknown): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return String(Math.round(n));
}
