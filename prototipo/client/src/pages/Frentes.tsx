// Frentes.tsx — Estratégias Growth: Diagnóstico dos 4 Pilares por Geohash
// Design: Clean Analytics — Zoox × Vivo
// Pilares: 01 Percepção | 02 Concorrência | 03 Infraestrutura | 04 Comportamento

import { useState, useMemo } from "react";
import {
  Rocket, MapPin, Star, AlertTriangle, CheckCircle2,
  TrendingDown, BarChart3, Layers, ShoppingBag,
  Search, Zap, Brain, TrendingUp,
} from "lucide-react";
import {
  GEOHASH_DATA, getPriorityInfo,
  Camada2, DiagnosticoGrowth,
} from "@/lib/geohashData";

// ─── Tipos de sinalização ─────────────────────────────────────────────────────
type Sig3 = "ok" | "alerta" | "critico";

const SIG: Record<Sig3, { bg: string; border: string; text: string; dot: string; label: string }> = {
  ok:      { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", dot: "#16A34A", label: "OK" },
  alerta:  { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", dot: "#D97706", label: "Alerta" },
  critico: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "Crítico" },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PilarMetrica {
  label: string;
  value: string;
  formula: string;
  signal: Sig3;
  detail: string;
}

interface PilarResult {
  id: string;
  title: string;
  signal: Sig3;
  metricas: PilarMetrica[];
}

interface AIRec {
  decisao: "ATIVAR" | "AGUARDAR" | "BLOQUEADO";
  decisaoColor: string;
  canal: string;
  abordagem: string;
  raciocinio: string;
}

// ─── Avaliação dos pilares ────────────────────────────────────────────────────
function worstSig(...sigs: Sig3[]): Sig3 {
  if (sigs.includes("critico")) return "critico";
  if (sigs.includes("alerta")) return "alerta";
  return "ok";
}

function avaliarPercep(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 = d.scoreOokla >= 8 ? "ok" : d.scoreOokla >= 6 ? "alerta" : "critico";
  const s2: Sig3 = d.taxaChamados < 3 ? "ok" : d.taxaChamados <= 5 ? "alerta" : "critico";
  return {
    id: "01", title: "Percepção", signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Score Ookla", value: d.scoreOokla.toFixed(1),
        formula: "Score SpeedTest Vivo no Geohash", signal: s1,
        detail: s1 === "ok" ? "≥ 8.0 — Excelente" : s1 === "alerta" ? "6.0–7.9 — Regular" : "< 6.0 — Crítico",
      },
      {
        label: "Vol. Chamados", value: `${d.taxaChamados.toFixed(1)}%`,
        formula: "(RAC + SAC 30d) / Base Ativa Vivo", signal: s2,
        detail: s2 === "ok" ? "< 3% — Saudável" : s2 === "alerta" ? "3–5% — Alerta" : "> 5% — Crítico",
      },
    ],
  };
}

function avaliarConcorrencia(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 = d.sharePenetracao < 20 ? "ok" : d.sharePenetracao <= 40 ? "alerta" : "critico";
  const s2: Sig3 = d.deltaVsLider > 0 ? "ok" : d.deltaVsLider >= -1 ? "alerta" : "critico";
  return {
    id: "02", title: "Concorrência", signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Share / Penetração", value: `${d.sharePenetracao}%`,
        formula: "Base Vivo / Total Domicílios (Zoox)", signal: s1,
        detail: s1 === "ok" ? "< 20% — Alta Oportunidade" : s1 === "alerta" ? "20–40% — Média Oportunidade" : "> 40% — Saturado",
      },
      {
        label: "Vantagem vs Líder",
        value: `${d.deltaVsLider > 0 ? "+" : ""}${d.deltaVsLider.toFixed(1)}`,
        formula: "Delta score Vivo − score líder (Ookla)", signal: s2,
        detail: s2 === "ok" ? "Delta > 0 — Vantagem" : s2 === "alerta" ? "−1.0 a 0 — Empate Técnico" : "Delta < −1.0 — Desvantagem",
      },
    ],
  };
}

