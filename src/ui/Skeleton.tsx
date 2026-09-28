type Props = {
  className?: string;
  width?: string | number;
  height?: string | number;
  radius?: string | number;
};

export function Skeleton({ className, width, height, radius }: Props) {
  return (
    <div
      className={'skeleton ' + (className || '')}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}

type RowsProps = {
  rows?: number;
  cols?: number;
  colSpans?: (number | string)[];
};

export function SkeletonRows({ rows = 6, cols = 4, colSpans }: RowsProps) {
  const arr = Array.from({ length: rows });
  return (
    <>
      {arr.map((_, r) => (
        <tr key={r} aria-hidden>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="td">
              <Skeleton
                height={12}
                width={colSpans?.[c] ?? (c === cols - 1 ? '35%' : c === 0 ? '65%' : '80%')}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
