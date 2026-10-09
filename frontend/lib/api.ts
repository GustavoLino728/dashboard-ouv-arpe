import {
  OuvidoriaComparison,
  OuvidoriaEvolution,
  OuvidoriaFilters,
  OuvidoriaKpis,
  DeleteUploadResponse,
  ManifestacoesResponse,
  UploadPlanilhaItem,
  UploadPlanilhaResponse,
} from "./api-types";
import {
  ApiUser,
  ApiUserCreate,
  ApiUserUpdate,
} from "./api-types";
export * from "./api-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const PUBLIC_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/register",
];

const STORAGE_KEYS = {
  ACCESS_TOKEN: "arpe-access-token",
  REFRESH_TOKEN: "arpe-refresh-token",
  USER: "arpe-user",
} as const;

// ========================== STORAGE HELPERS ================================

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

function setAccessToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    document.cookie = `arpe-access-token=${token}; path=/; SameSite=Strict; max-age=${8 * 3600}`;
  } catch {
    /* ignore */
  }
}

function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch {
    /* ignore */
  }
}

function clearAuthStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    document.cookie =
      "arpe-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
  } catch {
    /* ignore */
  }
}

// ========================== REFRESH COM MUTEX ==============================

let refreshPromise: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.access_token) return null;

    setAccessToken(data.access_token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    return data.access_token as string;
  } catch {
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ========================== API ERROR ======================================

export class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "ApiError";
  }
}

// ========================== API FETCH ======================================

type ApiFetchInit = RequestInit & { skipAuth?: boolean; _isRetry?: boolean };

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const skipAuth = init?.skipAuth === true || isPublic;
  const isRetry = init?._isRetry === true;

  const headers = new Headers(init?.headers);
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    const { skipAuth: _s, _isRetry: _r, ...fetchInit } = init ?? {};
    res = await fetch(url, { ...fetchInit, headers });
  } catch {
    throw new ApiError("Nao foi possivel conectar ao servidor de API.", 503);
  }

  // 401 em rota protegida: tenta refresh e refaz UMA vez
  if (res.status === 401 && !skipAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...init, _isRetry: true });
    }
    clearAuthStorage();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("api-unauthorized"));
    }
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ========================== HELPERS DE QUERY ===============================

function buildOuvidoriaQuery(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "todos") {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

// ========================== EXPORTS ========================================

export async function fetchOuvidoriaFilters(): Promise<OuvidoriaFilters> {
  return apiFetch<OuvidoriaFilters>("/api/v1/filters");
}

export async function fetchOuvidoriaKpis(
  filters: Record<string, string | number | undefined> = {}
): Promise<OuvidoriaKpis> {
  return apiFetch<OuvidoriaKpis>(
    `/api/v1/dashboard/kpis${buildOuvidoriaQuery(filters)}`
  );
}

export async function fetchOuvidoriaEvolution(
  filters: Record<string, string | number | undefined> = {}
): Promise<OuvidoriaEvolution> {
  return apiFetch<OuvidoriaEvolution>(
    `/api/v1/dashboard/evolution${buildOuvidoriaQuery(filters)}`
  );
}

export async function fetchOuvidoriaComparison(
  filters: Record<string, string | number | undefined> = {}
): Promise<OuvidoriaComparison> {
  return apiFetch<OuvidoriaComparison>(
    `/api/v1/dashboard/call-center-comparison${buildOuvidoriaQuery(filters)}`
  );
}

export async function fetchUploads(): Promise<UploadPlanilhaItem[]> {
  return apiFetch<UploadPlanilhaItem[]>("/api/v1/uploads");
}

export async function uploadPlanilha(
  file: File,
  nomePlanilha?: string
): Promise<UploadPlanilhaResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (nomePlanilha?.trim()) {
    formData.append("nome_planilha", nomePlanilha.trim());
  }

  return apiFetch<UploadPlanilhaResponse>("/api/v1/uploads", {
    method: "POST",
    body: formData,
  });
}

export async function deleteUpload(uploadId: number): Promise<DeleteUploadResponse> {
  return apiFetch<DeleteUploadResponse>(`/api/v1/uploads/${uploadId}`, {
    method: "DELETE",
  });
}

export async function fetchManifestacoes(
  filters: Record<string, string | number | undefined> = {}
): Promise<ManifestacoesResponse> {
  return apiFetch<ManifestacoesResponse>(
    `/api/v1/manifestacoes${buildOuvidoriaQuery(filters)}`
  );
}

export async function fetchUsers(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>("/api/v1/users");
}

export async function createUser(data: ApiUserCreate): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/v1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  userId: string,
  data: ApiUserUpdate
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/${userId}`, {
    method: "DELETE",
  });
}