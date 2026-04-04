import type { PantryItem } from '@/types';
import Badge from '@/components/ui/Badge';
import { formatShortDate, expiryLabel } from '@/utils/date';

interface ItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium text-gray-900">{item.name}</h3>
          <Badge urgency={item.urgency} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="capitalize">{item.category.replace('_', ' ')}</span>
          <span>
            {item.quantity} {item.unit}
          </span>
          <span title={formatShortDate(item.expiry_date)}>{expiryLabel(item.expiry_date)}</span>
        </div>
        {item.notes && <p className="mt-1 truncate text-xs text-gray-400">{item.notes}</p>}
      </div>
      <div className="ml-3 flex items-center gap-1">
        <button
          onClick={() => onEdit(item)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Edit"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Delete"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
