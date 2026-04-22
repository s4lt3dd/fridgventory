import { ReactNode } from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)] bg-surface border border-border/40 px-6 py-12 text-center shadow-sm',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-subtle text-primary">
          {icon}
        </div>
      )}
      <h3 className="font-display text-4xl text-text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
