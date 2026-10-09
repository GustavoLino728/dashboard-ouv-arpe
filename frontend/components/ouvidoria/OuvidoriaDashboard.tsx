"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  buildManifestacoesUrl,
  buildManifestacoesUrlParaMes,
  resolverFiltroKpi,
  resolverSubassuntoCallCenter,
  type FiltrosManifestacoes,
} from "@/lib/filtrosManifestacoes";
import Link from "next/link";

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
  href,
  tooltip,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "danger";
  href?: string | null;
  tooltip?: string;
}) {
  const toneMap = {
    neutral: "border-line/40",
    good: "border-teal/40",
    warn: "border-amber-400/50",
    danger: "border-red-500/40",
  };

  const baseClass = `bg-panel border ${toneMap[tone]} rounded-custom p-5 min-h-[118px] block text-left`;
  const clickableClass = href
    ? " transition hover:border-teal/60 hover:shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
    : "";

  const content = (
    <>
      <p className="text-[12px] font-semibold text-ink-soft flex items-center gap-1.5">
        {label}
        {tooltip && (
          <span
            title={tooltip}
            aria-label={tooltip}
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-line/60 text-ink-soft text-[9px] font-bold cursor-help select-none"
          >
            ?
          </span>
        )}
      </p>
      <p className="mt-2 font-mono text-[28px] leading-none text-ink">{value}</p>
      <p className="mt-3 text-[12px] text-ink-soft">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass}${clickableClass}`}
        aria-label={`Ver manifestações: ${label}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

export function OuvidoriaDashboard() {
  const router = useRouter();
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
  const [subassuntoDestaque, setSubassuntoDestaque] = useState<string>("");

  const filtrosBase: FiltrosManifestacoes = useMemo(
    () => ({
      ano_mes_inicio: anoMesInicio,
      ano_mes_fim: anoMesFim,
      origem,
      assunto,
    }),
    [anoMesInicio, anoMesFim, origem, assunto]
  );

  const subassuntoPadrao = useMemo(
    () => resolverSubassuntoCallCenter(state.filters),
    [state.filters]
  );

  const subassuntoDestaqueEfetivo = useMemo(
    () => subassuntoDestaque || subassuntoPadrao || "",
    [subassuntoDestaque, subassuntoPadrao]
  );

  const query = useMemo(
    () => ({
      ano_mes_inicio: anoMesInicio,
      ano_mes_fim: anoMesFim,
      origem,
      assunto,
      subassunto_destaque: subassuntoDestaqueEfetivo || undefined,
    }),
    [anoMesInicio, anoMesFim, origem, assunto, subassuntoDestaqueEfetivo]
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

  const rotuloDestaque = useMemo(() => {
    if (state.kpis?.rotulo_destaque) return state.kpis.rotulo_destaque;
    const item = state.filters?.subassuntos?.find(
      (s) => s.value === subassuntoDestaqueEfetivo
    );
    return item?.label ?? "Call Center Compesa";
  }, [state.kpis?.rotulo_destaque, state.filters, subassuntoDestaqueEfetivo]);

  const hrefTotalPeriodo = useMemo(() => {
    const override = resolverFiltroKpi("total-periodo", { base: filtrosBase });
    return override ? buildManifestacoesUrl(filtrosBase, override) : null;
  }, [filtrosBase]);

  const hrefMesPico = useMemo(() => {
    const override = resolverFiltroKpi("mes-pico", {
      base: filtrosBase,
      picoMes: state.kpis?.pico_mes?.ano_mes ?? null,
    });
    return override ? buildManifestacoesUrl(filtrosBase, override) : null;
  }, [filtrosBase, state.kpis?.pico_mes?.ano_mes]);

  const hrefMenorMes = useMemo(() => {
    const override = resolverFiltroKpi("mes-menor-volume", {
      base: filtrosBase,
      menorMes: state.kpis?.menor_mes?.ano_mes ?? null,
    });
    return override ? buildManifestacoesUrl(filtrosBase, override) : null;
  }, [filtrosBase, state.kpis?.menor_mes?.ano_mes]);

  const hrefCallCenter = useMemo(() => {
    if (!subassuntoDestaqueEfetivo) return null;
    const override = resolverFiltroKpi("call-center-compesa", {
      base: filtrosBase,
      subassuntoCallCenter: subassuntoDestaqueEfetivo,
    });
    return override ? buildManifestacoesUrl(filtrosBase, override) : null;
  }, [filtrosBase, subassuntoDestaqueEfetivo]);

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
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
          Subassunto destacado
          <select
            value={subassuntoDestaque}
            onChange={(e) => setSubassuntoDestaque(e.target.value)}
            className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2 max-w-[280px]"
          >
            <option value="">Padrão (Call Center Compesa)</option>
            {(state.filters?.subassuntos ?? []).map((item) => (
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
            <KpiTile label="Total no periodo" value={numberFmt.format(kpis.total_manifestacoes)} detail={`${kpis.total_meses} meses analisados`} href={hrefTotalPeriodo}/>
            <KpiTile label="Media mensal" value={numberFmt.format(kpis.media_mensal)} detail="Manifestacoes por mes" />
            <KpiTile label="Mes de pico" value={kpis.pico_mes?.ano_mes ?? "-"} detail={`${numberFmt.format(kpis.pico_mes?.total ?? 0)} registros`} tone="warn" href={hrefMesPico}/>
            <KpiTile label="Mes de menor volume" value={kpis.menor_mes?.ano_mes ?? "-"} detail={`${numberFmt.format(kpis.menor_mes?.total ?? 0)} registros`} tone="good" href={hrefMenorMes}/>
            <KpiTile label={rotuloDestaque} value={numberFmt.format(kpis.total_call_center)} detail="Subassunto destacado" href={hrefCallCenter}/>
            <KpiTile label={`Participacao ${rotuloDestaque}`} value={`${kpis.participacao_call_center}%`} detail="Exclui telefone/endereco da prestadora" tone="danger" />
            <KpiTile label="MoM ultimo mes" value={kpis.variacao_mom_ultimo_mes === null ? "-" : `${kpis.variacao_mom_ultimo_mes}%`} detail="Variacao contra mes anterior" />
            <KpiTile label="Base comparativa" value={numberFmt.format(state.comparison?.total_considerado ?? 0)} detail="Registros apos regra de exclusao" tooltip="A regra de exclusão desconsidera manifestações do subassunto de informações de telefone/endereço da prestadora de serviço, para que a comparação da participação do subassunto destacado não seja distorcida por esses registros."
/>
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
                <Line type="monotone" dataKey="call_center" name={rotuloDestaque} stroke="#C4432D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-panel border border-line/30 rounded-custom p-6">
          <div className="flex items-center gap-2 mb-4">
            <Headphones className="w-4 h-4 text-teal" />
            <h2 className="text-[14px] font-semibold text-ink">Comparativo {rotuloDestaque}</h2>
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
                    <Cell key={entry.grupo} fill={entry.eh_destaque ? "#C4432D" : "#1B7F79"} />
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
              const href = buildManifestacoesUrlParaMes(filtrosBase, item.ano_mes);
              return (
                <Link
                  key={item.ano_mes}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-line/40 px-3 py-2 transition hover:border-teal/60 hover:bg-teal/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
                >
                  <span className="text-[13px] font-semibold text-ink">{item.ano_mes}</span>
                  <span className={`flex items-center gap-1 text-[13px] font-semibold ${isUp ? "text-red-600" : "text-teal"}`}>
                    {isUp ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    {item.variacao_mom ?? 0}%
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-panel border border-line/30 rounded-custom p-6">
          <h2 className="text-[14px] font-semibold text-ink mb-4">Evolucao mensal das tipologias</h2>
          <div className="h-[300px] cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typologyEvolutionData}
                margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                onClick={(state) => {
                  if (!state) return;
                  const mes =
                    (state.activeLabel as string | undefined) ??
                    (typeof state.activeTooltipIndex === "number"
                      ? (typologyEvolutionData[state.activeTooltipIndex]?.ano_mes as string | undefined)
                      : undefined);
                  if (mes) router.push(buildManifestacoesUrlParaMes(filtrosBase, mes));
                }}
              >
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