import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHouseholds } from '@/hooks/useHousehold';
import { useItems } from '@/hooks/useItems';
import ItemList from '@/components/items/ItemList';
import ItemForm from '@/components/items/ItemForm';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { PantryItem, ItemCreate } from '@/types';
import { useAddItem, useUpdateItem, useDeleteItem } from '@/hooks/useItems';

export default function DashboardPage() {
  const { data: households, isLoading: householdsLoading } = useHouseholds();
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>('');
  const [editItem, setEditItem] = useState<PantryItem | null>(null);

  const householdId = selectedHouseholdId || households?.[0]?.id || '';
  const { grouped, isLoading: itemsLoading } = useItems(householdId);
  const addItem = useAddItem(householdId);
  const updateItem = useUpdateItem(householdId);
  const deleteItem = useDeleteItem(householdId);

  if (householdsLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!households || households.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Welcome to FridgeCheck</h2>
        <p className="mt-2 text-gray-600">Create a household or join one to get started.</p>
        <Link
          to="/households"
          className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Manage Households
        </Link>
      </div>
    );
  }

  const totalItems = Object.values(grouped).reduce((sum, g) => sum + g.length, 0);

  const handleEditSubmit = (data: ItemCreate) => {
    if (editItem) {
      updateItem.mutate(
        { itemId: editItem.id, data },
        { onSuccess: () => setEditItem(null) }
      );
    }
  };

  return (
    <div>
      {/* Household selector */}
      {households.length > 1 && (
        <div className="mb-6">
          <select
            value={householdId}
            onChange={(e) => setSelectedHouseholdId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          <p className="text-xs text-gray-500">Total Items</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-red-600">{grouped.expired.length}</p>
          <p className="text-xs text-gray-500">Expired</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-orange-600">{grouped.today.length}</p>
          <p className="text-xs text-gray-500">Expiring Today</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-yellow-600">{grouped.this_week.length}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </Card>
      </div>

      {/* Quick add button */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pantry</h2>
        <Link
          to="/add-item"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add Item
        </Link>
      </div>

      {/* Item list */}
      {itemsLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <ItemList
          grouped={grouped}
          onEdit={(item) => setEditItem(item)}
          onDelete={(id) => deleteItem.mutate(id)}
        />
      )}

      {/* Edit modal */}
      <Modal
        isOpen={editItem !== null}
        onClose={() => setEditItem(null)}
        title="Edit Item"
      >
        {editItem && (
          <ItemForm
            editItem={editItem}
            onSubmit={handleEditSubmit}
            loading={updateItem.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
