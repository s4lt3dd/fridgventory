import { useState } from 'react';
import clsx from 'clsx';
import type { UrgencyLevel, PantryItem } from '@/types';
import { urgencyConfig } from '@/utils/urgency';
import ItemCard from './ItemCard';

interface UrgencyGroupProps {
  urgency: UrgencyLevel;
  items: PantryItem[];
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

export default function UrgencyGroup({ urgency, items, onEdit, onDelete }: UrgencyGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const config = urgencyConfig[urgency];

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={clsx(
          'flex w-full items-center justify-between rounded-lg px-4 py-2.5',
          config.bgColor,
          config.borderColor,
          'border'
        )}
      >
        <span className={clsx('text-sm font-semibold', config.textColor)}>
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', config.textColor, config.bgColor)}>
            {items.length}
          </span>
          <svg
            className={clsx('h-4 w-4 transition-transform', config.textColor, collapsed && '-rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {!collapsed && (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
