import type { Household } from '@/types';
import Card from '@/components/ui/Card';

interface HouseholdCardProps {
  household: Household;
  isSelected: boolean;
  onClick: () => void;
}

export default function HouseholdCard({ household, isSelected, onClick }: HouseholdCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'hover:border-gray-300'}`}
    >
      <button onClick={onClick} className="w-full text-left">
        <h3 className="text-sm font-semibold text-gray-900">{household.name}</h3>
        <p className="mt-1 text-xs text-gray-500">
          Created {new Date(household.created_at).toLocaleDateString()}
        </p>
      </button>
    </Card>
  );
}