function avaliarInfra(c2: Camada2 | undefined): PilarResult {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";
  const s1: Sig3 = fc === "SAUDAVEL" ? "ok" : fc === "AUMENTO_CAPACIDADE" ? "alerta" : "critico";
  const s2: Sig3 = mc === "SAUDAVEL" ? "ok" : mc === "MELHORA_QUALIDADE" ? "critico" : "alerta";
  const FL: Record<string, string> = {
    SAUDAVEL: "Saudável — Growth Liberado",
    AUMENTO_CAPACIDADE: "Aumento de Capacidade — Controlado",
    EXPANSAO_NOVA_AREA: "Expansão Nova Área — Bloqueado",
  };
  const ML: Record<string, string> = {
    SAUDAVEL: "Saudável — Growth Liberado",
    MELHORA_QUALIDADE: "Melhora na Qualidade — Controlado",
    EXPANSAO_5G: "Expansão 5G — Controlado",
    EXPANSAO_4G: "Expansão 4G — Controlado",
  };
  return {
    id: "03", title: "Infraestrutura", signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Fibra (Status)", value: fc,
        formula: "Saudável / Aumento de Capacidade / Expansão Nova Área",
        signal: s1, detail: FL[fc] ?? fc,
      },
      {
        label: "Móvel (Status)", value: mc,
        formula: "Saudável / Melhora na Qualidade / Expansão de Cobertura",
        signal: s2, detail: ML[mc] ?? mc,
      },
    ],
  };
}

function avaliarComportamento(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 = d.arpuRelativo > 1.1 ? "ok" : d.arpuRelativo >= 0.9 ? "alerta" : "critico";
  const s2: Sig3 = d.canalPct >= 50 ? "ok" : d.canalPct >= 20 ? "alerta" : "critico";
  return {
    id: "04", title: "Comportamento", signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Sensibilidade a Preço", value: d.arpuRelativo.toFixed(2),
        formula: "ARPU Geohash / ARPU Médio da Cidade", signal: s1,
        detail: s1 === "ok" ? "Índice > 1.1 — Foco em Totalização" : s1 === "alerta" ? "0.9–1.1 — Mix de Ofertas" : "Índice < 0.9 — Sensível a Preço",
      },
      {
        label: "Afinidade de Canal",
        value: `${d.canalDominante} (${d.canalPct}%)`,
        formula: "Vendas Canal X / Total Vendas no Geohash", signal: s2,
        detail: s2 === "ok" ? "> 50% — Canal Dominante (80% verba)" : s2 === "alerta" ? "20–50% — Canal Complementar" : "< 20% — Canal Ineficiente",
      },
    ],
  };
}

