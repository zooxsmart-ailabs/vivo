// Bairros.tsx
// Design: Clean Analytics — GeoIntelligence × Vivo
// Agrega todos os geohashes de um bairro: quadrantes, share, satisfação, Camada 2

import { useState, useMemo } from "react";
import {
  MapPin, Users, TrendingUp, TrendingDown, Minus,
  BarChart2, Search, ChevronRight, AlertTriangle,
  Wifi, Smartphone, Shield, Zap, Target,
  ArrowUpRight, ArrowDownRight, Home, DollarSign, Activity,
} from "lucide-react";
import {
  GEOHASH_DATA, QUADRANT_COLORS, QUADRANT_LABELS, GeohashData,
} from "@/lib/geohashData";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BairroData {
  name: string;
  geohashes: GeohashData[];
  totalPopulation: number;
  totalClients: number;
  avgShare: number;
  avgVivoScore: number;
  avgTimScore: number;
  avgClaroScore: number;
  avgIncome: number | null;
  totalDomicilios: number | null;
  trendUp: number;
  trendDown: number;
  trendStable: number;
  dominantTrend: "UP" | "DOWN" | "STABLE";
  trendDelta: number;
  quadrantCounts: Record<string, number>;
  dominantQuadrant: string;
  hasFibra: boolean;
  hasMovel: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScore(gh: GeohashData, name: string): number {
  return gh.satisfactionScores.find(s => s.name === name)?.score ?? 0;
}

// ─── Agregação de bairros ─────────────────────────────────────────────────────

function buildBairroData(): BairroData[] {
  const map = new Map<string, GeohashData[]>();
  for (const gh of GEOHASH_DATA) {
    const arr = map.get(gh.neighborhood) ?? [];
    arr.push(gh);
    map.set(gh.neighborhood, arr);
  }

  const result: BairroData[] = [];

  for (const [name, ghs] of Array.from(map.entries())) {
    const totalPopulation = ghs.reduce((s, g) => s + g.marketShare.totalPopulation, 0);
    const totalClients    = ghs.reduce((s, g) => s + g.marketShare.activeClients, 0);
    const avgShare        = Math.round(ghs.reduce((s, g) => s + g.marketShare.percentage, 0) / ghs.length);
    const avgVivoScore    = parseFloat((ghs.reduce((s, g) => s + getScore(g, "VIVO"), 0) / ghs.length).toFixed(1));
    const avgTimScore     = parseFloat((ghs.reduce((s, g) => s + getScore(g, "TIM"), 0) / ghs.length).toFixed(1));
    const avgClaroScore   = parseFloat((ghs.reduce((s, g) => s + getScore(g, "CLARO"), 0) / ghs.length).toFixed(1));

    const withIncome = ghs.filter(g => g.demographics?.avgIncome);
    const avgIncome = withIncome.length
      ? Math.round(withIncome.reduce((s, g) => s + (g.demographics!.avgIncome), 0) / withIncome.length)
      : null;

    const withDom = ghs.filter(g => g.shareTrend.fibra?.totalDomicilios);
    const totalDomicilios = withDom.length
      ? withDom.reduce((s, g) => s + (g.shareTrend.fibra?.totalDomicilios ?? 0), 0)
      : null;

    const trendUp     = ghs.filter(g => g.shareTrend.direction === "UP").length;
    const trendDown   = ghs.filter(g => g.shareTrend.direction === "DOWN").length;
    const trendStable = ghs.filter(g => g.shareTrend.direction === "STABLE").length;
    const dominantTrend: "UP" | "DOWN" | "STABLE" =
      trendUp > trendDown && trendUp > trendStable ? "UP" :
      trendDown > trendUp && trendDown > trendStable ? "DOWN" : "STABLE";
    const trendDelta = parseFloat(
      (ghs.reduce((s, g) => s + g.shareTrend.delta, 0) / ghs.length).toFixed(1)
    );

    const quadrantCounts: Record<string, number> = {};
    for (const gh of ghs) {
      quadrantCounts[gh.quadrant] = (quadrantCounts[gh.quadrant] ?? 0) + 1;
    }
    const dominantQuadrant = Object.entries(quadrantCounts).sort((a, b) => b[1] - a[1])[0][0];

    const hasFibra = ghs.some(g => g.technology === "FIBRA" || g.technology === "AMBOS");
    const hasMovel = ghs.some(g => g.technology === "MOVEL" || g.technology === "AMBOS");

    result.push({
      name, geohashes: ghs,
      totalPopulation, totalClients, avgShare,
      avgVivoScore, avgTimScore, avgClaroScore,
      avgIncome, totalDomicilios,
      trendUp, trendDown, trendStable, dominantTrend, trendDelta,
      quadrantCounts, dominantQuadrant,
      hasFibra, hasMovel,
    });
  }

  return result.sort((a, b) => b.totalClients - a.totalClients);
}

const BAIRROS_DATA = buildBairroData();

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TrendBadge({ trend, delta }: { trend: "UP" | "DOWN" | "STABLE"; delta: number }) {
  const isUp   = trend === "UP";
  const isDown = trend === "DOWN";
  const color  = isUp ? "#16a34a" : isDown ? "#dc2626" : "#64748b";
  const Icon   = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const label  = isUp ? "Crescendo" : isDown ? "Caindo" : "Estável";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color + "40", backgroundColor: color + "12" }}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(delta).toFixed(1)} pp · {label}
    </span>
  );
}

