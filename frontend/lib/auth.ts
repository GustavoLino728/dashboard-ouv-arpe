const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ========================== TIPOS ==========================================

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
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

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
  }
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

export function saveTokens(tokens: AuthTokens): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    if (typeof window !== "undefined") {
      document.cookie = `arpe-access-token=${tokens.access_token}; path=/; SameSite=Strict; max-age=${8 * 3600}`;
    }
  } catch {
    console.warn("[Auth] Não foi possível salvar tokens.");
  }
}

export function saveUser(user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch {
    console.warn("[Auth] Não foi possível salvar usuário.");
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    if (typeof window !== "undefined") {
      document.cookie =
        "arpe-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
    }
  } catch {
    /* ignore */
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// ========================== API CALLS ======================================

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
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
      /* ignore */
    }
    throw new AuthError(detail, res.status);
  }

  const tokens: AuthTokens = await res.json();
  saveTokens(tokens);

  const user = await fetchCurrentUser(tokens.access_token);
  saveUser(user);
  return user;
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new AuthError("Não foi possível obter dados do usuário", res.status);
  }

  return (await res.json()) as AuthUser;
}

export function logout(): void {
  clearAuth();
}