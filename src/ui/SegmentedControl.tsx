import { useLayoutEffect, useRef, useState } from 'react';

export type Segment<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  segments, value, onChange, ariaLabel, className,
}: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const el = btnRefs.current.get(value);
      if (!track || !el) return;
      const tr = track.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setThumb({ left: er.left - tr.left, width: er.width });
    };
    measure();
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, segments.map(s => s.id + s.label + (s.count ?? '')).join('|')]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      className={'segmented ' + (className || '')}
    >
      {thumb && (
        <div
          className="segmented-thumb"
          style={{
            transform: `translate3d(${thumb.left}px, 0, 0)`,
            width: thumb.width,
          }}
        />
      )}
      {segments.map(s => (
        <button
          key={s.id}
          ref={(el) => {
            if (el) btnRefs.current.set(s.id, el);
            else btnRefs.current.delete(s.id);
          }}
          type="button"
          role="tab"
          aria-selected={value === s.id}
          onClick={() => onChange(s.id)}
          className={'segmented-btn ' + (value === s.id ? 'active' : '')}
        >
          <span>{s.label}</span>
          {typeof s.count === 'number' && (
            <span className="segmented-count">{s.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
