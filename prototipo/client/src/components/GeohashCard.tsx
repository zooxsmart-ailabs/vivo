// GeohashCard.tsx — Ficha Técnica do Geohash
// Design: Clean Analytics — Vivo × Zoox
// Estrutura: Header → Prioridade → 3 Pilares (CRM | SpeedTest | Zoox) → Camada 2 → Estratégia

import { GeohashData, QUADRANT_COLORS, TechCategory, BENCHMARKS, getPriorityInfo, QUADRANT_LABELS } from "@/lib/geohashData";
import {
  MapPin, Trophy, TrendingUp, Zap, TrendingDown, AlertTriangle, Star,
  ArrowUp, ArrowDown, Minus, Users, Wifi, Signal, Info,
  DollarSign, Cpu, Layers, Activity,
} from "lucide-react";
import { useState } from "react";

const TECH_META: Record<TechCategory, { label: string; color: string; icon: React.ReactNode }> = {
  FIBRA: { label: "Fibra", color: "#0EA5E9", icon: <Wifi className="w-2.5 h-2.5" /> },
  MOVEL: { label: "Móvel", color: "#F97316", icon: <Signal className="w-2.5 h-2.5" /> },
  AMBOS: { label: "F+M",   color: "#8B5CF6", icon: <Wifi className="w-2.5 h-2.5" /> },
};

