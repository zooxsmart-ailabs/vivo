// Frentes.tsx — Frentes Estratégicas com ranking de geohashes e fluxo dinâmico
// Design: Clean Analytics — Zoox × Vivo
// 4 Frentes: Retenção (RETENCAO), Upsell (UPSELL), Growth (GROWTH), Growth+Retenção (GROWTH_RETENCAO)

import { useState, useMemo } from "react";
import {
  Shield, TrendingUp, Rocket, Search, Trophy,
  MapPin, Users, ChevronRight, AlertTriangle,
  Star, Zap, Monitor, Home, Smartphone, Gamepad2,
  ArrowUpDown, SortAsc, SortDesc, Building2,
  TrendingDown, DollarSign, BarChart3, CheckCircle2,
  Cpu, Route, Filter, Wifi, Signal,
} from "lucide-react";
import { GEOHASH_DATA, QUADRANT_COLORS, GeohashData, getPriorityInfo, QUADRANT_LABELS } from "@/lib/geohashData";

function ShareTrendBadge({ gh }: { gh: GeohashData }) {
  const trend = gh.shareTrend;
  const isUp   = trend.direction === "UP";
  const isDown = trend.direction === "DOWN";
  const color  = isUp ? "#16a34a" : isDown ? "#dc2626" : "#64748b";
  const arrow  = isUp ? "↑" : isDown ? "↓" : "→";
  const label  = isUp ? "Share crescendo" : isDown ? "Share caindo" : "Share estável";
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color + "40", backgroundColor: color + "12" }}
    >
      {arrow} {Math.abs(trend.delta).toFixed(1)} pp &middot; {label}
    </span>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StrategyKey = "RETENCAO" | "UPSELL" | "GROWTH";
type SortField = "share" | "satisfaction" | "clients" | "income" | "growth" | "label";
type SortDir = "asc" | "desc";

// ─── Config das estratégias (exceto Expansão — tem painel próprio) ────────────

