const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ========================== TIPOS ==========================================

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface AuthUser {
  id: string | number;
  email: string;
  name: string;
  is_active: boolean;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ========================== STORAGE ========================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: "arpe-access-token",
  REFRESH_TOKEN: "arpe-refresh-token",
  USER: "arpe-user",
} as const;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: AuthTokens): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    }
    
    // Salvar em cookie para o Next.js middleware (server-side)
    if (typeof window !== "undefined") {
      document.cookie = `arpe-access-token=${tokens.access_token}; path=/; SameSite=Strict; max-age=${8 * 3600}`;
    }
  } catch {
    console.warn("[Auth] Não foi possível salvar tokens no localStorage.");
  }
}

function saveUser(user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch {
    console.warn("[Auth] Não foi possível salvar usuário no localStorage.");
  }
}

function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    
    // Limpar cookie
    if (typeof window !== "undefined") {
      document.cookie = "arpe-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
    }
  } catch {
    // silently ignore
  }
}

// ========================== API CALLS ======================================

/** Erro de autenticação. */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Realiza login com email e senha.
 * Envia como JSON para o endpoint /api/v1/auth/login.
 * Em caso de falha de conexão, usa mock para demonstração.
 */
export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const url = `${API_BASE}/api/v1/auth/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!res.ok) {
      let detail = "Credenciais inválidas";
      try {
        const body = await res.json();
        detail = body.detail ?? detail;
      } catch {
        // ignora parsing errors
      }
      throw new AuthError(detail, res.status);
    }

    const tokens: AuthTokens = await res.json();
    saveTokens(tokens);

    // Buscar dados do usuário autenticado
    const user = await fetchCurrentUser(tokens.access_token);
    saveUser(user);
    return user;
  } catch (err) {
    if (err instanceof AuthError) throw err;

    // Backend offline → mock para demonstração
    console.warn("[Auth] Backend indisponível. Usando login mock.", err);
    return handleMockLogin(credentials);
  }
}

/**
 * Busca os dados do usuário autenticado via /api/v1/auth/me.
 */
async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const url = `${API_BASE}/api/v1/auth/me`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("api-unauthorized"));
      }
    }
    throw new AuthError("Não foi possível obter dados do usuário", res.status);
  }

  return (await res.json()) as AuthUser;
}

/**
 * Tenta renovar o access token usando o refresh token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const url = `${API_BASE}/api/v1/auth/refresh`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const data = await res.json();
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    } catch {
      // silently ignore
    }
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Faz logout — limpa todos os dados de sessão.
 */
export function logout(): void {
  clearAuth();
}

/**
 * Verifica se há um token de acesso salvo (check rápido, sem validação).
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// ========================== MOCK LOGIN =====================================

const MOCK_USER: AuthUser = {
  id: 1,
  email: "usuario@arpe.pe.gov.br",
  name: "Usuário Demo",
  is_active: true,
  role: "admin",
};

function handleMockLogin(credentials: LoginCredentials): AuthUser {
  // Aceitar qualquer email válido com senha >= 4 chars para demo
  if (!credentials.email.includes("@") || credentials.password.length < 4) {
    throw new AuthError("E-mail ou senha incorretos");
  }

  const mockTokens: AuthTokens = {
    access_token: `mock-access-${Date.now()}`,
    refresh_token: `mock-refresh-${Date.now()}`,
    token_type: "bearer",
  };

  let role = "admin";
  if (credentials.email.startsWith("coordenador")) {
    role = "coordenador";
  } else if (credentials.email.startsWith("servidor")) {
    role = "servidor";
  }

  const mockUser: AuthUser = {
    ...MOCK_USER,
    email: credentials.email,
    name: credentials.email.split("@")[0].replace(/[._-]/g, " "),
    role: role,
  };

  saveTokens(mockTokens);
  saveUser(mockUser);
  return mockUser;
}
