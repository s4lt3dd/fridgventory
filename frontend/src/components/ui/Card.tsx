import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-[var(--radius-lg)] bg-surface p-[var(--space-lg)] shadow-md border border-border/40',
        hover && 'hover-lift cursor-pointer',
        onClick && !hover && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
