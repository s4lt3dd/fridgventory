import clsx from 'clsx';
import type { UrgencyLevel } from '@/types';
import { urgencyConfig } from '@/utils/urgency';

interface BadgeProps {
  urgency: UrgencyLevel;
  className?: string;
}

export default function Badge({ urgency, className }: BadgeProps) {
  const config = urgencyConfig[urgency];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {config.label}
    </span>
  );
}
