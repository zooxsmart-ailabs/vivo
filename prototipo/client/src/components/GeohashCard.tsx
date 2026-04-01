// GeohashCard.tsx — Ficha Técnica Compacta (sem scroll)
// Design: Dense Analytics — visual premium, tudo visível em uma tela

import { GeohashData, QUADRANT_COLORS, TechCategory, BENCHMARKS, getPriorityInfo, QUADRANT_LABELS } from "@/lib/geohashData";
import {
  MapPin, TrendingUp, TrendingDown, AlertTriangle,
  ArrowUp, ArrowDown, Minus, Wifi, Signal,
  Cpu, Layers, Activity, Zap, Users, DollarSign, Gauge,
} from "lucide-react";
import { useState } from "react";

// ─── Meta ─────────────────────────────────────────────────────────────────────
const TECH_META: Record<TechCategory, { label: string; color: string }> = {
  FIBRA: { label: "Fibra", color: "#0EA5E9" },
  MOVEL: { label: "Móvel", color: "#F97316" },
  AMBOS: { label: "F+M",   color: "#8B5CF6" },
};

const FIBRA_CLASS: Record<string, { label: string; color: string; bg: string }> = {
  AUMENTO_CAPACIDADE: { label: "Aumento de Capacidade", color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_NOVA_AREA: { label: "Expansão Nova Área",    color: "#D97706", bg: "#FFFBEB" },
  SAUDAVEL:           { label: "Rede Saudável",          color: "#16A34A", bg: "#F0FDF4" },
  OK:                 { label: "Rede Saudável",          color: "#16A34A", bg: "#F0FDF4" },
  SEM_FIBRA:          { label: "Sem Fibra",              color: "#94A3B8", bg: "#F8FAFC" },
};

const MOVEL_CLASS: Record<string, { label: string; color: string; bg: string }> = {
  MELHORA_QUALIDADE:  { label: "Melhora na Qualidade",  color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_COBERTURA: { label: "Expansão de Cobertura", color: "#D97706", bg: "#FFFBEB" },
  SAUDAVEL:           { label: "Rede Saudável",          color: "#16A34A", bg: "#F0FDF4" },
  EXPANSAO_5G:        { label: "Expansão 5G",            color: "#7C3AED", bg: "#F5F3FF" },
  EXPANSAO_4G:        { label: "Expansão 4G",            color: "#2563EB", bg: "#EFF6FF" },
};

const CARRIER: Record<string, { bar: string; bg: string }> = {
  Vivo:  { bar: "#F59E0B", bg: "#FEF3C7" },
  TIM:   { bar: "#22C55E", bg: "#DCFCE7" },
  Claro: { bar: "#EF4444", bg: "#FEE2E2" },
};

const INSIGHT_S = {
  positive: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D", icon: "#16A34A" },
  negative: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", icon: "#EF4444" },
  warning:  { bg: "#FFFBEB", border: "#FCD34D", text: "#B45309", icon: "#D97706" },
  neutral:  { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", icon: "#64748B" },
};

interface GeohashCardProps { data: GeohashData | null; techFilter?: string; }

function buildInsights(d: GeohashData) {
  const ins: Array<{ type: "positive"|"negative"|"warning"|"neutral"; text: string }> = [];
  const share = d.marketShare.percentage;
  const vivo = d.satisfactionScores.find(s => s.name.toUpperCase() === "VIVO")?.score ?? 0;
  const best = Math.max(...d.satisfactionScores.filter(s => s.name.toUpperCase() !== "VIVO").map(s => s.score));
  if (share >= 40) ins.push({ type: "positive", text: "Share dominante — foco em upsell e retenção" });
  else if (share < 25) ins.push({ type: "warning", text: "Share baixo — oportunidade de crescimento" });
  if (vivo >= 7.5) ins.push({ type: "positive", text: "Satisfação alta — base estável, baixo churn" });
  else if (vivo < 6.0) ins.push({ type: "negative", text: "Satisfação crítica — risco elevado de churn" });
  if (best > vivo + 0.5) ins.push({ type: "negative", text: "Concorrente com satisfação superior" });
  else if (vivo > best + 0.5) ins.push({ type: "positive", text: "Vivo lidera satisfação no geohash" });
  if (d.demographics?.avgIncome && d.demographics.avgIncome > 8000)
    ins.push({ type: "positive", text: "Renda alta — potencial para planos premium" });
  return ins.slice(0, 2);
}

// ─── Barra fina de satisfação ─────────────────────────────────────────────────
function CarrierRow({ label, score }: { label: string; score: number }) {
  const m = CARRIER[label] ?? { bar: "#818CF8", bg: "#EDE9FE" };
  const pct = Math.min(100, (score / 10) * 100);
  const q = score >= 8 ? "Exc" : score >= 7 ? "Bom" : score >= 6 ? "Reg" : "Crít";
  const qc = score >= 8 ? "#16A34A" : score >= 7 ? "#0EA5E9" : score >= 6 ? "#D97706" : "#DC2626";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] font-black w-7 shrink-0" style={{ color: m.bar }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: m.bg }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: m.bar }} />
      </div>
      <span className="text-[9px] font-black text-slate-700 w-5 text-right shrink-0">{score.toFixed(1)}</span>
      <span className="text-[6.5px] font-bold w-5 shrink-0" style={{ color: qc }}>{q}</span>
    </div>
  );
}

// ─── Linha de dado compacta ───────────────────────────────────────────────────
function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {icon && <span className="text-slate-300">{icon}</span>}
        <span className="text-[7.5px] text-slate-400">{label}</span>
      </div>
      <span className="text-[8px] font-bold text-slate-700">{value}</span>
    </div>
  );
}

