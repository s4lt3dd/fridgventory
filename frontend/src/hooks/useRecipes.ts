import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '@/api/recipes';
import { fetchRescueRecipes } from '@/api/rescueRecipes';

export function useRecipeSuggestions(householdId: string) {
  return useQuery({
    queryKey: ['recipes', 'suggestions', householdId],
    queryFn: () => recipesApi.getSuggestions(householdId),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}

export function useRescueRecipes(householdId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['rescue-recipes', householdId],
    queryFn: () => fetchRescueRecipes(householdId),
    enabled: enabled && !!householdId,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
