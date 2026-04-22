import { apiClient } from './client';
import { AuthTokens, User } from '@/types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  register: async (
    email: string,
    username: string,
    password: string
  ): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/register', {
      email,
      username,
      password,
    });
    return data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken });
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
};
