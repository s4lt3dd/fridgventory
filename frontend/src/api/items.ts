import { apiClient } from './client';
import { PantryItem, ItemCreate } from '@/types';

export const itemsApi = {
  list: async (householdId: string): Promise<PantryItem[]> => {
    const { data } = await apiClient.get<PantryItem[]>(
      `/households/${householdId}/items`
    );
    return data;
  },

  create: async (householdId: string, item: ItemCreate): Promise<PantryItem> => {
    const { data } = await apiClient.post<PantryItem>(
      `/households/${householdId}/items`,
      item
    );
    return data;
  },

  update: async (
    householdId: string,
    itemId: string,
    updates: Partial<ItemCreate>
  ): Promise<PantryItem> => {
    const { data } = await apiClient.patch<PantryItem>(
      `/households/${householdId}/items/${itemId}`,
      updates
    );
    return data;
  },

  delete: async (householdId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/households/${householdId}/items/${itemId}`);
  },

  getExpiring: async (householdId: string): Promise<PantryItem[]> => {
    const { data } = await apiClient.get<PantryItem[]>(
      `/households/${householdId}/items/expiring`
    );
    return data;
  },
};
