import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('rounded-xl border border-gray-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  );
}
