import { useNavigate } from 'react-router-dom';
import { useHouseholds } from '@/hooks/useHousehold';
import { useAddItem } from '@/hooks/useItems';
import ItemForm from '@/components/items/ItemForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { ItemCreate } from '@/types';
import { useState } from 'react';

export default function AddItemPage() {
  const navigate = useNavigate();
  const { data: households, isLoading } = useHouseholds();
  const [selectedId, setSelectedId] = useState('');

  const householdId = selectedId || households?.[0]?.id || '';
  const addItem = useAddItem(householdId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!households || households.length === 0) {
    return (
      <div className="py-12 text-center text-gray-600">
        Create a household first before adding items.
      </div>
    );
  }

  const handleSubmit = (data: ItemCreate) => {
    addItem.mutate(data, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Add Item</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
      </div>

      {households.length > 1 && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Household</label>
          <select
            value={householdId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <ItemForm onSubmit={handleSubmit} loading={addItem.isPending} />
      </div>
    </div>
  );
}
