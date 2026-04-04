import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { householdsApi } from '@/api/households';

const householdKeys = {
  all: () => ['households'] as const,
  single: (id: string) => ['households', id] as const,
  members: (id: string) => ['households', id, 'members'] as const,
  invite: (id: string) => ['households', id, 'invite'] as const,
};

export function useHouseholds() {
  return useQuery({
    queryKey: householdKeys.all(),
    queryFn: householdsApi.list,
    staleTime: 1000 * 60 * 5,
  });
}

export function useHousehold(id: string) {
  return useQuery({
    queryKey: householdKeys.single(id),
    queryFn: () => householdsApi.get(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useHouseholdMembers(id: string) {
  return useQuery({
    queryKey: householdKeys.members(id),
    queryFn: () => householdsApi.getMembers(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useInviteLink(id: string) {
  return useQuery({
    queryKey: householdKeys.invite(id),
    queryFn: () => householdsApi.getInviteLink(id),
    enabled: !!id,
    staleTime: 0, // Always fresh
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => householdsApi.create(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: householdKeys.all() });
    },
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteToken: string) => householdsApi.join(inviteToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: householdKeys.all() });
    },
  });
}

export function useRegenerateInvite(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => householdsApi.regenerateInvite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: householdKeys.invite(id),
      });
    },
  });
}

export function useRenameHousehold(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => householdsApi.rename(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: householdKeys.all() });
      void queryClient.invalidateQueries({
        queryKey: householdKeys.single(id),
      });
    },
  });
}
