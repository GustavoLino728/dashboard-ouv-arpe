"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  fetchManifestacoes,
  fetchOuvidoriaFilters,
  ManifestacoesResponse,
  OuvidoriaFilters,
} from "@/lib/api";

const numberFmt = new Intl.NumberFormat("pt-BR");

const DEFAULT_VALOR = "todos";
const DEFAULT_PAGE_SIZE = 25;

function formatDate(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function shortText(value: string | null, fallback = "-") {
  if (!value) return fallback;
  return value;
}

export function ManifestacoesTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<OuvidoriaFilters | null>(null);
  const [data, setData] = useState<ManifestacoesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [anoMesInicio, setAnoMesInicio] = useState<string>(
    searchParams.get("ano_mes_inicio") ?? ""
  );
  const [anoMesFim, setAnoMesFim] = useState<string>(
    searchParams.get("ano_mes_fim") ?? ""
  );

  const [origem, setOrigem] = useState(
    searchParams.get("origem") ?? DEFAULT_VALOR
  );
  const [assunto, setAssunto] = useState(
    searchParams.get("assunto") ?? DEFAULT_VALOR
  );
  const [subassunto, setSubassunto] = useState(
    searchParams.get("subassunto") ?? DEFAULT_VALOR
  );
  const [situacao, setSituacao] = useState(
    searchParams.get("situacao") ?? DEFAULT_VALOR
  );
  const [tipoAtendimento, setTipoAtendimento] = useState(
    searchParams.get("tipo_atendimento") ?? DEFAULT_VALOR
  );
  const [diasMin, setDiasMin] = useState<string>(
    searchParams.get("dias_min") ?? ""
  );
  const [diasMax, setDiasMax] = useState<string>(
    searchParams.get("dias_max") ?? ""
  );

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [filtrosExpandidos, setFiltrosExpandidos] = useState(true);

  const primeiroMes = filters?.meses?.[0]?.value ?? "";
  const ultimoMes = filters?.meses?.[filters.meses.length - 1]?.value ?? "";
  const semDados = !!filters && filters.meses.length === 0;

  useEffect(() => {
    let cancelled = false;

    fetchOuvidoriaFilters()
      .then((f) => {
        if (!cancelled) setFilters(f);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar filtros.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!primeiroMes || !ultimoMes) return;
    if (!anoMesInicio) setAnoMesInicio(primeiroMes);
    if (!anoMesFim) setAnoMesFim(ultimoMes);
  }, [primeiroMes, ultimoMes, anoMesInicio, anoMesFim]);

  const query = useMemo(
    () => ({
      ano_mes_inicio: anoMesInicio || undefined,
      ano_mes_fim: anoMesFim || undefined,
      origem,
      assunto,
      subassunto,
      situacao,
      tipo_atendimento: tipoAtendimento,
      dias_min: diasMin === "" ? undefined : Number(diasMin),
      dias_max: diasMax === "" ? undefined : Number(diasMax),
      page,
      page_size: pageSize,
    }),
    [
      anoMesInicio,
      anoMesFim,
      origem,
      assunto,
      subassunto,
      situacao,
      tipoAtendimento,
      diasMin,
      diasMax,
      page,
      pageSize,
    ]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const manifestacoes = await fetchManifestacoes(query);
      setData(manifestacoes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar manifestações.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!anoMesInicio || !anoMesFim) return;

    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData, anoMesInicio, anoMesFim]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (anoMesInicio && primeiroMes && anoMesInicio !== primeiroMes) {
      params.set("ano_mes_inicio", anoMesInicio);
    }
    if (anoMesFim && ultimoMes && anoMesFim !== ultimoMes) {
      params.set("ano_mes_fim", anoMesFim);
    }
    if (origem !== DEFAULT_VALOR) params.set("origem", origem);
    if (assunto !== DEFAULT_VALOR) params.set("assunto", assunto);
    if (subassunto !== DEFAULT_VALOR) params.set("subassunto", subassunto);
    if (situacao !== DEFAULT_VALOR) params.set("situacao", situacao);
    if (tipoAtendimento !== DEFAULT_VALOR) params.set("tipo_atendimento", tipoAtendimento);
    if (diasMin !== "") params.set("dias_min", diasMin);
    if (diasMax !== "") params.set("dias_max", diasMax);

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    router.replace(target, { scroll: false });
  }, [
    anoMesInicio,
    anoMesFim,
    primeiroMes,
    ultimoMes,
    origem,
    assunto,
    subassunto,
    situacao,
    tipoAtendimento,
    diasMin,
    diasMax,
    pathname,
    router,
  ]);

  const resetToFirstPage = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
    setPageInput("1");
  };

  const resetFiltros = useCallback(() => {
    setAnoMesInicio(primeiroMes);
    setAnoMesFim(ultimoMes);
    setOrigem(DEFAULT_VALOR);
    setAssunto(DEFAULT_VALOR);
    setSubassunto(DEFAULT_VALOR);
    setSituacao(DEFAULT_VALOR);
    setTipoAtendimento(DEFAULT_VALOR);
    setDiasMin("");
    setDiasMax("");
    setPage(1);
    setPageInput("1");
    setPageSize(DEFAULT_PAGE_SIZE);
  }, [primeiroMes, ultimoMes]);

  const filtrosAtivos = useMemo(() => {
    const ativos: { key: string; label: string; clear: () => void }[] = [];

    if (primeiroMes && anoMesInicio !== primeiroMes) {
      ativos.push({
        key: "ano_mes_inicio",
        label: `Início: ${anoMesInicio}`,
        clear: () => setAnoMesInicio(primeiroMes),
      });
    }
    if (ultimoMes && anoMesFim !== ultimoMes) {
      ativos.push({
        key: "ano_mes_fim",
        label: `Fim: ${anoMesFim}`,
        clear: () => setAnoMesFim(ultimoMes),
      });
    }
    if (origem !== DEFAULT_VALOR) {
      ativos.push({
        key: "origem",
        label: `Origem: ${origem}`,
        clear: () => setOrigem(DEFAULT_VALOR),
      });
    }
    if (assunto !== DEFAULT_VALOR) {
      ativos.push({
        key: "assunto",
        label: `Assunto: ${assunto}`,
        clear: () => setAssunto(DEFAULT_VALOR),
      });
    }
    if (subassunto !== DEFAULT_VALOR) {
      ativos.push({
        key: "subassunto",
        label: `Subassunto: ${subassunto}`,
        clear: () => setSubassunto(DEFAULT_VALOR),
      });
    }
    if (situacao !== DEFAULT_VALOR) {
      ativos.push({
        key: "situacao",
        label: `Situação: ${situacao}`,
        clear: () => setSituacao(DEFAULT_VALOR),
      });
    }
    if (tipoAtendimento !== DEFAULT_VALOR) {
      ativos.push({
        key: "tipo_atendimento",
        label: `Tipo: ${tipoAtendimento}`,
        clear: () => setTipoAtendimento(DEFAULT_VALOR),
      });
    }
    if (diasMin !== "") {
      ativos.push({
        key: "dias_min",
        label: `≥ ${diasMin} dias`,
        clear: () => setDiasMin(""),
      });
    }
    if (diasMax !== "") {
      ativos.push({
        key: "dias_max",
        label: `≤ ${diasMax} dias`,
        clear: () => setDiasMax(""),
      });
    }

    return ativos;
  }, [
    primeiroMes,
    ultimoMes,
    anoMesInicio,
    anoMesFim,
    origem,
    assunto,
    subassunto,
    situacao,
    tipoAtendimento,
    diasMin,
    diasMax,
  ]);

  const temFiltroAtivo = filtrosAtivos.length > 0;

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 0;
  const firstVisible = data && data.total_filtrado > 0 ? (data.page - 1) * data.page_size + 1 : 0;
  const lastVisible = data ? Math.min(data.page * data.page_size, data.total_filtrado) : 0;

  const goToPageInput = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(page));
      return;
    }
    const nextPage = Math.min(Math.max(Math.trunc(parsed), 1), totalPages || 1);
    setPage(nextPage);
    setPageInput(String(nextPage));
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-[22px] font-semibold text-ink">Manifestações</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            Consulta tabular dos registros carregados com os mesmos filtros do dashboard
          </p>
        </div>
      </section>

      {semDados ? (
        <section className="bg-panel border border-line/30 rounded-custom p-8 text-center">
          <p className="text-[14px] text-ink-soft">
            Nenhum período disponível. Carregue uma planilha para começar.
          </p>
        </section>
      ) : (
        <>
          <section className="bg-panel border border-line/30 rounded-custom p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold text-ink-soft">Filtros</h2>
                {temFiltroAtivo && (
                  <span className="inline-flex items-center justify-center rounded-full bg-teal/10 text-teal text-[11px] font-semibold px-2 py-0.5">
                    {filtrosAtivos.length} ativo{filtrosAtivos.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setFiltrosExpandidos((v) => !v)}
                aria-expanded={filtrosExpandidos}
                aria-controls="manifestacoes-filtros"
                className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                {filtrosExpandidos ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Minimizar filtros
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Expandir filtros
                  </>
                )}
              </button>
            </div>

            {filtrosExpandidos && (
              <div id="manifestacoes-filtros" className="flex flex-col gap-4">
                {/* Grid único em 5 colunas: 5 + 5 = 2 linhas exatas com os 10 controles */}
                <div className="grid grid-cols-5 gap-3 max-2xl:grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Início
                    <select value={anoMesInicio} onChange={(event) => resetToFirstPage(setAnoMesInicio, event.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
                      {(filters?.meses ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Fim
                    <select value={anoMesFim} onChange={(event) => resetToFirstPage(setAnoMesFim, event.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
                      {(filters?.meses ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Origem
                    <select value={origem} onChange={(event) => resetToFirstPage(setOrigem, event.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
                      <option value="todos">Todas</option>
                      {(filters?.origens ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Assunto
                    <select value={assunto} onChange={(event) => resetToFirstPage(setAssunto, event.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
                      <option value="todos">Todos</option>
                      {(filters?.assuntos ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Subassunto
                    <select value={subassunto} onChange={(event) => resetToFirstPage(setSubassunto, event.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
                      <option value="todos">Todos</option>
                      {(filters?.subassuntos ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* Linha 2 */}
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Situação
                    <select value={situacao} onChange={(event) => resetToFirstPage(setSituacao, event.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
                      <option value="todos">Todas</option>
                      {(filters?.situacoes ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Tipo de atendimento
                    <select
                      value={tipoAtendimento}
                      onChange={(event) => resetToFirstPage(setTipoAtendimento, event.target.value)}
                      className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2"
                    >
                      <option value="todos">Todos</option>
                      {(filters?.tipos_atendimento ?? []).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Dias mínimos
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={diasMin}
                      onChange={(event) => {
                        setDiasMin(event.target.value);
                        setPage(1);
                        setPageInput("1");
                      }}
                      placeholder="Ex: 30"
                      className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
                    Dias máximos
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={diasMax}
                      onChange={(event) => {
                        setDiasMax(event.target.value);
                        setPage(1);
                        setPageInput("1");
                      }}
                      placeholder="Ex: 90"
                      className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2"
                    />
                  </label>
                  {/* Botão limpar filtros alinhado com os inputs */}
                  <div className="flex flex-col gap-1.5">
                    <span
                      className="text-[12px] font-semibold text-transparent select-none"
                      aria-hidden="true"
                    >
                      Ação
                    </span>
                    <button
                      type="button"
                      onClick={resetFiltros}
                      disabled={!temFiltroAtivo}
                      className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed border border-line/60 rounded-lg px-3 py-2 hover:border-teal/60 hover:bg-teal/5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Limpar filtros
                    </button>
                  </div>
                </div>

                {temFiltroAtivo && (
                  <div className="flex flex-wrap gap-2 border-t border-line/20 pt-4">
                    {filtrosAtivos.map((filtro) => (
                      <span
                        key={filtro.key}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-panel px-3 py-1 text-[12px] text-ink"
                      >
                        {filtro.label}
                        <button
                          type="button"
                          onClick={() => {
                            filtro.clear();
                            setPage(1);
                            setPageInput("1");
                          }}
                          aria-label={`Remover filtro ${filtro.label}`}
                          className="text-ink-soft hover:text-ink cursor-pointer transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
            <div className="bg-panel border border-line/30 rounded-custom p-5">
              <p className="text-[12px] font-semibold text-ink-soft">Registros filtrados</p>
              <p className="mt-2 font-mono text-[28px] leading-none text-ink">{numberFmt.format(data?.total_filtrado ?? 0)}</p>
            </div>
            <div className="bg-panel border border-line/30 rounded-custom p-5">
              <p className="text-[12px] font-semibold text-ink-soft">Registros no geral</p>
              <p className="mt-2 font-mono text-[28px] leading-none text-ink">{numberFmt.format(data?.total_geral ?? 0)}</p>
            </div>
            <div className="bg-panel border border-line/30 rounded-custom p-5">
              <p className="text-[12px] font-semibold text-ink-soft">Páginas encontradas</p>
              <p className="mt-2 font-mono text-[28px] leading-none text-ink">{numberFmt.format(totalPages)}</p>
            </div>
          </section>

          <section className="bg-panel border border-line/30 rounded-custom overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-line/30">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-teal" />
                <h2 className="text-[14px] font-semibold text-ink">Registros</h2>
              </div>
              <p className="text-[12px] text-ink-soft">
                {numberFmt.format(firstVisible)}-{numberFmt.format(lastVisible)} de {numberFmt.format(data?.total_filtrado ?? 0)}
              </p>
            </div>

            {error ? (
              <p className="px-5 py-8 text-[13px] text-red-600">{error}</p>
            ) : loading ? (
              <div className="p-5">
                <div className="h-[320px] rounded-lg border border-line/30 animate-pulse" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-ink-soft">Nenhuma manifestação encontrada para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1220px] border-collapse text-left">
                  <thead className="bg-line/10">
                    <tr className="text-[11px] uppercase text-ink-soft">
                      <th className="px-4 py-3 font-semibold">Protocolo</th>
                      <th className="px-4 py-3 font-semibold">Criação</th>
                      <th className="px-4 py-3 font-semibold">Situação</th>
                      <th className="px-4 py-3 font-semibold">Tipo de atendimento</th>
                      <th className="px-4 py-3 font-semibold">Origem</th>
                      <th className="px-4 py-3 font-semibold">Assunto</th>
                      <th className="px-4 py-3 font-semibold">Subassunto</th>
                      <th className="px-4 py-3 font-semibold">Conclusão</th>
                      <th className="px-4 py-3 font-semibold">Dias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id_protocolo} className="border-t border-line/25 text-[12.5px] text-ink">
                        <td className="px-4 py-3 font-mono">{item.id_protocolo}</td>
                        <td className="px-4 py-3">{formatDate(item.data_criacao)}</td>
                        <td className="px-4 py-3">{shortText(item.situacao)}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate" title={item.tipo_atendimento ?? ""}>
                          {shortText(item.tipo_atendimento)}
                        </td>
                        <td className="px-4 py-3">{shortText(item.origem_atendimento)}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate" title={item.assunto}>{item.assunto}</td>
                        <td className="px-4 py-3 max-w-[260px] truncate" title={item.subassunto}>{item.subassunto}</td>
                        <td className="px-4 py-3">{formatDate(item.data_conclusao)}</td>
                        <td className="px-4 py-3">{item.dias_para_conclusao ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-line/30">
              <button
                onClick={() => {
                  const nextPage = Math.max(page - 1, 1);
                  setPage(nextPage);
                  setPageInput(String(nextPage));
                }}
                disabled={page <= 1 || loading}
                className="flex items-center gap-2 rounded-lg border border-line/60 px-3 py-2 text-[13px] font-semibold text-ink disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
                  Registros por página
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                      setPageInput("1");
                    }}
                    className="text-[13px] rounded-lg border border-line bg-panel text-ink px-2 py-1.5"
                  >
                    {[10, 25, 50, 100].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <form
                  className="flex items-center gap-2 text-[12px] text-ink-soft"
                  onSubmit={(event) => {
                    event.preventDefault();
                    goToPageInput();
                  }}
                >
                  <span>Página</span>
                  <input
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
                    onBlur={goToPageInput}
                    inputMode="numeric"
                    className="h-8 w-16 rounded-lg border border-line bg-panel px-2 text-center text-[13px] font-semibold text-ink"
                    aria-label="Número da página"
                  />
                  <span>de {totalPages}</span>
                </form>
              </div>
              <button
                onClick={() => {
                  const nextPage = Math.min(page + 1, totalPages || 1);
                  setPage(nextPage);
                  setPageInput(String(nextPage));
                }}
                disabled={page >= totalPages || loading || totalPages === 0}
                className="flex items-center gap-2 rounded-lg border border-line/60 px-3 py-2 text-[13px] font-semibold text-ink disabled:opacity-50"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}