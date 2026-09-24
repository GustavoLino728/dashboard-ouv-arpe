import {
  OuvidoriaComparison,
  OuvidoriaEvolution,
  OuvidoriaFilters,
  OuvidoriaKpis,
  DeleteUploadResponse,
  UploadPlanilhaItem,
  UploadPlanilhaResponse,
} from "./api-types";

export * from "./api-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
      },
    });

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
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Nao foi possivel conectar ao servidor de API.", 503);
  }
}

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
