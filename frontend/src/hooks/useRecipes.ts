import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '@/api/recipes';

export function useRecipeSuggestions(householdId: string) {
  return useQuery({
    queryKey: ['recipes', 'suggestions', householdId],
    queryFn: () => recipesApi.getSuggestions(householdId),
    enabled: !!householdId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
}
