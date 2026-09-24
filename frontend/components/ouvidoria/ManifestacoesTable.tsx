"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import {
  fetchManifestacoes,
  fetchOuvidoriaFilters,
  ManifestacoesResponse,
  OuvidoriaFilters,
} from "@/lib/api";

const numberFmt = new Intl.NumberFormat("pt-BR");

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
  const [filters, setFilters] = useState<OuvidoriaFilters | null>(null);
  const [data, setData] = useState<ManifestacoesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anoMesInicio, setAnoMesInicio] = useState("2025-04");
  const [anoMesFim, setAnoMesFim] = useState("2026-08");
  const [origem, setOrigem] = useState("todos");
  const [assunto, setAssunto] = useState("todos");
  const [subassunto, setSubassunto] = useState("todos");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize, setPageSize] = useState(25);

  const query = useMemo(
    () => ({
      ano_mes_inicio: anoMesInicio,
      ano_mes_fim: anoMesFim,
      origem,
      assunto,
      subassunto,
      page,
      page_size: pageSize,
    }),
    [anoMesInicio, anoMesFim, origem, assunto, subassunto, page, pageSize]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filterOptions, manifestacoes] = await Promise.all([
        fetchOuvidoriaFilters(),
        fetchManifestacoes(query),
      ]);
      setFilters(filterOptions);
      setData(manifestacoes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar manifestações.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const resetToFirstPage = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
    setPageInput("1");
  };

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
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-[13px] font-semibold text-white bg-teal rounded-lg py-2 px-4 hover:bg-teal/90"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </section>

      <section className="bg-panel border border-line/30 rounded-custom p-5">
        <div className="grid grid-cols-5 gap-3 max-2xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
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
        </div>
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
                  <th className="px-4 py-3 font-semibold">Origem</th>
                  <th className="px-4 py-3 font-semibold">Assunto</th>
                  <th className="px-4 py-3 font-semibold">Subassunto</th>
                  <th className="px-4 py-3 font-semibold">Setores</th>
                  <th className="px-4 py-3 font-semibold">Dias</th>
                  <th className="px-4 py-3 font-semibold">Planilha</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id_protocolo} className="border-t border-line/25 text-[12.5px] text-ink">
                    <td className="px-4 py-3 font-mono">{item.id_protocolo}</td>
                    <td className="px-4 py-3">{formatDate(item.data_criacao)}</td>
                    <td className="px-4 py-3">{shortText(item.situacao)}</td>
                    <td className="px-4 py-3">{shortText(item.origem_atendimento)}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" title={item.assunto}>{item.assunto}</td>
                    <td className="px-4 py-3 max-w-[260px] truncate" title={item.subassunto}>{item.subassunto}</td>
                    <td className="px-4 py-3 max-w-[170px] truncate" title={item.setores ?? ""}>{shortText(item.setores)}</td>
                    <td className="px-4 py-3">{item.dias_para_conclusao ?? "-"}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" title={item.nome_planilha ?? ""}>{shortText(item.nome_planilha)}</td>
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
    </div>
  );
}
