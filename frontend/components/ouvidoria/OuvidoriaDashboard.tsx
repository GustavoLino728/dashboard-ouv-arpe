"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Headphones,
  RefreshCw,
} from "lucide-react";
import {
  fetchOuvidoriaComparison,
  fetchOuvidoriaEvolution,
  fetchOuvidoriaFilters,
  fetchOuvidoriaKpis,
  OuvidoriaComparison,
  OuvidoriaEvolution,
  OuvidoriaFilters,
  OuvidoriaKpis,
} from "@/lib/api";

type DashboardState = {
  filters: OuvidoriaFilters | null;
  kpis: OuvidoriaKpis | null;
  evolution: OuvidoriaEvolution | null;
  comparison: OuvidoriaComparison | null;
};

const numberFmt = new Intl.NumberFormat("pt-BR");

function KpiTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const toneMap = {
    neutral: "border-line/40",
    good: "border-teal/40",
    warn: "border-amber-400/50",
    danger: "border-red-500/40",
  };

  return (
    <div className={`bg-panel border ${toneMap[tone]} rounded-custom p-5 min-h-[118px]`}>
      <p className="text-[12px] font-semibold text-ink-soft">{label}</p>
      <p className="mt-2 font-mono text-[28px] leading-none text-ink">{value}</p>
      <p className="mt-3 text-[12px] text-ink-soft">{detail}</p>
    </div>
  );
}

