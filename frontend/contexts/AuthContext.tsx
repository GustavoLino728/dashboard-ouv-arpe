"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as authLogin,
  logout as authLogout,
  getStoredUser,
  isAuthenticated as checkAuth,
  type AuthUser,
  type LoginCredentials,
} from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const stored = getStoredUser();
      if (stored && checkAuth()) {
        if (!cancelled) setUser(stored);
        try {
          const freshUser = await apiFetch<AuthUser>("/api/v1/auth/me");
          if (!cancelled) {
            setUser(freshUser);
            localStorage.setItem("arpe-user", JSON.stringify(freshUser));
          }
        } catch (err) {
          console.warn("[AuthContext] Falha ao sincronizar perfil:", err);
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const loggedUser = await authLogin(credentials);
    setUser(loggedUser);
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("[AuthContext] Sessão inválida. Fazendo logout.");
      logout();
    };
    window.addEventListener("api-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("api-unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}