function gerarRec(pilares: PilarResult[], d: DiagnosticoGrowth, c2: Camada2 | undefined): AIRec {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";

  // ── 1. DECISÃO: árvore que prioriza infraestrutura ────────────────────────
  const fibraBloqueada  = fc === "EXPANSAO_NOVA_AREA";
  const fibraGargalo    = fc === "AUMENTO_CAPACIDADE";
  const movelProblema   = mc === "MELHORA_QUALIDADE";
  const movelExpansao   = mc === "EXPANSAO_5G" || mc === "EXPANSAO_4G";
  const percCritica     = d.scoreOokla < 6 || d.taxaChamados > 5;
  const concCritica     = d.deltaVsLider < -1;
  const infraControle   = fibraGargalo || movelProblema;

  let decisao: AIRec["decisao"];
  let decisaoColor: string;
  if (fibraBloqueada || (percCritica && concCritica)) {
    decisao = "BLOQUEADO"; decisaoColor = "#DC2626";
  } else if (infraControle || percCritica || concCritica) {
    decisao = "AGUARDAR"; decisaoColor = "#D97706";
  } else {
    decisao = "ATIVAR"; decisaoColor = "#16A34A";
  }

  // ── 2. CANAL ──────────────────────────────────────────────────────────────
  let canal: string;
  if (d.canalPct >= 50) canal = `${d.canalDominante} (dominante — priorizar 80% da verba)`;
  else if (d.canalPct >= 20) canal = `${d.canalDominante} + canal complementar`;
  else canal = `Redefinir canal — ${d.canalDominante} ineficiente (<20%)`;

  // ── 3. ABORDAGEM: infraestrutura tem precedência sobre perfil de preço ────
  let abordagem: string;
  if (fibraBloqueada) {
    abordagem = "Não ativar growth de fibra. Aguardar expansão de cobertura na área. Focar exclusivamente em móvel enquanto infraestrutura não está disponível.";
  } else if (fibraGargalo && !movelProblema) {
    if (d.arpuRelativo >= 0.9)
      abordagem = "Rede móvel saudável — priorizar aquisição via móvel enquanto capacidade de fibra é ampliada. Retomar oferta de fibra após expansão de capacidade. Não incluir fibra no pitch atual.";
    else
      abordagem = "Fibra com gargalo de capacidade. Abordar com planos móvel de entrada. Não oferecer fibra até capacidade ser ampliada. Upsell gradual após adesão.";
  } else if (!fibraGargalo && movelProblema) {
    if (d.arpuRelativo > 1.1)
      abordagem = "Rede móvel com qualidade comprometida — priorizar oferta de fibra (rede saudável). Não incluir móvel no pitch até resolução técnica. Perfil premium: apresentar planos de fibra com benefícios de streaming.";
    else
      abordagem = "Focar em fibra como produto principal. Rede móvel com qualidade comprometida — não incluir no pitch até resolução técnica.";
  } else if (fibraGargalo && movelProblema) {
    abordagem = "Ambas as redes com restrições técnicas. Aguardar resolução de infraestrutura antes de ativar growth. Monitorar cronograma de obras e qualidade de ERB.";
  } else if (movelExpansao) {
    abordagem = `Expansão de cobertura ${mc === "EXPANSAO_5G" ? "5G" : "4G"} em andamento. Abordar com oferta de fibra como produto principal. Incluir móvel como complemento após conclusão da expansão.`;
  } else {
    // Infraestrutura saudável — decisão por perfil de preço
    if (d.arpuRelativo > 1.1)
      abordagem = "Oferta de totalização (Fibra + Móvel + Streaming). Perfil premium — apresentar bundle completo com benefícios exclusivos.";
    else if (d.arpuRelativo >= 0.9)
      abordagem = "Mix de ofertas com ancoragem de preço. Apresentar comparativo de custo-benefício vs concorrência.";
    else
      abordagem = "Oferta de entrada com preço competitivo. Cliente sensível a preço — evitar planos premium no primeiro contato. Upsell gradual após adesão.";
  }

  // ── 4. RACIOCÍNIO: lista dos fatores determinantes ────────────────────────
  const reasons: string[] = [];
  if (fibraBloqueada)   reasons.push("fibra bloqueada — área sem cobertura (Expansão Nova Área)");
  if (fibraGargalo)     reasons.push("fibra com gargalo de capacidade — growth controlado");
  if (movelProblema)    reasons.push("qualidade móvel comprometida — intervenção técnica necessária");
  if (movelExpansao)    reasons.push(`expansão de cobertura ${mc === "EXPANSAO_5G" ? "5G" : "4G"} em andamento`);
  if (d.scoreOokla >= 8)      reasons.push("percepção excelente (Ookla ≥ 8.0)");
  else if (d.scoreOokla < 6)  reasons.push("percepção crítica (Ookla < 6.0)");
  if (d.taxaChamados > 5)     reasons.push("volume crítico de chamados (>5%)");
  else if (d.taxaChamados < 3) reasons.push("baixo volume de chamados (<3%) — base satisfeita");
  if (d.sharePenetracao < 20)  reasons.push("alta oportunidade de mercado (share < 20%)");
  else if (d.sharePenetracao > 40) reasons.push("mercado saturado (share > 40%)");
  if (d.deltaVsLider > 0)      reasons.push("Vivo com vantagem técnica vs líder");
  else if (d.deltaVsLider < -1) reasons.push("desvantagem técnica significativa vs líder");
  if (d.canalPct < 20)         reasons.push(`canal ${d.canalDominante} ineficiente (<20%) — redefinir estratégia de canal`);

  const raciocinio = reasons.length > 0
    ? `Decisão baseada em: ${reasons.join("; ")}.`
    : "Geohash com perfil equilibrado. Infraestrutura saudável, percepção positiva e canal definido. Ativar growth com oferta adequada ao perfil de preço.";

  return { decisao, decisaoColor, canal, abordagem, raciocinio };
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const INFRA_LABELS: Record<string, string> = {
  SAUDAVEL: "Saudável",
  AUMENTO_CAPACIDADE: "Aumento de Capacidade",
  EXPANSAO_NOVA_AREA: "Expansão Nova Área",
  MELHORA_QUALIDADE: "Melhora na Qualidade",
  EXPANSAO_5G: "Expansão 5G",
  EXPANSAO_4G: "Expansão 4G",
};

function MetricaRow({ m }: { m: PilarMetrica }) {
  const s = SIG[m.signal];
  const display = INFRA_LABELS[m.value] ?? m.value;
  return (
    <div className="rounded-lg border px-3 py-2" style={{ backgroundColor: s.bg, borderColor: s.border }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-700 leading-tight">{m.label}</p>
          <p className="text-[8px] text-slate-400 leading-tight mt-0.5">{m.formula}</p>
        </div>
        <p className="text-[11px] font-black shrink-0" style={{ color: s.text }}>{display}</p>
      </div>
      <p className="text-[8.5px] font-medium leading-tight" style={{ color: s.text }}>{m.detail}</p>
    </div>
  );
}

function PilarCard({ pilar }: { pilar: PilarResult }) {
  const s = SIG[pilar.signal];
  const ICONS: Record<string, React.ReactNode> = {
    "01": <Star className="w-3.5 h-3.5" />,
    "02": <TrendingUp className="w-3.5 h-3.5" />,
    "03": <Layers className="w-3.5 h-3.5" />,
    "04": <ShoppingBag className="w-3.5 h-3.5" />,
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100"
        style={{ backgroundColor: s.bg }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black"
            style={{ backgroundColor: s.dot }}>{pilar.id}</div>
          <div className="flex items-center gap-1.5" style={{ color: s.text }}>
            {ICONS[pilar.id]}
            <span className="text-[11px] font-black uppercase tracking-wide">{pilar.title}</span>
          </div>
        </div>
        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: s.dot }}>{s.label}</span>
      </div>
      <div className="p-2 space-y-1.5">
        {pilar.metricas.map((m, i) => <MetricaRow key={i} m={m} />)}
      </div>
    </div>
  );
}

function RecIA({ rec }: { rec: AIRec }) {
  const ICONS = {
    ATIVAR:    <CheckCircle2 className="w-5 h-5" />,
    AGUARDAR:  <AlertTriangle className="w-5 h-5" />,
    BLOQUEADO: <TrendingDown className="w-5 h-5" />,
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2"
        style={{ background: `linear-gradient(135deg, ${rec.decisaoColor}15, ${rec.decisaoColor}05)` }}>
        <Brain className="w-4 h-4 text-purple-600" />
        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Recomendação IA</span>
        <span className="ml-auto text-[8px] text-slate-400">Gerado automaticamente</span>
      </div>
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decisão</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ backgroundColor: rec.decisaoColor + "12", borderColor: rec.decisaoColor + "40" }}>
          <span style={{ color: rec.decisaoColor }}>{ICONS[rec.decisao]}</span>
          <span className="text-[14px] font-black" style={{ color: rec.decisaoColor }}>{rec.decisao}</span>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Canal Recomendado</p>
        <div className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          <ShoppingBag className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-700 leading-snug">{rec.canal}</p>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Abordagem Comercial</p>
        <div className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-700 leading-snug">{rec.abordagem}</p>
        </div>
      </div>
      <div className="px-4 py-3 flex-1">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Raciocínio</p>
        <div className="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
          <Brain className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-purple-700 leading-snug">{rec.raciocinio}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Frentes() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const growthGeos = useMemo(() =>
    GEOHASH_DATA
      .filter(g => g.quadrant === "GROWTH")
      .sort((a, b) => getPriorityInfo(b).score - getPriorityInfo(a).score),
    []
  );

  const filtered = useMemo(() =>
    growthGeos.filter(g =>
      g.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      g.id.toLowerCase().includes(search.toLowerCase())
    ),
    [growthGeos, search]
  );

  const displayGeo = useMemo(() =>
    (selectedId ? growthGeos.find(g => g.id === selectedId) : null) ?? growthGeos[0] ?? null,
    [selectedId, growthGeos]
  );

  const { pilares, recomendacao } = useMemo(() => {
    if (!displayGeo?.diagnostico) return { pilares: [], recomendacao: null };
    const d = displayGeo.diagnostico;
    const p = [
      avaliarPercep(d),
      avaliarConcorrencia(d),
      avaliarInfra(displayGeo.camada2),
      avaliarComportamento(d),
    ];
    return { pilares: p, recomendacao: gerarRec(p, d, displayGeo.camada2) };
  }, [displayGeo]);

  const priority = displayGeo ? getPriorityInfo(displayGeo) : null;

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/10"
        style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #0f1117 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}>
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-white leading-none">Estratégias Growth</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Diagnóstico por geohash — 4 pilares de avaliação</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
              <span className="text-[9px] font-bold text-green-400">{growthGeos.length} geohashes Growth</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <span className="text-[9px] font-bold text-slate-400">{growthGeos.filter(g => g.diagnostico).length} com diagnóstico</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-white/10 flex flex-col bg-[#0f1117]">
          <div className="px-3 py-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar geohash..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder-slate-500 outline-none focus:border-green-500/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((geo, idx) => {
              const pri = getPriorityInfo(geo);
              const isActive = (selectedId ?? growthGeos[0]?.id) === geo.id;
              return (
                <button key={geo.id} onClick={() => setSelectedId(geo.id)}
                  className="w-full text-left px-3 py-2.5 border-b border-white/5 transition-all hover:bg-white/5"
                  style={isActive ? { backgroundColor: "#16A34A18", borderLeft: "2px solid #16A34A" } : {}}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[8px] font-black text-slate-500 shrink-0">#{idx + 1}</span>
                      <span className="text-[10px] font-bold text-white truncate">{geo.neighborhood}</span>
                    </div>
                    <span className="text-[8px] font-black shrink-0" style={{ color: pri.color }}>{pri.score}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-slate-500">{geo.id}</span>
                    <div className="flex items-center gap-1">
                      {geo.diagnostico
                        ? <span className="text-[7px] font-bold text-green-400 bg-green-500/10 px-1 py-0.5 rounded">Diagnóstico</span>
                        : <span className="text-[7px] text-slate-600 bg-white/5 px-1 py-0.5 rounded">Sem dados</span>
                      }
                      <span className="text-[8px] text-slate-400">{geo.marketShare.percentage}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Search className="w-6 h-6 text-slate-600 mb-2" />
                <p className="text-[10px] text-slate-500">Nenhum geohash encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Área principal */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {displayGeo ? (
            <div className="p-4 space-y-4">

              {/* Header do geohash */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 border border-green-100">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-black text-slate-800 leading-tight">{displayGeo.neighborhood}</h2>
                      <p className="text-[10px] text-slate-400">{displayGeo.city} · {displayGeo.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 mb-0.5">Share</p>
                      <p className="text-[14px] font-black text-slate-800">{displayGeo.marketShare.percentage}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-400 mb-0.5">Satisfação</p>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400" />
                        <p className="text-[14px] font-black text-slate-800">
                          {displayGeo.satisfactionScores.find(s => s.name === "Vivo")?.score.toFixed(1) ?? "—"}
                        </p>
                      </div>
                    </div>
                    {priority && (
                      <div className="text-center">
                        <p className="text-[8px] text-slate-400 mb-0.5">Prioridade</p>
                        <p className="text-[14px] font-black" style={{ color: priority.color }}>{priority.score}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Diagnóstico */}
              {displayGeo.diagnostico && pilares.length > 0 && recomendacao ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Avaliação dos 4 Pilares</h3>
                    </div>
                    {pilares.map(p => <PilarCard key={p.id} pilar={p} />)}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-slate-400" />
                      <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Recomendação</h3>
                    </div>
                    <RecIA rec={recomendacao} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-100">
                  <BarChart3 className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-[12px] font-bold text-slate-400">Sem dados de diagnóstico</p>
                  <p className="text-[10px] text-slate-300 mt-1 max-w-xs">
                    Este geohash ainda não possui dados dos 4 pilares preenchidos.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Rocket className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-[12px] font-bold text-slate-400">Selecione um geohash</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
