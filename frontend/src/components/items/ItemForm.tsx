import { lazy, Suspense, useState } from 'react';
import clsx from 'clsx';
import { ScanLine, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import type { ItemCreate, ItemCategory, PantryItem } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CategoryIcon from '@/components/ui/CategoryIcon';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
const BarcodeScanner = lazy(() => import('@/components/items/BarcodeScanner'));
import { todayInputValue, futureDateInputValue } from '@/utils/date';
import { isNotPastDate, isPositiveQuantity } from '@/utils/validation';
import { lookupBarcode } from '@/api/openFoodFacts';

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
  onCancel?: () => void;
}

export default function ItemForm({ onSubmit, editItem, loading, onCancel }: ItemFormProps) {
  const [name, setName] = useState(editItem?.name ?? '');
  const [category, setCategory] = useState<ItemCategory>(editItem?.category ?? 'other');
  const [quantity, setQuantity] = useState(String(editItem?.quantity ?? 1));
  const [unit, setUnit] = useState(editItem?.unit ?? 'pieces');
  const [expiryDate, setExpiryDate] = useState(editItem?.expiry_date ?? futureDateInputValue(7));
  const [notes, setNotes] = useState(editItem?.notes ?? '');
  const [nameError, setNameError] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<
    'idle' | 'loading' | 'success' | 'not_found' | 'error'
  >('idle');
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);

  const runLookup = async (code: string) => {
    setLookupStatus('loading');
    setLastBarcode(code);
    try {
      const info = await lookupBarcode(code);
      if (!info) {
        setLookupStatus('not_found');
        return;
      }
      if (info.name) setName(info.name);
      setCategory(info.category);
      setExpiryDate(futureDateInputValue(info.defaultExpiryDays));
      setNameError('');
      setExpiryError('');
      setLookupStatus('success');
    } catch {
      setLookupStatus('error');
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setScannerOpen(false);
    void runLookup(code);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) setNameError('');
    const key = value.toLowerCase().trim();
    if (key in COMMON_ITEMS && !editItem) {
      setCategory(COMMON_ITEMS[key].category);
      setExpiryDate(futureDateInputValue(COMMON_ITEMS[key].shelfDays));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!name.trim()) {
      setNameError('Please give this item a name.');
      hasError = true;
    } else {
      setNameError('');
    }
    if (!isPositiveQuantity(quantity)) {
      setQuantityError('Quantity must be greater than 0.');
      hasError = true;
    } else {
      setQuantityError('');
    }
    if (!isNotPastDate(expiryDate)) {
      setExpiryError('Expiry date must be today or later.');
      hasError = true;
    } else {
      setExpiryError('');
    }
    if (hasError) return;
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setScannerOpen(true)}
          className="w-full"
        >
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          Scan barcode
        </Button>
      </div>

      {lookupStatus === 'loading' && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-text-primary motion-safe:animate-[fadeIn_150ms_ease-out]"
        >
          <LoadingSpinner size="sm" />
          <span>Looking up product...</span>
        </div>
      )}

      {lookupStatus === 'success' && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-expiry-safe/30 bg-expiry-safe/10 p-3 text-sm font-semibold text-expiry-safe motion-safe:animate-[fadeIn_150ms_ease-out]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>Prefilled from barcode — review before saving.</span>
        </div>
      )}

      {lookupStatus === 'not_found' && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-expiry-warning/30 bg-expiry-warning/10 p-3 text-sm font-semibold text-expiry-warning motion-safe:animate-[fadeIn_150ms_ease-out]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>Barcode not recognised — please fill in manually.</span>
        </div>
      )}

      {lookupStatus === 'error' && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary motion-safe:animate-[fadeIn_150ms_ease-out]"
        >
          <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">Couldn&apos;t look up barcode. Check your connection.</span>
          {lastBarcode && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void runLookup(lastBarcode)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onClose={() => setScannerOpen(false)}
          />
        </Suspense>
      )}

      <Input
        label="Item name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="e.g. Milk, Bananas, Chicken..."
        error={nameError}
        required
      />

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text-primary">Category</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const selected = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={selected}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border px-2 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-primary/50 hover:text-primary',
                )}
              >
                <CategoryIcon category={c.value} size={20} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Quantity"
          type="number"
          min="0.1"
          step="0.1"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            if (quantityError) setQuantityError('');
          }}
          error={quantityError}
          required
        />
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-primary">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="block h-[50px] w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 text-base text-text-primary transition-all duration-150 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 cursor-pointer"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Expiry date"
        type="date"
        min={todayInputValue()}
        value={expiryDate}
        onChange={(e) => {
          setExpiryDate(e.target.value);
          if (expiryError) setExpiryError('');
        }}
        error={expiryError}
        required
      />

      <Input
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Organic, from the corner shop..."
      />

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading} className="flex-1">
          {editItem ? 'Save changes' : 'Add to fridge'}
        </Button>
      </div>
    </form>
  );
}