// ─── Barra de score infra ─────────────────────────────────────────────────────
function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, score)}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GeohashCard({ data, techFilter = "TODOS" }: GeohashCardProps) {
  const [tab, setTab] = useState<"c1"|"c2">("c1");

  const showFibra = techFilter === "TODOS" || techFilter === "FIBRA" || techFilter === "AMBOS";
  const showMovel = techFilter === "TODOS" || techFilter === "MOVEL" || techFilter === "AMBOS";

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-2">
      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
        <MapPin className="w-4 h-4 text-purple-300" />
      </div>
      <p className="text-[10px] font-semibold text-slate-400">Nenhum geohash selecionado</p>
      <p className="text-[9px] text-slate-300">Passe o cursor sobre uma célula no mapa.</p>
    </div>
  );

  const qColor  = QUADRANT_COLORS[data.quadrant];
  const tech    = TECH_META[data.technology];
  const ins     = buildInsights(data);
  const prio    = getPriorityInfo(data);
  const qLabel  = QUADRANT_LABELS[data.quadrant];
  const share   = data.marketShare.percentage;
  const vivo    = data.satisfactionScores.find(s => s.name.toUpperCase() === "VIVO")?.score ?? 0;
  const tim     = data.satisfactionScores.find(s => s.name.toUpperCase() === "TIM")?.score ?? 0;
  const claro   = data.satisfactionScores.find(s => s.name.toUpperCase() === "CLARO")?.score ?? 0;
  const bench   = BENCHMARKS.shareMediaCidadeSP;
  const delta   = share - bench;
  const dColor  = delta > 0 ? "#16A34A" : delta < 0 ? "#DC2626" : "#94A3B8";
  const DIcon   = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontSize: "0" }}>

      {/* ══ HEADER ══ */}
      <div className="shrink-0 px-3 pt-2.5 pb-2 relative"
        style={{ background: `linear-gradient(150deg, ${qColor.hex}22 0%, ${qColor.hex}06 100%)`, borderBottom: `1px solid ${qColor.hex}20` }}>
        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r" style={{ backgroundColor: qColor.hex }} />

        {/* Badges linha 1 */}
        <div className="flex items-center gap-1 mb-1.5 pl-1">
          <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: qColor.hex }}>{qLabel}</span>
          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tech.color }}>{tech.label}</span>
          <span className="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full border"
            style={{ color: prio.color, borderColor: `${prio.color}40`, backgroundColor: `${prio.color}10` }}>
            {prio.label}
          </span>
        </div>

        {/* Nome */}
        <div className="pl-1 mb-1.5">
          <h3 className="text-[12px] font-black text-slate-800 leading-tight">{data.neighborhood}</h3>
          <p className="text-[7.5px] text-slate-400">{data.city} · <span className="font-mono">{data.id}</span></p>
        </div>

        {/* 3 métricas em linha */}
        <div className="grid grid-cols-3 gap-1.5 pl-1">
          <div className="rounded-lg p-1.5 text-center" style={{ backgroundColor: `${qColor.hex}12`, border: `1px solid ${qColor.hex}20` }}>
            <div className="text-[6.5px] text-slate-400 font-semibold mb-0.5">Share Vivo</div>
            <div className="text-[13px] font-black leading-none" style={{ color: qColor.hex }}>{share}%</div>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <DIcon className="w-1.5 h-1.5" style={{ color: dColor }} />
              <span className="text-[6.5px] font-bold" style={{ color: dColor }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}pp</span>
            </div>
          </div>
          <div className="rounded-lg p-1.5 text-center" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <div className="text-[6.5px] text-slate-400 font-semibold mb-0.5">Sat. Vivo</div>
            <div className="text-[13px] font-black leading-none text-amber-500">{vivo.toFixed(1)}</div>
            <div className="text-[6.5px] text-amber-400 font-semibold mt-0.5">
              {vivo >= 7.5 ? "Alta" : vivo >= 6 ? "Média" : "Crítica"}
            </div>
          </div>
          <div className="rounded-lg p-1.5 text-center" style={{ backgroundColor: `${prio.color}10`, border: `1px solid ${prio.color}30` }}>
            <div className="text-[6.5px] text-slate-400 font-semibold mb-0.5">Prioridade</div>
            <div className="text-[13px] font-black leading-none" style={{ color: prio.color }}>{prio.score}</div>
            <div className="text-[6.5px] font-bold mt-0.5" style={{ color: prio.color }}>/100</div>
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="shrink-0 flex gap-0.5 bg-slate-100 mx-3 my-1.5 rounded-lg p-0.5">
        {[
          { key: "c1", icon: <Activity className="w-2 h-2" />, label: "CAMADA 1: Comercial" },
          { key: "c2", icon: <Layers className="w-2 h-2" />,   label: "CAMADA 2: Infraestrutura" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as "c1"|"c2")}
            className="flex-1 flex items-center justify-center gap-0.5 text-[7px] font-bold py-1 rounded-md transition-all"
            style={tab === t.key ? { backgroundColor: "#660099", color: "white" } : { color: "#64748b" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB C1 — COMERCIAL ══ */}
      {tab === "c1" && (
        <div className="flex-1 px-3 pb-2 flex flex-col gap-1.5 overflow-hidden">

          {/* Satisfação comparativa */}
          <div className="rounded-lg border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-100">
              <Activity className="w-2.5 h-2.5 text-slate-400" />
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Satisfação Comparativa</span>
            </div>
            <div className="px-2 py-1.5 space-y-1">
              <CarrierRow label="Vivo"  score={vivo} />
              <CarrierRow label="TIM"   score={tim} />
              <CarrierRow label="Claro" score={claro} />
            </div>
          </div>

          {/* SpeedTest + CRM em 2 colunas */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* SpeedTest */}
            {data.speedtest && (
              <div className="rounded-lg border border-slate-100 p-1.5">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-2.5 h-2.5 text-sky-400" />
                  <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">SpeedTest</span>
                </div>
                <Row label="Download"  value={`${data.speedtest.downloadMbps} Mbps`} />
                <Row label="Latência"  value={`${data.speedtest.latencyMs} ms`} />
                <Row label="Qualidade" value={data.speedtest.qualityLabel} />
              </div>
            )}
            {/* CRM */}
            {data.crm && (
              <div className="rounded-lg border border-slate-100 p-1.5">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">CRM Vivo</span>
                </div>
                <Row label="ARPU"   value={`R$ ${data.crm.arpu}`} />
                <Row label="Device" value={data.crm.deviceTier} />
                <Row label="Plano"  value={data.crm.planType} />
              </div>
            )}
          </div>

          {/* Dados demográficos + população em linha */}
          <div className="rounded-lg border border-slate-100 p-1.5">
            <div className="flex items-center gap-1 mb-1">
              <Users className="w-2.5 h-2.5 text-orange-400" />
              <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">Perfil da Área</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <Row label="Pop. BK"    value={data.marketShare.totalPopulation.toLocaleString("pt-BR")} />
              <Row label="Renda Méd." value={`R$ ${data.demographics?.avgIncome?.toLocaleString("pt-BR") ?? "—"}`} />
              <Row label="Densidade"  value={`${data.demographics?.populationDensity?.toLocaleString("pt-BR") ?? "—"} h/km²`} />
            </div>
          </div>

          {/* Insights */}
          {ins.length > 0 && (
            <div className="space-y-1">
              {ins.map((i, idx) => {
                const s = INSIGHT_S[i.type];
                const Icon = i.type === "positive" ? TrendingUp : i.type === "negative" ? AlertTriangle : i.type === "warning" ? AlertTriangle : TrendingDown;
                return (
                  <div key={idx} className="rounded-lg border px-2 py-1 flex items-start gap-1.5"
                    style={{ backgroundColor: s.bg, borderColor: s.border }}>
                    <Icon className="w-2.5 h-2.5 mt-0.5 shrink-0" style={{ color: s.icon }} />
                    <p className="text-[7.5px] leading-snug font-medium" style={{ color: s.text }}>{i.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB C2 — INFRAESTRUTURA ══ */}
      {tab === "c2" && (
        <div className="flex-1 px-3 pb-2 flex flex-col gap-1.5 overflow-hidden">

          {data.camada2 ? (
            <>
              {/* Filtro ativo */}
              {techFilter !== "TODOS" && (
                <div className="flex items-center gap-1 bg-purple-50 border border-purple-100 rounded-lg px-2 py-1">
                  <Layers className="w-2.5 h-2.5 text-purple-400" />
                  <span className="text-[7px] font-bold text-purple-600">
                    {techFilter === "FIBRA" ? "Apenas Fibra" : techFilter === "MOVEL" ? "Apenas Móvel" : "Fibra + Móvel"}
                  </span>
                </div>
              )}

              {/* Fibra */}
              {showFibra && data.camada2.fibra && (() => {
                const f = data.camada2.fibra;
                const c = FIBRA_CLASS[f.classification] ?? { label: f.classification, color: "#64748B", bg: "#F8FAFC" };
                return (
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${c.color}30` }}>
                    <div className="flex items-center justify-between px-2 py-1.5 border-b"
                      style={{ backgroundColor: c.bg, borderColor: `${c.color}20` }}>
                      <div className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" style={{ color: c.color }} />
                        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-wider">Fibra Óptica</span>
                      </div>
                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: c.color }}>{c.label}</span>
                    </div>
                    <div className="px-2 py-1.5 space-y-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[7px] text-slate-400">Score de Intervenção</span>
                        <span className="text-[8px] font-black" style={{ color: c.color }}>{f.score}/100</span>
                      </div>
                      <ScoreBar score={f.score} color={c.color} />
                      <div className="grid grid-cols-2 gap-x-2 pt-0.5">
                        {f.taxaOcupacao && <Row label="Ocupação" value={`${f.taxaOcupacao}%`} />}
                        {f.portasDisponiveis !== undefined && <Row label="Portas" value={`${f.portasDisponiveis}`} />}
                        {f.potencialMercado && <Row label="Potencial" value={`${f.potencialMercado}`} />}
                        {f.sinergiaMovel && <Row label="Sin. Móvel" value={`${f.sinergiaMovel}%`} />}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Móvel */}
              {showMovel && data.camada2.movel && (() => {
                const m = data.camada2.movel;
                const c = MOVEL_CLASS[m.classification] ?? { label: m.classification, color: "#64748B", bg: "#F8FAFC" };
                return (
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${c.color}30` }}>
                    <div className="flex items-center justify-between px-2 py-1.5 border-b"
                      style={{ backgroundColor: c.bg, borderColor: `${c.color}20` }}>
                      <div className="flex items-center gap-1">
                        <Signal className="w-3 h-3" style={{ color: c.color }} />
                        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-wider">Rede Móvel</span>
                      </div>
                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: c.color }}>{c.label}</span>
                    </div>
                    <div className="px-2 py-1.5 space-y-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[7px] text-slate-400">Score de Intervenção</span>
                        <span className="text-[8px] font-black" style={{ color: c.color }}>{m.score}/100</span>
                      </div>
                      <ScoreBar score={m.score} color={c.color} />
                      <div className="grid grid-cols-2 gap-x-2 pt-0.5">
                        {m.speedtestScore && <Row label="Score Ookla" value={`${m.speedtestScore}`} />}
                        {m.concentracaoRenda && <Row label="Conc. Renda" value={`${m.concentracaoRenda}`} />}
                      </div>
                      {(m.classification === "EXPANSAO_5G" || m.classification === "EXPANSAO_4G") && (
                        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 mt-0.5"
                          style={{ backgroundColor: c.bg, border: `1px solid ${c.color}30` }}>
                          <Cpu className="w-2.5 h-2.5 shrink-0" style={{ color: c.color }} />
                          <div>
                            <p className="text-[6.5px] text-slate-400">Tecnologia Recomendada</p>
                            <p className="text-[8px] font-black" style={{ color: c.color }}>
                              {m.classification === "EXPANSAO_5G" ? "5G — Premium" : "4G — Mass Market"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Decisão Integrada */}
              {showFibra && showMovel && data.camada2.decisaoIntegrada && (
                <div className="rounded-lg bg-purple-50 border border-purple-100 px-2 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Layers className="w-2.5 h-2.5 text-purple-500" />
                    <span className="text-[7px] font-bold text-purple-500 uppercase tracking-wider">Decisão Integrada</span>
                  </div>
                  <p className="text-[7.5px] text-purple-800 leading-snug font-medium">{data.camada2.decisaoIntegrada}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-[9px] text-slate-400 font-bold">Sem dados de Camada 2</p>
              <p className="text-[8px] text-slate-300">Infraestrutura não mapeada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
