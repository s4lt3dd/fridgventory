import { Link } from 'react-router-dom';
import { Refrigerator } from 'lucide-react';
import type { GroupedItems, PantryItem } from '@/types';
import { URGENCY_ORDER } from '@/utils/urgency';
import UrgencyGroup from './UrgencyGroup';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

interface ItemListProps {
  grouped: GroupedItems;
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}

export default function ItemList({ grouped, onEdit, onDelete }: ItemListProps) {
  const totalItems = Object.values(grouped).reduce((sum, g) => sum + g.length, 0);

  if (totalItems === 0) {
    return (
      <EmptyState
        icon={<Refrigerator className="h-10 w-10" />}
        title="Your fridge is empty"
        description="Start tracking what's inside so nothing goes to waste."
        action={
          <Link to="/app/add-item">
            <Button>Add your first item</Button>
          </Link>
        }
      />
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