const FLOW_CONFIG: Record<StrategyKey, {
  subtitle: string;
  badge: string;
  badgeDesc: string;
  badgeAlert: string;
  color: string;
  step3Label: string;
  step5Label: string;
  perfis: (gh: GeohashData) => Array<{ icon: React.ReactNode; label: string; pct: number; subs: string[]; propensao?: string }>;
  acoes: (gh: GeohashData) => Array<{ label: string; desc: string; filled: boolean }>;
}> = {
  RETENCAO: {
    subtitle: "Estratégia de Retenção",
    badge: "RETENÇÃO",
    badgeDesc: "Alta penetração em área com qualidade técnica comprometida.",
    badgeAlert: "Risco Iminente de Churn",
    color: "#DC2626",
    step3Label: "Clientes em Risco",
    step5Label: "Ações de Retenção",
    perfis: () => [
      { icon: <Monitor className="w-3 h-3" />, label: "Premium (30%)", pct: 30, subs: ["Renda R$ 250+", "Múltiplas reclamações técnicas"] },
      { icon: <Home className="w-3 h-3" />, label: "Família (50%)", pct: 50, subs: ["Renda R$ 150 – R$ 250", "Problemas com velocidade"] },
      { icon: <Smartphone className="w-3 h-3" />, label: "Básico (20%)", pct: 20, subs: ["Renda R$ 80 – R$ 150", "Insatisfação com suporte"] },
    ],
    acoes: () => [
      { label: "PREMIUM", desc: "Upgrade gratuito + Mesh + SLA Prioritário", filled: true },
      { label: "FAMÍLIA", desc: "Manutenção preventiva + Upgrade temporário", filled: false },
      { label: "BÁSICO", desc: "Verificação técnica + Desconto 15%", filled: false },
    ],
  },
  UPSELL: {
    subtitle: "Estratégia de Maximização da Receita",
    badge: "UPSELL",
    badgeDesc: "Base consolidada e satisfeita.",
    badgeAlert: "Oportunidade para maximizar receita",
    color: "#7C3AED",
    step3Label: "Oportunidades",
    step5Label: "Ofertas Personalizadas",
    perfis: () => [
      { icon: <Smartphone className="w-3 h-3" />, label: "Digital Premium (30%)", pct: 30, subs: ["Gap R$ 100 – R$ 150"], propensao: "Propensão 75%" },
      { icon: <Home className="w-3 h-3" />, label: "Família (45%)", pct: 45, subs: ["Gap R$ 50 – R$ 80"], propensao: "Propensão 60%" },
      { icon: <Gamepad2 className="w-3 h-3" />, label: "Gamer (25%)", pct: 25, subs: ["Gap R$ 70 – R$ 100"], propensao: "Propensão 65%" },
    ],
    acoes: () => [
      { label: "ELITE ULTRA", desc: "1Gbps + Wi-Fi 6 Mesh · R$ 299/mês", filled: true },
      { label: "FAMÍLIA PLUS", desc: "600Mbps + Disney+ · R$ 189/mês", filled: true },
      { label: "PERFORMANCE", desc: "500Mbps + IP Fixo · R$ 199/mês", filled: true },
    ],
  },
  GROWTH: {
    subtitle: "Estratégia de Growth",
    badge: "GROWTH",
    badgeDesc: "Baixa penetração em área de alta qualidade técnica.",
    badgeAlert: "Janela de Ataque",
    color: "#15803D",
    step3Label: "Leads (Zoox)",
    step5Label: "Recomendação",
    perfis: () => [
      { icon: <Monitor className="w-3 h-3" />, label: "Elite Digital (35%)", pct: 35, subs: ["Renda R$ 18K · iPhone 14"] },
      { icon: <Home className="w-3 h-3" />, label: "Família (45%)", pct: 45, subs: ["Renda R$ 10K · Samsung"] },
      { icon: <Smartphone className="w-3 h-3" />, label: "Básico (20%)", pct: 20, subs: ["Renda R$ 5K · Motorola"] },
    ],
    acoes: () => [
      { label: "ELITE DIGITAL", desc: "Fibra 1Gbps + Mesh + Cashback", filled: true },
      { label: "FAMÍLIA", desc: "Fibra 500Mbps + Disney+", filled: true },
      { label: "WhatsApp Business + SMS", desc: "Canal de conversão principal", filled: false },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVivoScore(gh: GeohashData) {
  return gh.satisfactionScores.find(s => s.name === "VIVO")?.score ?? 0;
}

function ScoreBar({ name, score, color }: { name: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[9px] font-semibold text-slate-400 w-8 shrink-0">{name}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(score / 10) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-bold text-slate-600 w-5 text-right shrink-0">{score.toFixed(1)}</span>
    </div>
  );
}

function DonutMini({ pct, color }: { pct: number; color: string }) {
  const r = 14, c = 2 * Math.PI * r;
  return (
    <div className="relative w-9 h-9 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#E2E8F0" strokeWidth="5" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-bold text-slate-700">{pct}%</span>
      </div>
    </div>
  );
}

function StepNum({ n, color }: { n: number; color: string }) {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mx-auto mb-2"
      style={{ backgroundColor: color }}>
      {n}
    </div>
  );
}

// ─── Fluxo de 5 passos (Retenção / Maximização / Growth) ─────────────────────

function FlowPanel({ strategy, gh }: { strategy: Exclude<StrategyKey, "GROWTH_RETENCAO">; gh: GeohashData }) {
  const cfg = FLOW_CONFIG[strategy];
  const vivoScore = getVivoScore(gh);
  const perfis = cfg.perfis(gh);
  const acoes = cfg.acoes(gh);

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {cfg.subtitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: cfg.color }}>
              <span className="font-mono font-bold">{gh.label}</span> — {gh.neighborhood}, SP
            </p>
          </div>
          {/* Badge + Prioridade */}
          <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: cfg.color }}>
              {cfg.badge}
            </span>
            {(() => {
              const p = getPriorityInfo(gh);
              return (
                <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 border" style={{ backgroundColor: p.color + "08", borderColor: p.color + "30" }}>
                  <div className="text-right">
                    <span className="text-[8px] font-bold uppercase tracking-wide block" style={{ color: p.color }}>
                      Prioridade em {QUADRANT_LABELS[gh.quadrant]}
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: p.color }}>{p.label}</span>
                      <span className="text-[9px] font-black" style={{ color: p.color }}>#{p.rank}</span>
                      <span className="text-[8px] text-slate-400">/{p.total}</span>
                    </div>
                  </div>
                  <div className="w-14">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.percentile}%`, backgroundColor: p.color }} />
                    </div>
                    <p className="text-[7px] text-slate-400 mt-0.5 text-right">Score {p.score.toFixed(1)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Corpo: 3 colunas ── */}
      <div className="flex-1 grid grid-cols-3 gap-0 divide-x divide-slate-100 bg-[#F8F9FB]">

        {/* Coluna 1 — Dados do Geohash */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Dados do Geohash</p>
            <div className="flex items-center gap-3 mb-3">
              <DonutMini pct={gh.marketShare.percentage} color={cfg.color} />
              <div>
                <p className="text-sm font-bold text-slate-800">{gh.marketShare.label}</p>
                <p className="text-[10px] text-slate-500">{gh.marketShare.activeClients.toLocaleString("pt-BR")} clientes ativos</p>
                <p className="text-[10px] text-slate-400">Pop. {(gh.marketShare.totalPopulation / 1000).toFixed(0)}k · {gh.neighborhood}</p>
              </div>
            </div>
            <div className="mb-3">
              <ShareTrendBadge gh={gh} />
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Score de Satisfação</p>
              {gh.satisfactionScores.map(s => <ScoreBar key={s.name} name={s.name} score={s.score} color={s.color} />)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-3" style={{ borderColor: cfg.color + "30" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>Contexto</p>
            <p className="text-xs text-slate-600 leading-relaxed">{cfg.badgeDesc}</p>
          </div>
        </div>

        {/* Coluna 2 — Perfilamento */}
        <div className="p-5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Perfilamento dos Clientes</p>
          <div className="flex flex-col gap-3">
            {perfis.map((p, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.color + "15" }}>
                      <span style={{ color: cfg.color }}>{p.icon}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{p.label}</span>
                  </div>
                  <span className="text-lg font-black" style={{ color: cfg.color, fontFamily: "'Space Grotesk', sans-serif" }}>{p.pct}%</span>
                </div>
                {/* Barra de proporção */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: cfg.color + "80" }} />
                </div>
                <div className="flex flex-col gap-0.5">
                  {p.subs.map((s, j) => (
                    <p key={j} className="text-[10px] text-slate-500">• {s}</p>
                  ))}
                  {p.propensao && (
                    <p className="text-[10px] font-bold mt-1" style={{ color: cfg.color }}>{p.propensao}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 3 — Ações */}
        <div className="p-5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">{cfg.step5Label}</p>
          <div className="flex flex-col gap-3">
            {acoes.map((a, i) => (
              <div key={i} className="rounded-xl p-4 border"
                style={a.filled
                  ? { backgroundColor: cfg.color, borderColor: cfg.color }
                  : { backgroundColor: "white", borderColor: cfg.color + "30" }}>
                <p className="text-sm font-black leading-tight mb-1"
                  style={{ color: a.filled ? "white" : cfg.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {a.label}
                </p>
                {a.desc && (
                  <p className="text-xs leading-snug"
                    style={{ color: a.filled ? "rgba(255,255,255,0.85)" : "#64748B" }}>
                    {a.desc}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Painel de Expansão (Infraestrutura) ─────────────────────────────────────

const EXPANSAO_COLOR = "#0369A1"; // azul petróleo

function ExpansaoPanel({ gh }: { gh: GeohashData }) {
  const d = gh.demographics;
  const vivoScore = getVivoScore(gh);

  const severityColor = d?.severity === "Alta" ? "#DC2626" : d?.severity === "Média" ? "#D97706" : "#15803D";

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: EXPANSAO_COLOR }} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Estratégia de Infraestrutura
            </h2>
            <p className="text-xs mt-0.5" style={{ color: EXPANSAO_COLOR }}>
              <span className="font-mono font-bold">{gh.label}</span> — {gh.neighborhood}, SP
            </p>
          </div>
          {/* Score de prioridade */}
          {(() => {
            const p = getPriorityInfo(gh);
            return (
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 border shrink-0" style={{ backgroundColor: p.color + "08", borderColor: p.color + "30" }}>
                <div className="text-right">
                  <span className="text-[8px] font-bold uppercase tracking-wide block" style={{ color: p.color }}>
                    Prioridade em Expansão
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: p.color }}>{p.label}</span>
                    <span className="text-[9px] font-black" style={{ color: p.color }}>#{p.rank}</span>
                    <span className="text-[8px] text-slate-400">/{p.total}</span>
                  </div>
                </div>
                <div className="w-14">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.percentile}%`, backgroundColor: p.color }} />
                  </div>
                  <p className="text-[7px] text-slate-400 mt-0.5 text-right">Score {p.score.toFixed(1)}</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Métricas principais ── */}
        <div className="grid grid-cols-4 gap-3">
          {/* Poder Aquisitivo */}
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: EXPANSAO_COLOR + "15" }}>
                <DollarSign className="w-3.5 h-3.5" style={{ color: EXPANSAO_COLOR }} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Poder Aquisitivo</span>
            </div>
            <p className="text-xl font-bold text-slate-800 leading-none mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              R$ {d ? (d.avgIncome / 1000).toFixed(1) : "–"}k
            </p>
            <p className="text-[9px] text-slate-400">Renda média mensal</p>
            <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: EXPANSAO_COLOR }}>
              {d?.incomeLabel ?? "–"}
            </span>
          </div>

          {/* Volume de Pessoas */}
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: EXPANSAO_COLOR + "15" }}>
                <Users className="w-3.5 h-3.5" style={{ color: EXPANSAO_COLOR }} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Volume de Pessoas</span>
            </div>
            <p className="text-xl font-bold text-slate-800 leading-none mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {gh.marketShare.totalPopulation.toLocaleString("pt-BR")}
            </p>
            <p className="text-[9px] text-slate-400">População total</p>
            <p className="text-[9px] text-slate-500 mt-1">
              <span className="font-semibold" style={{ color: EXPANSAO_COLOR }}>{d?.populationDensity.toLocaleString("pt-BR") ?? "–"}</span> hab/km²
            </p>
          </div>

          {/* Crescimento Populacional */}
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: EXPANSAO_COLOR + "15" }}>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: EXPANSAO_COLOR }} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Crescimento Pop.</span>
            </div>
            <p className="text-xl font-bold text-slate-800 leading-none mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              +{d?.populationGrowth ?? "–"}%
            </p>
            <p className="text-[9px] text-slate-400">Crescimento anual</p>
            <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: EXPANSAO_COLOR + "15", color: EXPANSAO_COLOR }}>
              {d?.growthLabel ?? "–"}
            </span>
          </div>

          {/* Share Vivo */}
          <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: EXPANSAO_COLOR + "15" }}>
                <BarChart3 className="w-3.5 h-3.5" style={{ color: EXPANSAO_COLOR }} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Share Vivo</span>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-xl font-bold text-slate-800 leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {gh.marketShare.percentage}%
              </p>
              <DonutMini pct={gh.marketShare.percentage} color={EXPANSAO_COLOR} />
            </div>
            <p className="text-[9px] text-slate-400">{gh.marketShare.activeClients.toLocaleString("pt-BR")} clientes ativos</p>
            <div className="mt-2">
              <ShareTrendBadge gh={gh} />
            </div>
          </div>
        </div>

        {/* ── Dois painéis lado a lado ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Áreas Brancas + Roadmap */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" style={{ color: EXPANSAO_COLOR }} />
                <h3 className="text-sm font-bold" style={{ color: EXPANSAO_COLOR }}>Áreas Brancas</h3>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p><span className="font-semibold text-slate-700">Definição:</span> Geohashes com baixa ou nenhuma satisfação (SpeedTest) e Share irrelevante.</p>
                <p>São "desertos de cobertura" onde a Vivo não compete efetivamente hoje.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Route className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-600">Roadmap</h3>
              </div>
              <div className="space-y-1.5">
                {[
                  "Classificação por severidade",
                  "Estimativa de gap técnico",
                  `Definição de tecnologia: ${d?.technology ?? "4G/5G/Fibra"}`,
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Severidade</span>
                  <span className="font-bold" style={{ color: severityColor }}>{d?.severity ?? "–"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Priorização Zoox */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4" style={{ color: EXPANSAO_COLOR }} />
              <h3 className="text-sm font-bold" style={{ color: EXPANSAO_COLOR }}>Priorização (Fatores Zoox)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Poder Aquisitivo", desc: "Foco em áreas com maior renda média para garantir ARPU." },
                { icon: <Users className="w-3.5 h-3.5" />, label: "Volume de Pessoas", desc: "Alta densidade populacional maximiza o impacto do investimento." },
                { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Crescimento", desc: "Áreas em expansão demográfica para retorno a longo prazo." },
                { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Concorrência", desc: "Análise de share para identificar janelas de oportunidade." },
              ].map((f, i) => (
                <div key={i} className="rounded-lg p-2.5 border" style={{ backgroundColor: EXPANSAO_COLOR + "08", borderColor: EXPANSAO_COLOR + "25" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color: EXPANSAO_COLOR }}>{f.icon}</span>
                    <span className="text-[10px] font-bold" style={{ color: EXPANSAO_COLOR }}>{f.label}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Resultado */}
            <div className="rounded-lg px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: EXPANSAO_COLOR }}>
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <p className="text-xs font-bold text-white leading-tight">
                Resultado: Alocação eficiente de CAPEX focada em ROI
              </p>
            </div>
          </div>
        </div>

        {/* Score de satisfação */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Score de Satisfação (Speedtest)</p>
          {gh.satisfactionScores.map(s => <ScoreBar key={s.name} name={s.name} score={s.score} color={s.color} />)}
          {/* SpeedTest técnico */}
          {gh.speedtest && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-base font-black text-slate-800">{gh.speedtest.downloadMbps} <span className="text-[9px] font-normal text-slate-400">Mbps</span></p>
                <p className="text-[9px] text-slate-400">Download</p>
              </div>
              <div className="text-center">
                <p className="text-base font-black text-slate-800">{gh.speedtest.latencyMs} <span className="text-[9px] font-normal text-slate-400">ms</span></p>
                <p className="text-[9px] text-slate-400">Latência</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{
                  color: gh.speedtest.qualityLabel === "Excelente" ? "#16A34A"
                       : gh.speedtest.qualityLabel === "Bom" ? "#2563EB"
                       : gh.speedtest.qualityLabel === "Regular" ? "#D97706" : "#DC2626"
                }}>{gh.speedtest.qualityLabel}</p>
                <p className="text-[9px] text-slate-400">Qualidade</p>
              </div>
            </div>
          )}
        </div>

        {/* Camada 2 — Decisão Integrada */}
        {gh.camada2 && (
          <div className="grid grid-cols-2 gap-4">
            {/* Fibra */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-[#0EA5E9]" />
                <h3 className="text-sm font-bold text-[#0EA5E9]">Fibra — Camada 2</h3>
                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: gh.camada2.fibra.classification === "AUMENTO_CAPACIDADE" ? "#FEE2E2"
                                   : gh.camada2.fibra.classification === "EXPANSAO_NOVA_AREA" ? "#FEF3C7"
                                   : gh.camada2.fibra.classification === "SAUDAVEL" ? "#DCFCE7" : "#F1F5F9",
                    color: gh.camada2.fibra.classification === "AUMENTO_CAPACIDADE" ? "#DC2626"
                         : gh.camada2.fibra.classification === "EXPANSAO_NOVA_AREA" ? "#D97706"
                         : gh.camada2.fibra.classification === "SAUDAVEL" ? "#16A34A" : "#94A3B8",
                  }}>
                  {gh.camada2.fibra.classification === "AUMENTO_CAPACIDADE" ? "Aumento de Capacidade"
                   : gh.camada2.fibra.classification === "EXPANSAO_NOVA_AREA" ? "Expansão Nova Área"
                   : gh.camada2.fibra.classification === "SAUDAVEL" ? "Rede Saudável" : "Sem Fibra"}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-slate-400 mb-1">Score de Intervenção</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${gh.camada2.fibra.score}%`,
                        backgroundColor: gh.camada2.fibra.score >= 80 ? "#DC2626" : gh.camada2.fibra.score >= 60 ? "#D97706" : "#16A34A"
                      }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{gh.camada2.fibra.score}</span>
                    <span className="text-[9px] text-slate-400">({gh.camada2.fibra.scoreLabel})</span>
                  </div>
                </div>
                {gh.camada2.fibra.taxaOcupacao !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Taxa de Ocupação</span>
                    <span className="font-bold" style={{ color: gh.camada2.fibra.taxaOcupacao >= 85 ? "#DC2626" : "#16A34A" }}>{gh.camada2.fibra.taxaOcupacao}%</span>
                  </div>
                )}
                {gh.camada2.fibra.potencialMercado !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Potencial de Mercado</span>
                    <span className="font-bold text-slate-700">{gh.camada2.fibra.potencialMercado}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Móvel */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Signal className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-sm font-bold text-[#F97316]">Móvel — Camada 2</h3>
                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: gh.camada2.movel.classification === "MELHORA_QUALIDADE" ? "#FEE2E2"
                                   : gh.camada2.movel.classification === "EXPANSAO_4G" ? "#FEF3C7" : "#DCFCE7",
                    color: gh.camada2.movel.classification === "MELHORA_QUALIDADE" ? "#DC2626"
                         : gh.camada2.movel.classification === "EXPANSAO_4G" ? "#D97706" : "#16A34A",
                  }}>
                  {gh.camada2.movel.classification === "MELHORA_QUALIDADE" ? "Melhora na Qualidade"
                   : gh.camada2.movel.classification === "EXPANSAO_4G" ? "Expansão de Cobertura" : "Rede Saudável"}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-slate-400 mb-1">Score de Intervenção</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${gh.camada2.movel.score}%`,
                        backgroundColor: gh.camada2.movel.score >= 80 ? "#DC2626" : gh.camada2.movel.score >= 60 ? "#D97706" : "#16A34A"
                      }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{gh.camada2.movel.score}</span>
                    <span className="text-[9px] text-slate-400">({gh.camada2.movel.scoreLabel})</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tecnologia Recomendada</span>
                  <span className="font-bold" style={{ color: EXPANSAO_COLOR }}>{gh.camada2.movel.classification}</span>
                </div>
                {gh.camada2.movel.speedtestScore !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Score SpeedTest</span>
                    <span className="font-bold text-slate-700">{gh.camada2.movel.speedtestScore}/100</span>
                  </div>
                )}
              </div>
            </div>

            {/* Decisão Integrada */}
            <div className="col-span-2 rounded-xl px-4 py-3 border" style={{ backgroundColor: EXPANSAO_COLOR + "0A", borderColor: EXPANSAO_COLOR + "30" }}>
              <div className="flex items-start gap-2">
                <Cpu className="w-4 h-4 mt-0.5 shrink-0" style={{ color: EXPANSAO_COLOR }} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: EXPANSAO_COLOR }}>Decisão Integrada Camada 2</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{gh.camada2.decisaoIntegrada}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const STRATEGY_TABS: {
  key: StrategyKey;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { key: "RETENCAO", label: "Retenção",    icon: <Shield className="w-3.5 h-3.5" />,    color: "#DC2626" },
  { key: "UPSELL",   label: "Upsell",      icon: <TrendingUp className="w-3.5 h-3.5" />, color: "#7C3AED" },
  { key: "GROWTH",   label: "Growth",      icon: <Rocket className="w-3.5 h-3.5" />,     color: "#15803D" },
];

export default function Frentes() {
  const [activeStrategy, setActiveStrategy] = useState<StrategyKey>("RETENCAO");
  const [selectedGh, setSelectedGh] = useState<GeohashData | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("share");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const activeColor = STRATEGY_TABS.find(t => t.key === activeStrategy)?.color ?? "#7C3AED";

  const filteredGhs = useMemo(() => {
    let list = GEOHASH_DATA.filter(gh => gh.quadrant === activeStrategy);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(gh => gh.label.toLowerCase().includes(q) || gh.neighborhood.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let va = 0, vb = 0;
      if (sortField === "share") { va = a.marketShare.percentage; vb = b.marketShare.percentage; }
      else if (sortField === "satisfaction") { va = getVivoScore(a); vb = getVivoScore(b); }
      else if (sortField === "clients") { va = a.marketShare.activeClients; vb = b.marketShare.activeClients; }
      else if (sortField === "income") { va = a.demographics?.avgIncome ?? 0; vb = b.demographics?.avgIncome ?? 0; }
      else if (sortField === "growth") { va = a.demographics?.populationGrowth ?? 0; vb = b.demographics?.populationGrowth ?? 0; }
      else if (sortField === "label") return sortDir === "asc" ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [activeStrategy, search, sortField, sortDir]);

  const handleStrategyChange = (key: StrategyKey) => {
    setActiveStrategy(key);
    setSearch("");
    setSelectedGh(null);
    setSortField("share");
    setSortDir("desc");
  };

  const displayGh = selectedGh ?? filteredGhs[0] ?? null;

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />;
    return sortDir === "desc" ? <SortDesc className="w-2.5 h-2.5" /> : <SortAsc className="w-2.5 h-2.5" />;
  };

  const kpis = useMemo(() => {
    const all = GEOHASH_DATA.filter(gh => gh.quadrant === activeStrategy);
    const totalClients = all.reduce((s, g) => s + g.marketShare.activeClients, 0);
    const avgShare = all.length ? Math.round(all.reduce((s, g) => s + g.marketShare.percentage, 0) / all.length) : 0;
    const avgSat = all.length ? (all.reduce((s, g) => s + getVivoScore(g), 0) / all.length).toFixed(1) : "0";
    return { count: all.length, totalClients, avgShare, avgSat };
  }, [activeStrategy]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif", background: "#F0F2F8" }}>

      {/* Seletor de estratégia */}
      <div className="bg-white border-b border-slate-100 px-6 shrink-0" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
        <div className="flex gap-0">
          {STRATEGY_TABS.map(tab => {
            const isActive = activeStrategy === tab.key;
            const count = GEOHASH_DATA.filter(g => g.quadrant === tab.key).length;
            return (
              <button key={tab.key} onClick={() => handleStrategyChange(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 ${
                  isActive ? "border-current" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                }`}
                style={isActive ? { color: tab.color, borderColor: tab.color } : {}}>
                <span style={{ color: isActive ? tab.color : undefined }}>{tab.icon}</span>
                {tab.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { backgroundColor: tab.color + "18", color: tab.color, border: `1px solid ${tab.color}30` }
                    : { backgroundColor: "#F1F5F9", color: "#94A3B8" }}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* KPIs */}
          <div className="ml-auto flex items-center gap-5 py-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" style={{ color: activeColor }} />
              <span><b className="text-slate-600">{kpis.count}</b> geohashes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3" style={{ color: activeColor }} />
              <span><b className="text-slate-600">{kpis.totalClients.toLocaleString("pt-BR")}</b> clientes</span>
            </div>
            <>
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3" style={{ color: activeColor }} />
                <span>Sat. média <b className="text-slate-600">{kpis.avgSat}</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" style={{ color: activeColor }} />
                <span>Share médio <b className="text-slate-600">{kpis.avgShare}%</b></span>
              </div>
            </>
          </div>
        </div>
      </div>

      {/* Corpo: ranking + painel */}
      <div className="flex flex-1 overflow-hidden" style={{ background: "#F0F2F8" }}>

        {/* Ranking lateral */}
        <div className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-hidden" style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.03)" }}>
          {/* Busca */}
          <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input type="text" placeholder="Buscar geohash ou bairro..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-violet-300 focus:bg-white transition-colors" />
            </div>
          </div>

          {/* Cabeçalho do ranking */}
          <div className="px-3 py-1.5 border-b border-slate-100 shrink-0 flex items-center gap-1 bg-slate-50">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex-1">
              {filteredGhs.length} geohash{filteredGhs.length !== 1 ? "es" : ""}
            </span>
            <>
              <button onClick={() => toggleSort("share")} className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100">
                Share <SortIcon field="share" />
              </button>
              <button onClick={() => toggleSort("satisfaction")} className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100">
                Sat. <SortIcon field="satisfaction" />
              </button>
            </>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {filteredGhs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <Search className="w-6 h-6 text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Nenhum geohash encontrado</p>
              </div>
            ) : (
              filteredGhs.map((gh, idx) => {
                const vivoScore = getVivoScore(gh);
                const isSelected = displayGh?.id === gh.id;
                const d = gh.demographics;
                return (
                  <button key={gh.id} onClick={() => setSelectedGh(gh)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-50 transition-all border-l-2 ${isSelected ? "" : "border-l-transparent hover:bg-slate-50"}`}
                    style={isSelected ? { backgroundColor: activeColor + "08", borderLeftColor: activeColor } : {}}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-[9px] font-bold text-slate-300 w-4 shrink-0 mt-0.5">#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-800">{gh.label}</span>
                            {gh.isTop10 && (
                              <span className="inline-flex items-center gap-0.5 bg-amber-400 text-amber-900 text-[7px] font-bold px-1 py-0.5 rounded-full leading-none shrink-0">
                                <Trophy className="w-1.5 h-1.5" /> Top 10
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 truncate">{gh.neighborhood}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold" style={{ color: activeColor }}>{gh.marketShare.percentage}%</p>
                        <p className="text-[9px] text-slate-400">sat {vivoScore.toFixed(1)}</p>
                      </div>
                    </div>

                    {/* Mini barra + badge de prioridade */}
                    {(() => {
                      const pri = getPriorityInfo(gh);
                      return (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${gh.marketShare.percentage}%`, backgroundColor: activeColor + "70" }} />
                          </div>
                          <span className="text-[7px] font-bold px-1 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: pri.color }}>
                            {pri.label}
                          </span>
                        </div>
                      );
                    })()}

                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Painel principal */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {displayGh ? (
            <FlowPanel strategy={activeStrategy} gh={displayGh} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Nenhum geohash disponível</p>
              <p className="text-xs text-slate-300 mt-1">Ajuste o filtro de busca ou selecione outra estratégia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
