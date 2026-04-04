import { useState } from 'react';
import type { ItemCreate, ItemCategory, PantryItem } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { todayInputValue, futureDateInputValue } from '@/utils/date';

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'canned', label: 'Canned' },
  { value: 'dry_goods', label: 'Dry Goods' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'condiments', label: 'Condiments' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'other', label: 'Other' },
];

const UNITS = ['pieces', 'kg', 'g', 'lb', 'oz', 'litres', 'ml', 'cups', 'packs', 'cans', 'bottles', 'loaves', 'dozen'];

const COMMON_ITEMS: Record<string, { category: ItemCategory; shelfDays: number }> = {
  milk: { category: 'dairy', shelfDays: 7 },
  eggs: { category: 'dairy', shelfDays: 21 },
  bread: { category: 'bakery', shelfDays: 5 },
  chicken: { category: 'meat', shelfDays: 3 },
  apples: { category: 'produce', shelfDays: 14 },
  bananas: { category: 'produce', shelfDays: 5 },
  cheese: { category: 'dairy', shelfDays: 14 },
  yogurt: { category: 'dairy', shelfDays: 10 },
  rice: { category: 'dry_goods', shelfDays: 365 },
  pasta: { category: 'dry_goods', shelfDays: 365 },
};

interface ItemFormProps {
  onSubmit: (item: ItemCreate) => void;
  editItem?: PantryItem;
  loading?: boolean;
}

export default function ItemForm({ onSubmit, editItem, loading }: ItemFormProps) {
  const [name, setName] = useState(editItem?.name ?? '');
  const [category, setCategory] = useState<ItemCategory>(editItem?.category ?? 'other');
  const [quantity, setQuantity] = useState(String(editItem?.quantity ?? 1));
  const [unit, setUnit] = useState(editItem?.unit ?? 'pieces');
  const [expiryDate, setExpiryDate] = useState(editItem?.expiry_date ?? futureDateInputValue(7));
  const [notes, setNotes] = useState(editItem?.notes ?? '');

  const handleNameChange = (value: string) => {
    setName(value);
    const key = value.toLowerCase().trim();
    if (key in COMMON_ITEMS && !editItem) {
      setCategory(COMMON_ITEMS[key].category);
      setExpiryDate(futureDateInputValue(COMMON_ITEMS[key].shelfDays));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      category,
      quantity: Number(quantity),
      unit,
      expiry_date: expiryDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Item name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="e.g. Milk, Bananas, Chicken..."
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ItemCategory)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Quantity"
          type="number"
          min="0.1"
          step="0.1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <Input
          label="Expiry date"
          type="date"
          min={todayInputValue()}
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          required
        />
      </div>

      <Input
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Organic, from Tesco..."
      />

      <Button type="submit" loading={loading} className="w-full">
        {editItem ? 'Update Item' : 'Add Item'}
      </Button>
    </form>
  );
}
