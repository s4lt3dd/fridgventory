import { apiClient } from "./client";
import { Household, HouseholdMember, InviteLinkResponse } from "@/types";

export const householdsApi = {
  list: async (): Promise<Household[]> => {
    const { data } = await apiClient.get<Household[]>("/households");
    return data;
  },

  create: async (name: string): Promise<Household> => {
    const { data } = await apiClient.post<Household>("/households", { name });
    return data;
  },

  get: async (id: string): Promise<Household> => {
    const { data } = await apiClient.get<Household>(`/households/${id}`);
    return data;
  },

  getMembers: async (id: string): Promise<HouseholdMember[]> => {
    const { data } = await apiClient.get<HouseholdMember[]>(
      `/households/${id}/members`,
    );
    return data;
  },

  getInviteLink: async (id: string): Promise<InviteLinkResponse> => {
    const { data } = await apiClient.get<InviteLinkResponse>(
      `/households/${id}/invite`,
    );
    return data;
  },

  regenerateInvite: async (id: string): Promise<InviteLinkResponse> => {
    const { data } = await apiClient.post<InviteLinkResponse>(
      `/households/${id}/invite/regenerate`,
    );
    return data;
  },

  join: async (inviteToken: string): Promise<Household> => {
    const { data } = await apiClient.post<Household>("/households/join", {
      invite_token: inviteToken,
    });
    return data;
  },

  rename: async (id: string, name: string): Promise<Household> => {
    const { data } = await apiClient.patch<Household>(`/households/${id}`, {
      name,
    });
    return data;
  },
};
