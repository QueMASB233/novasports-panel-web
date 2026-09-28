type Props = {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
};

export function EmptyState({ title, hint, action, icon, compact }: Props) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center text-center px-6 ' +
        (compact ? 'py-10' : 'py-16')
      }
    >
      {icon && (
        <div className="mb-4 opacity-60 text-white/70">{icon}</div>
      )}
      <div className="text-[15px] font-medium text-white/85" style={{ letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {hint && (
        <div className="text-[13px] text-white/45 mt-1.5 max-w-sm leading-relaxed">
          {hint}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
