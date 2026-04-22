import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useHouseholds } from '@/hooks/useHousehold';
import { useAddItem } from '@/hooks/useItems';
import ItemForm from '@/components/items/ItemForm';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import type { ItemCreate } from '@/types';

export default function AddItemPage() {
  const navigate = useNavigate();
  const {
    data: households,
    isLoading,
    isError: householdsError,
    refetch: refetchHouseholds,
  } = useHouseholds();
  const [selectedId, setSelectedId] = useState('');
  const [submitError, setSubmitError] = useState('');

  const householdId = selectedId || households?.[0]?.id || '';
  const addItem = useAddItem(householdId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (householdsError) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Couldn't load households"
        description="We couldn't fetch your households. Check your connection and try again."
        action={<Button onClick={() => void refetchHouseholds()}>Try again</Button>}
      />
    );
  }

  if (!households || households.length === 0) {
    return (
      <EmptyState
        title="No household yet"
        description="Create or join a household before you can start adding items."
        action={
          <Link to="/app/households">
            <Button>Set up a household</Button>
          </Link>
        }
      />
    );
  }

  const handleSubmit = (data: ItemCreate) => {
    setSubmitError('');
    addItem.mutate(data, {
      onSuccess: () => navigate('/app/dashboard'),
      onError: () => setSubmitError("Couldn't add that item. Please try again."),
    });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full p-2 text-text-muted transition-colors duration-150 hover:bg-surface hover:text-primary cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-3xl sm:text-4xl leading-none text-text-primary">Add an item</h1>
      </div>

      {households.length > 1 && (
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-text-primary">Household</label>
          <select
            value={householdId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="block h-[50px] w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 text-base text-text-primary transition-all duration-150 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 cursor-pointer"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mb-4 rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary"
        >
          {submitError}
        </div>
      )}

      <Card>
        <ItemForm
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          loading={addItem.isPending}
        />
      </Card>
    </div>
  );
}
