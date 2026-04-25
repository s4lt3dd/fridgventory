import { apiClient } from "./client";
import { Recipe } from "@/types";

export const recipesApi = {
  getSuggestions: async (householdId: string): Promise<Recipe[]> => {
    const { data } = await apiClient.get<Recipe[]>(
      `/households/${householdId}/recipes`,
    );
    return data;
  },
};
