export type Role = "admin" | "servidor" | string;

/** Apenas admins podem ver e operar planilhas (uploads). */
export function podeVerPlanilhas(role?: string | null): boolean {
  return role === "admin" || role === "coordenador";
}

/** Apenas admins podem ver e operar usuários. */
export function podeVerUsuarios(role?: string | null): boolean {
  return role === "admin" || role === "coordenador";
}