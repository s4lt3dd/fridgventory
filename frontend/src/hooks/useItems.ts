import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsApi } from "@/api/items";
import { PantryItem, ItemCreate, GroupedItems } from "@/types";
import { groupItemsByUrgency } from "@/utils/urgency";

const itemKeys = {
  all: (householdId: string) => ["items", householdId] as const,
  expiring: (householdId: string) =>
    ["items", householdId, "expiring"] as const,
};

export function useItems(householdId: string) {
  const result = useQuery({
    queryKey: itemKeys.all(householdId),
    queryFn: () => itemsApi.list(householdId),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const grouped: GroupedItems = groupItemsByUrgency(result.data ?? []);

  return { ...result, grouped };
}

export function useExpiringItems(householdId: string) {
  return useQuery({
    queryKey: itemKeys.expiring(householdId),
    queryFn: () => itemsApi.getExpiring(householdId),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddItem(householdId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ItemCreate) => itemsApi.create(householdId, item),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(householdId),
      });
      void queryClient.invalidateQueries({
        queryKey: itemKeys.expiring(householdId),
      });
    },
  });
}

interface UpdateItemVariables {
  itemId: string;
  data: Partial<ItemCreate>;
}

export function useUpdateItem(householdId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: UpdateItemVariables) =>
      itemsApi.update(householdId, itemId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(householdId),
      });
    },
  });
}

export function useDeleteItem(householdId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => itemsApi.delete(householdId, itemId),
    onMutate: async (itemId: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: itemKeys.all(householdId) });
      const previous = queryClient.getQueryData<PantryItem[]>(
        itemKeys.all(householdId),
      );
      queryClient.setQueryData<PantryItem[]>(itemKeys.all(householdId), (old) =>
        (old ?? []).filter((item) => item.id !== itemId),
      );
      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(itemKeys.all(householdId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(householdId),
      });
    },
  });
}