const INSIGHT_STYLES = {
  positive: { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", icon: "#16A34A" },
  negative: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", icon: "#EF4444" },
  warning:  { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", icon: "#D97706" },
  neutral:  { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", icon: "#64748B" },
};

// Classificação de infraestrutura Camada 2
const FIBRA_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  AUMENTO_CAPACIDADE: { label: "Aumento de Capacidade", color: "#DC2626" },
  EXPANSAO_NOVA_AREA: { label: "Expansão Nova Área",    color: "#D97706" },
  OK:                 { label: "Rede Saudável",          color: "#16A34A" },
  SEM_FIBRA:          { label: "Sem Fibra",              color: "#94A3B8" },
};
const MOVEL_CLASS_LABELS: Record<string, { label: string; color: string }> = {
  MELHORA_QUALIDADE:  { label: "Melhora na Qualidade",  color: "#DC2626" },
  EXPANSAO_COBERTURA: { label: "Expansão de Cobertura", color: "#D97706" },
  SAUDAVEL:           { label: "Rede Saudável",          color: "#16A34A" },
};

interface GeohashCardProps {
  data: GeohashData | null;
  techFilter?: TechCategory | "TODOS";
}

function MiniBar({ name, score, color }: { name: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] font-semibold text-slate-400 w-7 shrink-0">{name}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(score / 10) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[8px] font-bold text-slate-600 w-5 text-right shrink-0">{score.toFixed(1)}</span>
    </div>
  );
}

function buildInsights(data: GeohashData) {
  const insights: Array<{ icon: React.ReactNode; text: string; type: "positive" | "negative" | "warning" | "neutral" }> = [];
  const vivoScore   = data.satisfactionScores.find(s => s.name === "VIVO")?.score ?? 0;
  const timScore    = data.satisfactionScores.find(s => s.name === "TIM")?.score ?? 0;
  const claroScore  = data.satisfactionScores.find(s => s.name === "CLARO")?.score ?? 0;
  const share       = data.marketShare.percentage;

  const diffEstado = vivoScore - BENCHMARKS.satisfacaoMediaEstadoSP;
  if (Math.abs(diffEstado) >= 0.2) {
    const pct = Math.abs((diffEstado / BENCHMARKS.satisfacaoMediaEstadoSP) * 100).toFixed(0);
    insights.push({
      icon: diffEstado > 0 ? <ArrowUp className="w-2.5 h-2.5 shrink-0" /> : <ArrowDown className="w-2.5 h-2.5 shrink-0" />,
      text: diffEstado > 0 ? `Satisfação ${pct}% acima da média estadual SP` : `Satisfação ${pct}% abaixo da média estadual SP`,
      type: diffEstado > 0 ? "positive" : "negative",
    });
  }

  const diffShareNac = share - BENCHMARKS.shareMediaNacional;
  if (Math.abs(diffShareNac) >= 3) {
    insights.push({
      icon: diffShareNac > 0 ? <TrendingUp className="w-2.5 h-2.5 shrink-0" /> : <TrendingDown className="w-2.5 h-2.5 shrink-0" />,
      text: diffShareNac > 0 ? `Share ${diffShareNac.toFixed(0)} pp acima da média nacional` : `Share ${Math.abs(diffShareNac).toFixed(0)} pp abaixo da média nacional`,
      type: diffShareNac > 0 ? "positive" : "negative",
    });
  }

  const bestCompetitor = Math.max(timScore, claroScore);
  const bestName = timScore >= claroScore ? "TIM" : "CLARO";
  const gap = vivoScore - bestCompetitor;
  if (Math.abs(gap) >= 0.3) {
    insights.push({
      icon: gap > 0 ? <Star className="w-2.5 h-2.5 shrink-0" /> : <AlertTriangle className="w-2.5 h-2.5 shrink-0" />,
      text: gap > 0 ? `Vivo lidera +${gap.toFixed(1)} pts vs ${bestName}` : `${bestName} supera Vivo em ${Math.abs(gap).toFixed(1)} pts`,
      type: gap > 0 ? "positive" : "warning",
    });
  }

  const diffShareSP = share - BENCHMARKS.shareMediaCidadeSP;
  if (Math.abs(diffShareSP) >= 3 && insights.length < 3) {
    insights.push({
      icon: diffShareSP > 0 ? <TrendingUp className="w-2.5 h-2.5 shrink-0" /> : <Minus className="w-2.5 h-2.5 shrink-0" />,
      text: diffShareSP > 0 ? `Share ${diffShareSP.toFixed(0)} pp acima da média SP` : `Share ${Math.abs(diffShareSP).toFixed(0)} pp abaixo da média SP`,
      type: diffShareSP > 0 ? "positive" : "warning",
    });
  }

  return insights.slice(0, 2);
}

function ShareTooltip({ data }: { data: GeohashData }) {
  const [show, setShow] = useState(false);
  const trend = data.shareTrend;
  const hasFibra = !!trend.fibra;
  const hasMovel = !!trend.movel;
  const isUp   = trend.direction === "UP";
  const isDown = trend.direction === "DOWN";
  const trendColor = isUp ? "#16a34a" : isDown ? "#dc2626" : "#64748b";
  const trendArrow = isUp ? "↑" : isDown ? "↓" : "→";
  const trendLabel = isUp ? "Subindo" : isDown ? "Caindo" : "Estável";

  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <span
        className="inline-flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded-full leading-none"
        style={{ color: trendColor, backgroundColor: trendColor + "15" }}
      >
        {trendArrow} {Math.abs(trend.delta).toFixed(1)}pp · {trendLabel}
      </span>
      <div className="relative">
        <button
          className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <Info className="w-2 h-2 text-slate-400" />
        </button>
        {show && (hasFibra || hasMovel) && (
          <div
            className="absolute right-0 bottom-5 z-50 w-44 rounded-lg border border-slate-200 bg-white shadow-lg p-2"
            style={{ pointerEvents: "none" }}
          >
            {hasFibra && (
              <div className="text-[8px] leading-relaxed text-slate-600 mb-1">
                <p className="font-bold text-[#0EA5E9] mb-0.5">Fibra — Cálculo do Share:</p>
                <p className="font-mono bg-slate-50 rounded px-1 py-0.5 text-[7px] mb-0.5">
                  Dom. c/ Fibra ÷ Total Dom. = {((trend.fibra!.domiciliosComFibra / trend.fibra!.totalDomicilios) * 100).toFixed(1)}%
                </p>
                <p className="text-slate-500"><span className="font-semibold">{trend.fibra!.domiciliosComFibra.toLocaleString("pt-BR")}</span> dom. com fibra</p>
                <p className="text-slate-500"><span className="font-semibold">{trend.fibra!.totalDomicilios.toLocaleString("pt-BR")}</span> total domicílios</p>
              </div>
            )}
            {hasMovel && (
              <div className="text-[8px] leading-relaxed text-slate-600">
                {hasFibra && <div className="border-t border-slate-100 my-1" />}
                <p className="font-bold text-[#F97316] mb-0.5">Móvel — Cálculo do Share:</p>
                <p className="font-mono bg-slate-50 rounded px-1 py-0.5 text-[7px] mb-0.5">
                  Pessoas c/ ERB ÷ Pop. Residente = {((trend.movel!.pessoasComErb / trend.movel!.populacaoResidente) * 100).toFixed(1)}%
                </p>
                <p className="text-slate-500"><span className="font-semibold">{trend.movel!.pessoasComErb.toLocaleString("pt-BR")}</span> pessoas c/ ERB</p>
                <p className="text-slate-500"><span className="font-semibold">{trend.movel!.populacaoResidente.toLocaleString("pt-BR")}</span> pop. residente</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: Linha de dado da ficha técnica ───────────────────────────
function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-[8px] text-slate-400 leading-none">{label}</span>
      <span className={`text-[8px] font-bold leading-none ${highlight ? "text-[#660099]" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}

// ─── Sub-componente: Badge de score Camada 2 ─────────────────────────────────
function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#DC2626" : score >= 60 ? "#D97706" : score >= 40 ? "#2563EB" : "#16A34A";
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[7px] font-bold w-5 text-right shrink-0" style={{ color }}>{score}</span>
      <span className="text-[7px] text-slate-400 shrink-0">({label})</span>
    </div>
  );
}

export default function GeohashCard({ data, techFilter = "TODOS" }: GeohashCardProps) {
  const [activeTab, setActiveTab] = useState<"dados" | "camada2">("dados");

  // Determina quais seções da Camada 2 mostrar com base no filtro de tecnologia
  const showFibra = techFilter === "TODOS" || techFilter === "FIBRA" || techFilter === "AMBOS";
  const showMovel = techFilter === "TODOS" || techFilter === "MOVEL" || techFilter === "AMBOS";

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-2">
          <MapPin className="w-4 h-4 text-purple-300" />
        </div>
        <p className="text-xs font-semibold text-slate-400 mb-1">Nenhum geohash selecionado</p>
        <p className="text-[10px] text-slate-300 leading-relaxed">
          Passe o cursor sobre uma célula no mapa.
        </p>
      </div>
    );
  }

  const quadrantColor = QUADRANT_COLORS[data.quadrant];
  const techMeta      = TECH_META[data.technology];
  const insights      = buildInsights(data);
  const priority      = getPriorityInfo(data);
  const quadrantLabel = QUADRANT_LABELS[data.quadrant];

  return (
    <div className="h-full px-3 py-2 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">

      {/* ── 1. HEADER ── */}
      <div className="shrink-0 pb-1.5 border-b border-slate-100">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[13px] font-bold text-slate-800 tracking-tight leading-none truncate">
              {data.label}
            </span>
            {data.isTop10 && (
              <span className="inline-flex items-center gap-0.5 bg-amber-400 text-amber-900 text-[7px] font-bold px-1 py-0.5 rounded-full leading-none shrink-0">
                <Trophy className="w-1.5 h-1.5" />Top 10
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="inline-flex items-center gap-0.5 text-[7px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ color: techMeta.color, borderColor: techMeta.color + "40", backgroundColor: techMeta.color + "10" }}
            >
              {techMeta.icon}{techMeta.label}
            </span>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: quadrantColor.hex }} />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-400">
          <MapPin className="w-2 h-2 shrink-0" />
          <span className="truncate">{data.neighborhood}, {data.city}</span>
        </div>
      </div>

      {/* ── 2. PRIORIDADE ── */}
      <div
        className="shrink-0 rounded px-2 py-1 border"
        style={{ backgroundColor: priority.color + "08", borderColor: priority.color + "30" }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[7px] font-bold uppercase tracking-widest leading-none" style={{ color: priority.color }}>
            Prioridade em {quadrantLabel}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-bold px-1 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: priority.color }}>
              {priority.label}
            </span>
            <span className="text-[9px] font-black leading-none" style={{ color: priority.color }}>#{priority.rank}</span>
            <span className="text-[8px] text-slate-400 leading-none">/{priority.total}</span>
          </div>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${priority.percentile}%`, backgroundColor: priority.color }} />
        </div>
      </div>

      {/* ── 3. TABS: Dados | Camada 2 ── */}
      <div className="shrink-0 flex gap-1 bg-slate-100 rounded-md p-0.5">
        {[
          { key: "dados",    label: "CAMADA 1: Comercial",      icon: <Activity className="w-2.5 h-2.5" /> },
          { key: "camada2",  label: "CAMADA 2: Infraestrutura", icon: <Layers className="w-2.5 h-2.5" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "dados" | "camada2")}
            className="flex-1 flex items-center justify-center gap-1 text-[8px] font-bold py-1 rounded transition-all"
            style={activeTab === tab.key
              ? { backgroundColor: "#660099", color: "white" }
              : { color: "#64748b" }
            }
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: DADOS ── */}
      {activeTab === "dados" && (
        <>
          {/* ── 4a. SATISFAÇÃO (SpeedTest) ── */}
          <div className="shrink-0">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-2.5 h-2.5 text-[#660099]" />
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">SpeedTest — Satisfação</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {data.satisfactionScores.map(s => (
                <MiniBar key={s.name} name={s.name} score={s.score} color={s.color} />
              ))}
            </div>
            {/* SpeedTest técnico */}
            {data.speedtest && (
              <div className="mt-1.5 bg-slate-50 rounded px-2 py-1.5 border border-slate-100 flex gap-3">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-800">{data.speedtest.downloadMbps} <span className="text-[7px] font-normal text-slate-400">Mbps</span></p>
                  <p className="text-[7px] text-slate-400">Download</p>
                </div>
                <div className="w-px bg-slate-200 shrink-0" />
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-800">{data.speedtest.latencyMs} <span className="text-[7px] font-normal text-slate-400">ms</span></p>
                  <p className="text-[7px] text-slate-400">Latência</p>
                </div>
                <div className="w-px bg-slate-200 shrink-0" />
                <div className="text-center">
                  <p className="text-[8px] font-bold" style={{
                    color: data.speedtest.qualityLabel === "Excelente" ? "#16A34A"
                         : data.speedtest.qualityLabel === "Bom" ? "#2563EB"
                         : data.speedtest.qualityLabel === "Regular" ? "#D97706" : "#DC2626"
                  }}>{data.speedtest.qualityLabel}</p>
                  <p className="text-[7px] text-slate-400">Qualidade</p>
                </div>
              </div>
            )}
          </div>

          {/* ── 4b. SHARE ── */}
          <div className="shrink-0 pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-2.5 h-2.5 text-[#660099]" />
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Share de Mercado (Vivo)</span>
              <ShareTooltip data={data} />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#660099" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - data.marketShare.percentage / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-slate-700">{data.marketShare.percentage}%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-700 leading-tight">{data.marketShare.label}</p>
                <p className="text-[8px] text-slate-500 leading-tight">
                  <span className="font-semibold">{data.marketShare.activeClients.toLocaleString("pt-BR")}</span> clientes ativos
                </p>
                <p className="text-[8px] text-slate-400 flex items-center gap-0.5 leading-tight">
                  <Users className="w-2 h-2 shrink-0" />Pop. {(data.marketShare.totalPopulation / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </div>

          {/* ── 4c. CRM ── */}
          {data.crm && (
            <div className="shrink-0">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-2.5 h-2.5 text-[#660099]" />
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">CRM — Base de Clientes</span>
              </div>
              <div className="bg-slate-50 rounded px-2 py-1.5 border border-slate-100 flex flex-col gap-1">
                <DataRow label="ARPU Médio" value={`R$ ${data.crm.arpu}/mês`} highlight />
                <DataRow label="Plano Predominante" value={data.crm.planType} />
                <DataRow label="Device Tier" value={data.crm.deviceTier} />
                {data.demographics && (
                  <>
                    <DataRow label="Renda Média" value={`R$ ${(data.demographics.avgIncome / 1000).toFixed(1)}K (${data.demographics.incomeLabel})`} />
                    <DataRow label="Densidade Pop." value={`${(data.demographics.populationDensity / 1000).toFixed(1)}K hab/km²`} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── 4d. INSIGHTS ── */}
          {insights.length > 0 && (
            <div className="shrink-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Star className="w-2.5 h-2.5 text-[#660099]" />
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Insights</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {insights.map((ins, i) => {
                  const s = INSIGHT_STYLES[ins.type];
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-1 rounded px-1.5 py-0.5 border"
                      style={{ backgroundColor: s.bg, borderColor: s.border }}
                    >
                      <span style={{ color: s.icon }} className="mt-px shrink-0">{ins.icon}</span>
                      <p className="text-[8px] leading-snug font-medium" style={{ color: s.text }}>{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 4e. ESTRATÉGIA RECOMENDADA ── */}
          <div className="shrink-0 mt-auto pt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              Estratégia Recomendada
            </span>
            <div
              className="rounded px-2 py-1 border"
              style={{ backgroundColor: data.strategy.bgColor, borderColor: data.strategy.color + "40" }}
            >
              <span
                className="text-[7px] font-bold uppercase tracking-widest block leading-none mb-0.5"
                style={{ color: data.strategy.color }}
              >
                {data.strategy.quadrantLabel}
              </span>
              <p className="text-[9px] font-bold leading-tight" style={{ color: data.strategy.color }}>
                {data.strategy.title}
              </p>
              <p className="text-[8px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{data.strategy.motive}</p>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: CAMADA 2 ── */}
      {activeTab === "camada2" && (
        <>
          {/* Indicador do filtro ativo */}
          {techFilter !== "TODOS" && (
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border bg-slate-50 border-slate-200">
              {techFilter === "FIBRA" && <Wifi className="w-2.5 h-2.5 text-[#0EA5E9]" />}
              {techFilter === "MOVEL" && <Signal className="w-2.5 h-2.5 text-[#F97316]" />}
              {techFilter === "AMBOS" && <Layers className="w-2.5 h-2.5 text-[#8B5CF6]" />}
              <span className="text-[7px] font-bold text-slate-500">
                Filtro ativo: <span style={{ color: techFilter === "FIBRA" ? "#0EA5E9" : techFilter === "MOVEL" ? "#F97316" : "#8B5CF6" }}>
                  {techFilter === "FIBRA" ? "Apenas Fibra" : techFilter === "MOVEL" ? "Apenas Móvel" : "Fibra + Móvel"}
                </span>
              </span>
            </div>
          )}

          {data.camada2 ? (
            <>
              {/* Fibra — só exibe quando filtro permite */}
              {showFibra && <div className="shrink-0">
                <div className="flex items-center gap-1 mb-1">
                  <Wifi className="w-2.5 h-2.5 text-[#0EA5E9]" />
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Fibra</span>
                  {(() => {
                    const meta = FIBRA_CLASS_LABELS[data.camada2.fibra.classification] ?? { label: data.camada2.fibra.classification, color: "#64748b" };
                    return (
                      <span className="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: meta.color + "18", color: meta.color }}>
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="bg-slate-50 rounded px-2 py-1.5 border border-slate-100 flex flex-col gap-1.5">
                  <div>
                    <p className="text-[7px] text-slate-400 mb-0.5">Score de Intervenção</p>
                    <ScoreBadge score={data.camada2.fibra.score} label={data.camada2.fibra.scoreLabel} />
                  </div>
                  {data.camada2.fibra.taxaOcupacao !== undefined && (
                    <DataRow label="Taxa de Ocupação" value={`${data.camada2.fibra.taxaOcupacao}%`} highlight={data.camada2.fibra.taxaOcupacao >= 85} />
                  )}
                  {data.camada2.fibra.portasDisponiveis !== undefined && (
                    <DataRow label="Portas Disponíveis" value={`${data.camada2.fibra.portasDisponiveis}%`} />
                  )}
                  {data.camada2.fibra.potencialMercado !== undefined && (
                    <DataRow label="Potencial de Mercado" value={`${data.camada2.fibra.potencialMercado}%`} />
                  )}
                  {data.camada2.fibra.sinergiaMovel !== undefined && (
                    <DataRow label="Sinergia Móvel" value={`${data.camada2.fibra.sinergiaMovel}% share móvel`} />
                  )}
                </div>
              </div>}

              {/* Móvel — só exibe quando filtro permite */}
              {showMovel && <div className="shrink-0">
                <div className="flex items-center gap-1 mb-1">
                  <Signal className="w-2.5 h-2.5 text-[#F97316]" />
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Móvel</span>
                  {(() => {
                    const meta = MOVEL_CLASS_LABELS[data.camada2.movel.classification] ?? { label: data.camada2.movel.classification, color: "#64748b" };
                    return (
                      <span className="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: meta.color + "18", color: meta.color }}>
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="bg-slate-50 rounded px-2 py-1.5 border border-slate-100 flex flex-col gap-1.5">
                  <div>
                    <p className="text-[7px] text-slate-400 mb-0.5">Score de Intervenção</p>
                    <ScoreBadge score={data.camada2.movel.score} label={data.camada2.movel.scoreLabel} />
                  </div>
                  {(data.camada2.movel.classification === 'EXPANSAO_5G' || data.camada2.movel.classification === 'EXPANSAO_4G') && (
                    <DataRow
                      label="Tecnologia Recomendada"
                      value={data.camada2.movel.classification === 'EXPANSAO_5G' ? '5G (Premium)' : '4G (Mass Market)'}
                      highlight
                    />
                  )}
                  {data.camada2.movel.speedtestScore !== undefined && (
                    <DataRow label="Score SpeedTest" value={`${data.camada2.movel.speedtestScore}/100`} />
                  )}
                  {data.camada2.movel.concentracaoRenda !== undefined && (
                    <DataRow label="Concentração de Renda" value={`${data.camada2.movel.concentracaoRenda}%`} />
                  )}
                  {data.camada2.movel.concentracaoRenda !== undefined && (
                    <DataRow label="Vulnerab. Concorrência" value={`${data.camada2.movel.concentracaoRenda}%`} />
                  )}
                </div>
              </div>}

              {/* Decisão Integrada — só exibe quando ambos estão visíveis */}
              {(showFibra && showMovel) && <div className="shrink-0">
                <div className="flex items-center gap-1 mb-1">
                  <Cpu className="w-2.5 h-2.5 text-[#660099]" />
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Decisão Integrada</span>
                </div>
                <div className="bg-purple-50 rounded px-2 py-1.5 border border-purple-100">
                  <p className="text-[8px] text-purple-800 leading-relaxed font-medium">{data.camada2.decisaoIntegrada}</p>
                </div>
              </div>}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-6">
              <Layers className="w-6 h-6 text-slate-200 mb-2" />
              <p className="text-[9px] text-slate-400 font-medium">Dados de Camada 2 não disponíveis</p>
              <p className="text-[8px] text-slate-300 mt-0.5">para este geohash</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