export function OuvidoriaDashboard() {
  const [state, setState] = useState<DashboardState>({
    filters: null,
    kpis: null,
    evolution: null,
    comparison: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anoMesInicio, setAnoMesInicio] = useState("2025-04");
  const [anoMesFim, setAnoMesFim] = useState("2026-08");
  const [origem, setOrigem] = useState("todos");
  const [assunto, setAssunto] = useState("todos");

  const query = useMemo(
    () => ({
      ano_mes_inicio: anoMesInicio,
      ano_mes_fim: anoMesFim,
      origem,
      assunto,
    }),
    [anoMesInicio, anoMesFim, origem, assunto]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filters, kpis, evolution, comparison] = await Promise.all([
        fetchOuvidoriaFilters(),
        fetchOuvidoriaKpis(query),
        fetchOuvidoriaEvolution(query),
        fetchOuvidoriaComparison(query),
      ]);
      setState({ filters, kpis, evolution, comparison });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard da Ouvidoria.");
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

  const topTypologies = useMemo(() => {
    const totals = new Map<string, number>();
    state.evolution?.tipologias.forEach((item) => {
      totals.set(item.subassunto, (totals.get(item.subassunto) ?? 0) + item.total);
    });
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subassunto]) => subassunto);
  }, [state.evolution]);

  const typologyEvolutionData = useMemo(() => {
    const buckets = new Map<string, Record<string, string | number>>();
    state.evolution?.tipologias.forEach((item) => {
      if (!topTypologies.includes(item.subassunto)) return;
      const bucket = buckets.get(item.ano_mes) ?? { ano_mes: item.ano_mes };
      bucket[item.subassunto] = item.total;
      buckets.set(item.ano_mes, bucket);
    });
    return [...buckets.values()].sort((a, b) =>
      String(a.ano_mes).localeCompare(String(b.ano_mes))
    );
  }, [state.evolution, topTypologies]);

  const typologyColors = ["#1B7F79", "#2563EB", "#D97706", "#C4432D", "#6B7280"];

  const shortLabel = (label: string) =>
    label.length > 26 ? `${label.slice(0, 23)}...` : label;

  const legendFormatter = (value: string | number) => shortLabel(String(value));

  const axisTick = { fill: "var(--ink-soft)", fontSize: 11 };

  const tooltipStyle = {
    background: "var(--panel)",
    borderColor: "var(--line)",
    borderRadius: 8,
  };

  const commonGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />;

  const kpis = state.kpis;
  const comparison = state.comparison?.itens ?? [];
  const series = state.evolution?.series ?? [];
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-[14px] text-ink-soft text-center max-w-md">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-[13px] font-semibold text-white bg-teal rounded-lg py-2 px-4 hover:bg-teal/90"
        >
          <RefreshCw className="w-4 h-4" /> Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-[22px] font-semibold text-ink">Ouvidoria ARPE</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            Manifestacoes OUVE PE com foco em atendimento do Call Center da Compesa
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
          Inicio
          <select value={anoMesInicio} onChange={(e) => setAnoMesInicio(e.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
            {(state.filters?.meses ?? []).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
          Fim
          <select value={anoMesFim} onChange={(e) => setAnoMesFim(e.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2">
            {(state.filters?.meses ?? []).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
          Origem
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2 max-w-[220px]">
            <option value="todos">Todas</option>
            {(state.filters?.origens ?? []).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
          Assunto
          <select value={assunto} onChange={(e) => setAssunto(e.target.value)} className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2 max-w-[260px]">
            <option value="todos">Todos</option>
            {(state.filters?.assuntos ?? []).map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid grid-cols-4 gap-5 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {loading || !kpis ? (
          Array.from({ length: 8 }).map((_, idx) => <div key={idx} className="bg-panel border border-line/30 rounded-custom min-h-[118px] animate-pulse" />)
        ) : (
          <>
            <KpiTile label="Total no periodo" value={numberFmt.format(kpis.total_manifestacoes)} detail={`${kpis.total_meses} meses analisados`} />
            <KpiTile label="Media mensal" value={numberFmt.format(kpis.media_mensal)} detail="Manifestacoes por mes" />
            <KpiTile label="Mes de pico" value={kpis.pico_mes?.ano_mes ?? "-"} detail={`${numberFmt.format(kpis.pico_mes?.total ?? 0)} registros`} tone="warn" />
            <KpiTile label="Mes de menor volume" value={kpis.menor_mes?.ano_mes ?? "-"} detail={`${numberFmt.format(kpis.menor_mes?.total ?? 0)} registros`} tone="good" />
            <KpiTile label="Call Center Compesa" value={numberFmt.format(kpis.total_call_center)} detail="Subassunto destacado" />
            <KpiTile label="Participacao Call Center" value={`${kpis.participacao_call_center}%`} detail="Exclui telefone/endereco da prestadora" tone="danger" />
            <KpiTile label="MoM ultimo mes" value={kpis.variacao_mom_ultimo_mes === null ? "-" : `${kpis.variacao_mom_ultimo_mes}%`} detail="Variacao contra mes anterior" />
            <KpiTile label="Base comparativa" value={numberFmt.format(state.comparison?.total_considerado ?? 0)} detail="Registros apos regra de exclusao" />
          </>
        )}
      </section>

      <section className="grid grid-cols-[1.7fr_1fr] gap-5 max-xl:grid-cols-1">
        <div className="bg-panel border border-line/30 rounded-custom p-6">
          <h2 className="text-[14px] font-semibold text-ink mb-4">Evolucao mensal</h2>
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                {commonGrid}
                <XAxis dataKey="ano_mes" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total" stroke="#1B7F79" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="call_center" name="Call Center" stroke="#C4432D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-panel border border-line/30 rounded-custom p-6">
          <div className="flex items-center gap-2 mb-4">
            <Headphones className="w-4 h-4 text-teal" />
            <h2 className="text-[14px] font-semibold text-ink">Comparativo Call Center</h2>
          </div>
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="grupo" width={130} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="percentual" name="% do total considerado" radius={[0, 5, 5, 0]}>
                  {comparison.map((entry) => (
                    <Cell key={entry.grupo} fill={entry.grupo.includes("Call Center") ? "#C4432D" : "#1B7F79"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[1fr_1fr] gap-5 max-xl:grid-cols-1">
        <div className="bg-panel border border-line/30 rounded-custom p-6">
          <h2 className="text-[14px] font-semibold text-ink mb-4">Variacao mes a mes</h2>
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            {series.slice(1).map((item) => {
              const isUp = (item.variacao_mom ?? 0) >= 0;
              return (
                <div key={item.ano_mes} className="flex items-center justify-between rounded-lg border border-line/40 px-3 py-2">
                  <span className="text-[13px] font-semibold text-ink">{item.ano_mes}</span>
                  <span className={`flex items-center gap-1 text-[13px] font-semibold ${isUp ? "text-red-600" : "text-teal"}`}>
                    {isUp ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    {item.variacao_mom ?? 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-panel border border-line/30 rounded-custom p-6">
          <h2 className="text-[14px] font-semibold text-ink mb-4">Evolucao mensal das tipologias</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typologyEvolutionData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                {commonGrid}
                <XAxis dataKey="ano_mes" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={legendFormatter} wrapperStyle={{ fontSize: 11 }} />
                {topTypologies.map((name, idx) => (
                  <Bar key={name} dataKey={name} stackId="tipologias" fill={typologyColors[idx % typologyColors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
