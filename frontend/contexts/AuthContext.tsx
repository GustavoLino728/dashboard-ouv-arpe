"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as authLogin,
  logout as authLogout,
  getStoredUser,
  isAuthenticated as checkAuth,
  refreshAccessToken,
  type AuthUser,
  type LoginCredentials,
  type AuthError,
} from "@/lib/auth";

// ========================== TIPOS ==========================================

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// ========================== CONTEXT ========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========================== PROVIDER =======================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sessão do localStorage ao montar e sincronizar com o backend
  useEffect(() => {
    const stored = getStoredUser();
    if (stored && checkAuth()) {
      setUser(stored);
      
      // Sincronizar dados atualizados do usuário (como roles) do banco de dados
      const token = localStorage.getItem("arpe-access-token");
      if (token) {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
        
        const fetchProfile = async (accessToken: string, isRetry = false) => {
          try {
            const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            
            if (res.ok) {
              const freshUser = await res.json();
              console.log("[AuthContext] Usuário sincronizado com o banco de dados:", freshUser);
              setUser(freshUser);
              localStorage.setItem("arpe-user", JSON.stringify(freshUser));
              return;
            }
            
            if (res.status === 401 && !isRetry) {
              console.log("[AuthContext] Token expirado ao buscar perfil. Tentando renovar...");
              const newToken = await refreshAccessToken();
              if (newToken) {
                await fetchProfile(newToken, true);
                return;
              }
            }
            
            throw new Error("Não foi possível validar a sessão com o servidor.");
          } catch (err) {
            console.warn("[AuthContext] Falha ao sincronizar perfil com o backend:", err);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("api-unauthorized"));
            }
          }
        };

        fetchProfile(token);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const loggedUser = await authLogin(credentials);
    setUser(loggedUser);
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  // Escutar eventos de token inválido/expirado
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("[AuthContext] Token inválido ou expirado detectado. Fazendo logout automático...");
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ========================== HOOK ===========================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