function QuadrantPill({ quadrant, count }: { quadrant: string; count: number }) {
  const q = QUADRANT_COLORS[quadrant as keyof typeof QUADRANT_COLORS];
  if (!q) return null;
  const labels: Record<string, string> = {
    RETENCAO: "Ret.", UPSELL: "Up.", GROWTH: "Gr.", GROWTH_RETENCAO: "G+R"
  };
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: q.hex + "20", color: q.hex, border: `1px solid ${q.hex}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: q.hex }} />
      {labels[quadrant] ?? quadrant} {count}
    </span>
  );
}

function ScoreBar({ name, score, color, highlight }: { name: string; score: number; color: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className={`text-[9px] font-bold w-9 shrink-0 ${highlight ? "text-slate-700" : "text-slate-400"}`}>{name}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, backgroundColor: color }} />
      </div>
      <span className={`text-[10px] font-bold w-7 text-right ${highlight ? "text-slate-800" : ""}`} style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Painel de detalhe do bairro ──────────────────────────────────────────────

function BairroDetail({ bairro }: { bairro: BairroData }) {
  const dominantColor = QUADRANT_COLORS[bairro.dominantQuadrant as keyof typeof QUADRANT_COLORS]?.hex ?? "#660099";

  // Delta Vivo vs melhor concorrente
  const bestCompetitor = Math.max(bairro.avgTimScore, bairro.avgClaroScore);
  const deltaVsCompetitor = parseFloat((bairro.avgVivoScore - bestCompetitor).toFixed(1));
  const deltaColor = deltaVsCompetitor > 0 ? "#16a34a" : deltaVsCompetitor < 0 ? "#dc2626" : "#64748b";
  const DeltaIcon = deltaVsCompetitor > 0 ? TrendingUp : deltaVsCompetitor < 0 ? TrendingDown : Minus;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#F0F2F8" }}>

      {/* ── Dados Regionais ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
          <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dados Regionais</p>
          <span className="ml-auto text-[10px] text-slate-400">Zoox Smart Data</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 rounded-xl p-3 text-center border border-indigo-100">
            <Home className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {bairro.totalDomicilios ? bairro.totalDomicilios.toLocaleString("pt-BR") : "—"}
            </p>
            <p className="text-[9px] text-slate-400">Domicílios</p>
          </div>
          <div className="bg-indigo-50/60 rounded-xl p-3 text-center border border-indigo-100">
            <Users className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {bairro.totalPopulation ? bairro.totalPopulation.toLocaleString("pt-BR") : "—"}
            </p>
            <p className="text-[9px] text-slate-400">População</p>
          </div>
          <div className="bg-indigo-50/60 rounded-xl p-3 text-center border border-indigo-100">
            <DollarSign className="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {bairro.avgIncome ? `R$ ${bairro.avgIncome.toLocaleString("pt-BR")}` : "—"}
            </p>
            <p className="text-[9px] text-slate-400">Renda Média</p>
          </div>
        </div>
      </div>

      {/* ── Header: nome + share + satisfação + delta ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">

        {/* Linha 1: nome + share */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4" style={{ color: dominantColor }} />
              <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {bairro.name}
              </h2>
              <span className="text-xs text-slate-400">São Paulo, SP</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(bairro.quadrantCounts).map(([q, c]) => (
                <QuadrantPill key={q} quadrant={q} count={c} />
              ))}
              <TrendBadge trend={bairro.dominantTrend} delta={bairro.trendDelta} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold" style={{ color: dominantColor, fontFamily: "'Space Grotesk', sans-serif" }}>
              {bairro.avgShare}%
            </p>
            <p className="text-[10px] text-slate-400">Share Médio Vivo</p>
          </div>
        </div>

        {/* Linha 2: KPIs rápidos */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <Users className="w-3.5 h-3.5 mx-auto mb-1 text-purple-500" />
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{bairro.totalClients.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-slate-400">Clientes Vivo</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <BarChart2 className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: bairro.avgVivoScore >= 7 ? "#16a34a" : bairro.avgVivoScore >= 6 ? "#d97706" : "#dc2626" }} />
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{bairro.avgVivoScore.toFixed(1)}</p>
            <p className="text-[9px] text-slate-400">Satisfação Vivo</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <DeltaIcon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: deltaColor }} />
            <p className="text-sm font-bold" style={{ color: deltaColor, fontFamily: "'Space Grotesk', sans-serif" }}>
              {deltaVsCompetitor > 0 ? "+" : ""}{deltaVsCompetitor}
            </p>
            <p className="text-[9px] text-slate-400">Delta vs. Melhor Concorrente</p>
          </div>
        </div>

        {/* Linha 3: Satisfação comparativa */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Satisfação — SpeedTest (0–10)</p>
          <ScoreBar
            name="VIVO"
            score={bairro.avgVivoScore}
            color={bairro.avgVivoScore >= 7 ? "#22C55E" : bairro.avgVivoScore >= 6 ? "#EAB308" : "#EF4444"}
            highlight
          />
          <ScoreBar name="TIM"   score={bairro.avgTimScore}   color="#3B82F6" />
          <ScoreBar name="CLARO" score={bairro.avgClaroScore} color="#EF4444" />
        </div>
      </div>

      {/* ── Camada 1: Distribuição por Quadrante ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-5 rounded-full bg-purple-500" />
          <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Camada 1 — Distribuição Comercial</p>
          <span className="ml-auto text-[10px] text-slate-400">{bairro.geohashes.length} geohash{bairro.geohashes.length !== 1 ? "es" : ""} no bairro</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"] as const).map(q => {
            const count = bairro.quadrantCounts[q] ?? 0;
            const pct = bairro.geohashes.length ? Math.round(count / bairro.geohashes.length * 100) : 0;
            const qc = QUADRANT_COLORS[q];
            if (count === 0) return null;
            return (
              <div key={q} className="rounded-xl p-3 border" style={{ backgroundColor: qc.hex + "08", borderColor: qc.hex + "25" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: qc.hex }} />
                    <span className="text-[10px] font-bold" style={{ color: qc.hex }}>{QUADRANT_LABELS[q]}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: qc.hex }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">{pct}% dos geohashes</span>
                  <span className="text-[9px] font-semibold" style={{ color: qc.hex + "CC" }}>
                    {q === "RETENCAO" ? "⚠ Risco de churn" : q === "GROWTH" ? "↗ Aquisição" : q === "UPSELL" ? "↑ Upsell" : "↔ Dupla frente"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Camada 2: Infraestrutura ── */}
      {(() => {
        const ghsWithC2 = bairro.geohashes.filter(g => g.camada2);
        if (ghsWithC2.length === 0) return null;

        const fibraGhs = ghsWithC2.filter(g => g.camada2?.fibra.classification !== "EXPANSAO_NOVA_AREA");
        const movelGhs = ghsWithC2.filter(g => g.camada2?.movel.classification !== "EXPANSAO_4G");
        const avgFibraScore = fibraGhs.length
          ? Math.round(fibraGhs.reduce((s, g) => s + (g.camada2?.fibra.score ?? 0), 0) / fibraGhs.length)
          : null;
        const avgMovelScore = movelGhs.length
          ? Math.round(movelGhs.reduce((s, g) => s + (g.camada2?.movel.score ?? 0), 0) / movelGhs.length)
          : null;

        const fibraClassCounts: Record<string, number> = {};
        const movelClassCounts: Record<string, number> = {};
        for (const g of ghsWithC2) {
          if (g.camada2) {
            fibraClassCounts[g.camada2.fibra.classification] = (fibraClassCounts[g.camada2.fibra.classification] ?? 0) + 1;
            movelClassCounts[g.camada2.movel.classification] = (movelClassCounts[g.camada2.movel.classification] ?? 0) + 1;
          }
        }

        // Labels e cores alinhados com as 6 classificações da apresentação v1203
        const FIBRA_LABELS: Record<string, string> = {
          AUMENTO_CAPACIDADE: "Aumento de Capacidade",  // tem fibra, saturada >85%
          EXPANSAO_NOVA_AREA: "Expansão Nova Área",      // sem fibra, greenfield
          SAUDAVEL: "Saudável (Monitorar)",              // tem fibra, OK
        };
        const MOVEL_LABELS: Record<string, string> = {
          MELHORA_QUALIDADE: "Melhora na Qualidade",     // tem cobertura, SpeedTest ruim
          SAUDAVEL: "Rede Saudável",                     // tem cobertura, OK
          EXPANSAO_5G: "Expansão 5G (Premium)",          // sem cobertura, segmento premium
          EXPANSAO_4G: "Expansão 4G (Mass)",             // sem cobertura, segmento mass
        };
        const FIBRA_COLORS: Record<string, string> = {
          AUMENTO_CAPACIDADE: "#EF4444",
          EXPANSAO_NOVA_AREA: "#F97316",
          SAUDAVEL: "#22C55E",
        };
        const MOVEL_COLORS: Record<string, string> = {
          MELHORA_QUALIDADE: "#EF4444",
          SAUDAVEL: "#22C55E",
          EXPANSAO_5G: "#7C3AED",
          EXPANSAO_4G: "#3B82F6",
        };

        const scoreColor = (s: number) => s >= 70 ? "#EF4444" : s >= 40 ? "#F97316" : "#22C55E";

        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full bg-blue-500" />
              <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Camada 2 — Infraestrutura</p>
              <span className="ml-auto text-[10px] text-slate-400">{ghsWithC2.length}/{bairro.geohashes.length} geohashes com dados</span>
            </div>
            <div className="grid grid-cols-2 gap-4">

              {/* Fibra */}
              {fibraGhs.length > 0 && avgFibraScore !== null && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700">Fibra Óptica</span>
                    <span className="ml-auto text-lg font-bold" style={{ color: scoreColor(avgFibraScore), fontFamily: "'Space Grotesk', sans-serif" }}>{avgFibraScore}</span>
                  </div>
                  <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full" style={{ width: `${avgFibraScore}%`, backgroundColor: scoreColor(avgFibraScore) }} />
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(fibraClassCounts).map(([k, c]) => (
                      <div key={k} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FIBRA_COLORS[k] ?? "#94A3B8" }} />
                          <span className="text-[9px] text-slate-600">{FIBRA_LABELS[k] ?? k}</span>
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: FIBRA_COLORS[k] ?? "#94A3B8" }}>{c} gh</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Móvel */}
              {movelGhs.length > 0 && avgMovelScore !== null && (
                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-orange-700">Rede Móvel</span>
                    <span className="ml-auto text-lg font-bold" style={{ color: scoreColor(avgMovelScore), fontFamily: "'Space Grotesk', sans-serif" }}>{avgMovelScore}</span>
                  </div>
                  <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full" style={{ width: `${avgMovelScore}%`, backgroundColor: scoreColor(avgMovelScore) }} />
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(movelClassCounts).map(([k, c]) => (
                      <div key={k} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MOVEL_COLORS[k] ?? "#94A3B8" }} />
                          <span className="text-[9px] text-slate-600">{MOVEL_LABELS[k] ?? k}</span>
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: MOVEL_COLORS[k] ?? "#94A3B8" }}>{c} gh</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type RankingTab = "GROWTH" | "UPSELL" | "RETENCAO";

const RANKING_TABS: { key: RankingTab; label: string; icon: typeof Target }[] = [
  { key: "GROWTH",   label: "Growth",   icon: Target },
  { key: "UPSELL",   label: "Upsell",   icon: Zap },
  { key: "RETENCAO", label: "Retenção", icon: Shield },
];

export default function Bairros() {
  const [selectedBairro, setSelectedBairro] = useState<BairroData>(BAIRROS_DATA[0]);
  const [rankingTab, setRankingTab] = useState<RankingTab>("GROWTH");
  const [search, setSearch] = useState("");

  // Ranking de bairros por categoria: ordenado pelo número de geohashes naquela categoria
  const rankingList = useMemo(() => {
    let list = BAIRROS_DATA.filter(b => (b.quadrantCounts[rankingTab] ?? 0) > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.quadrantCounts[rankingTab] ?? 0) - (a.quadrantCounts[rankingTab] ?? 0));
  }, [rankingTab, search]);

  const tabColor = QUADRANT_COLORS[rankingTab].hex;

  return (
    <div className="h-full flex overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif", background: "#F0F2F8" }}>

      {/* ── Sidebar: ranking por categoria ── */}
      <aside className="w-96 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden" style={{ boxShadow: "2px 0 12px rgba(0,0,0,0.04)" }}>

        {/* Header da sidebar */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Ranking por Categoria</h2>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{BAIRROS_DATA.length} bairros</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">{GEOHASH_DATA.length} geohashes mapeados em São Paulo</p>

          {/* Tabs de categoria — uma por linha para mais clareza */}
          <div className="flex flex-col gap-1.5 mb-4">
            {RANKING_TABS.map(({ key, label, icon: Icon }) => {
              const qc = QUADRANT_COLORS[key];
              const isActive = rankingTab === key;
              const totalInCategory = BAIRROS_DATA.filter(b => (b.quadrantCounts[key] ?? 0) > 0).length;
              return (
                <button
                  key={key}
                  onClick={() => setRankingTab(key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    backgroundColor: isActive ? qc.hex : "transparent",
                    border: `1.5px solid ${isActive ? qc.hex : qc.hex + "30"}`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : qc.hex + "15" }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: isActive ? "white" : qc.hex }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold" style={{ color: isActive ? "white" : qc.hex }}>{label}</p>
                    <p className="text-[10px]" style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#94a3b8" }}>
                      {totalInCategory} bairro{totalInCategory !== 1 ? "s" : ""} com geohashes nesta categoria
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar bairro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 bg-slate-50 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Lista de ranking */}
        <div className="flex-1 overflow-y-auto py-2">
          {rankingList.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MapPin className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum bairro encontrado</p>
            </div>
          ) : rankingList.map((bairro, idx) => {
            const isSelected = selectedBairro.name === bairro.name;
            const count = bairro.quadrantCounts[rankingTab] ?? 0;
            const hasRisk = rankingTab === "RETENCAO";
            const satColor = bairro.avgVivoScore >= 7 ? "#16a34a" : bairro.avgVivoScore >= 6 ? "#d97706" : "#dc2626";

            return (
              <button
                key={bairro.name}
                onClick={() => setSelectedBairro(bairro)}
                className="w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all"
                style={{
                  backgroundColor: isSelected ? tabColor + "0C" : "transparent",
                  borderLeft: isSelected ? `3px solid ${tabColor}` : "3px solid transparent",
                }}
              >
                {/* Linha 1: posição + nome + share */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      backgroundColor: idx === 0 ? tabColor : idx === 1 ? tabColor + "CC" : idx === 2 ? tabColor + "99" : tabColor + "18",
                      color: idx < 3 ? "white" : tabColor,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-800 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{bairro.name}</p>
                      {hasRisk && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold" style={{ color: tabColor, fontFamily: "'Space Grotesk', sans-serif" }}>{bairro.avgShare}%</p>
                    <p className="text-[9px] text-slate-400">share</p>
                  </div>
                </div>

                {/* Linha 2: métricas secundárias */}
                <div className="flex items-center gap-2 ml-9">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tabColor + "18", color: tabColor }}
                  >
                    {count} geohash{count > 1 ? "es" : ""}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: satColor + "18", color: satColor }}>
                    ★ {bairro.avgVivoScore.toFixed(1)}
                  </span>
                  <TrendBadge trend={bairro.dominantTrend} delta={bairro.trendDelta} />
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Painel principal ── */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {selectedBairro
          ? <BairroDetail bairro={selectedBairro} />
          : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione um bairro para ver os detalhes</p>
              </div>
            </div>
          )
        }
      </main>
    </div>
  );
}
