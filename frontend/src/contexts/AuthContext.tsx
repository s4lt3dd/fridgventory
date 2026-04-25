import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import {
  setTokens,
  clearTokens,
  getRefreshToken,
  getAccessToken,
} from "@/api/client";
import { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Try fetching current user with stored access token
        const userData = await authApi.me();
        setUser(userData);
      } catch {
        // Access token expired — try refreshing
        if (refreshToken) {
          try {
            const tokens = await authApi.refresh(refreshToken);
            setTokens(tokens.access_token, tokens.refresh_token);
            const userData = await authApi.me();
            setUser(userData);
          } catch {
            clearTokens();
          }
        } else {
          clearTokens();
        }
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      // Clear any cached queries from a previous session before signing in as
      // a new user, otherwise stale data (households, items…) keyed without a
      // user id can briefly bleed across accounts.
      queryClient.clear();
      const tokens = await authApi.login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const userData = await authApi.me();
      setUser(userData);
    },
    [queryClient],
  );

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      queryClient.clear();
      const tokens = await authApi.register(email, username, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const userData = await authApi.me();
      setUser(userData);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout errors — clear locally regardless
      }
    }
    clearTokens();
    setUser(null);
    // Drop every cached query so the next user doesn't see stale data.
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
