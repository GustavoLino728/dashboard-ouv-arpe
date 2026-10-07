import type { OuvidoriaFilters } from "@/lib/api";

export type FiltrosManifestacoes = {
  ano_mes_inicio?: string;
  ano_mes_fim?: string;
  origem?: string;
  assunto?: string;
  subassunto?: string;
};

export type KpiId =
  | "total-periodo"
  | "media-mensal"
  | "mes-pico"
  | "mes-menor-volume"
  | "call-center-compesa"
  | "participacao-call-center"
  | "mom-ultimo-mes"
  | "base-comparativa";

/**
 * Constrói a URL de manifestações preservando os filtros correntes do dashboard.
 * Filtros passados em `override` sobrescrevem os da base.
 */
export function buildManifestacoesUrl(
  base: FiltrosManifestacoes,
  override: FiltrosManifestacoes = {}
): string {
  const merged: FiltrosManifestacoes = { ...base, ...override };
  const params = new URLSearchParams();
  Object.entries(merged).forEach(([key, value]) => {
    if (value && value !== "todos") params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `/manifestacoes?${qs}` : "/manifestacoes";
}

/**
 * Resolve, para cada KPI, quais filtros devem ser aplicados ao navegar.
 * Retorna `null` quando o KPI não é clicável.
 */
export function resolverFiltroKpi(
  kpiId: KpiId,
  contexto: {
    base: FiltrosManifestacoes;
    picoMes?: string | null;
    menorMes?: string | null;
    subassuntoCallCenter?: string | null;
  }
): FiltrosManifestacoes | null {
  const { base, picoMes, menorMes, subassuntoCallCenter } = contexto;

  switch (kpiId) {
    case "total-periodo":
      return { ...base };

    case "mes-pico": {
      if (!picoMes) return null;
      return { ...base, ano_mes_inicio: picoMes, ano_mes_fim: picoMes };
    }

    case "mes-menor-volume": {
      if (!menorMes) return null;
      return { ...base, ano_mes_inicio: menorMes, ano_mes_fim: menorMes };
    }

    case "call-center-compesa": {
      if (!subassuntoCallCenter) return null;
      return { ...base, subassunto: subassuntoCallCenter };
    }

    default:
      return null;
  }
}

export function resolverSubassuntoCallCenter(
  filters: OuvidoriaFilters | null
): string | null {
  const alvo = filters?.subassuntos?.find(
    (item) => item.label?.toLowerCase().includes("call center") &&
              item.label?.toLowerCase().includes("compesa")
  );
  return alvo?.value ?? null;
}