import type { GroupedItems, PantryItem } from '@/types';
import { URGENCY_ORDER } from '@/utils/urgency';
import UrgencyGroup from './UrgencyGroup';
import { Link } from 'react-router-dom';

interface ItemListProps {
  grouped: GroupedItems;
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

export default function ItemList({ grouped, onEdit, onDelete }: ItemListProps) {
  const totalItems = Object.values(grouped).reduce((sum, g) => sum + g.length, 0);

  if (totalItems === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-lg font-medium text-gray-600">Your pantry is empty</p>
        <p className="mt-1 text-sm text-gray-500">Start by adding items to track</p>
        <Link
          to="/add-item"
          className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add your first item
        </Link>
      </div>
    );
  }

  return (
    <div>
      {URGENCY_ORDER.map((urgency) => (
        <UrgencyGroup
          key={urgency}
          urgency={urgency}
          items={grouped[urgency]}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
