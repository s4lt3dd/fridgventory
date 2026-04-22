import { apiClient } from './client';
import type { RescueRecipesResponse } from '@/types';

export async function fetchRescueRecipes(
  householdId: string,
): Promise<RescueRecipesResponse> {
  const { data } = await apiClient.post<RescueRecipesResponse>(
    '/recipes/rescue',
    { household_id: householdId },
  );
  return data;
}
