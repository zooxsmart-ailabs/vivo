<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Rocket,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  BarChart3,
  Layers,
  ShoppingBag,
  Search,
  Zap,
  Brain,
  TrendingUp,
} from "lucide-vue-next";
import {
  GEOHASH_DATA,
  getPriorityInfo,
  type Camada2,
  type DiagnosticoGrowth,
} from "~/utils/geohashData";

type Sig3 = "ok" | "alerta" | "critico";

const SIG: Record<
  Sig3,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  ok: { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", dot: "#16A34A", label: "OK" },
  alerta: { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", dot: "#D97706", label: "Alerta" },
  critico: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "Crítico" },
};

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

function worstSig(...sigs: Sig3[]): Sig3 {
  if (sigs.includes("critico")) return "critico";
  if (sigs.includes("alerta")) return "alerta";
  return "ok";
}

function avaliarPercep(d: DiagnosticoGrowth): PilarResult {
  // Fallback para geohashes sem os novos campos: usa scoreOokla geral
  const movel = d.scoreOoklaMovel ?? d.scoreOokla;
  const fibra = d.scoreOoklaFibra ?? 0;
  const hac   = d.scoreHAC ?? 0;

  const sm: Sig3 = movel >= 8 ? "ok" : movel >= 6 ? "alerta" : "critico";
  const sf: Sig3 = fibra === 0 ? "ok" : fibra >= 8 ? "ok" : fibra >= 6 ? "alerta" : "critico";
  const sh: Sig3 = hac   === 0 ? "ok" : hac   >= 8 ? "ok" : hac   >= 6 ? "alerta" : "critico";

  const metricas: PilarMetrica[] = [
    {
      label: "SpeedTest Móvel",
      value: movel.toFixed(1),
      formula: "Score Ookla — SpeedTest Vivo Móvel no Geohash",
      signal: sm,
      detail: sm === "ok" ? "≥ 8.0 — Excelente" : sm === "alerta" ? "6.0–7.9 — Regular" : "< 6.0 — Crítico",
    },
  ];
  if (fibra > 0) {
    metricas.push({
      label: "SpeedTest Fibra",
      value: fibra.toFixed(1),
      formula: "Score Ookla — SpeedTest Vivo Fibra no Geohash",
      signal: sf,
      detail: sf === "ok" ? "≥ 8.0 — Excelente" : sf === "alerta" ? "6.0–7.9 — Regular" : "< 6.0 — Crítico",
    });
  }
  if (hac > 0) {
    metricas.push({
      label: "Score HAC",
      value: hac.toFixed(1),
      formula: "Avaliação de qualidade HAC — Fibra",
      signal: sh,
      detail: sh === "ok" ? "≥ 8.0 — Excelente" : sh === "alerta" ? "6.0–7.9 — Regular" : "< 6.0 — Crítico",
    });
  }
  return {
    id: "01",
    title: "Percepção",
    signal: worstSig(sm, sf, sh),
    metricas,
  };
}

function avaliarConcorrencia(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 = d.sharePenetracao < 20 ? "ok" : d.sharePenetracao <= 40 ? "alerta" : "critico";

  // Vantagem Satisfação Fibra
  const dvf = d.deltaVsLiderFibra ?? d.deltaVsLider;
  const s2f: Sig3 = dvf > 0 ? "ok" : dvf >= -1 ? "alerta" : "critico";

  // Vantagem Satisfação Móvel
  const dvm = d.deltaVsLiderMovel ?? d.deltaVsLider;
  const s2m: Sig3 = dvm > 0 ? "ok" : dvm >= -1 ? "alerta" : "critico";

  function fmtDelta(v: number) { return `${v > 0 ? "+" : ""}${v.toFixed(1)}`; }
  function detailDelta(s: Sig3) {
    return s === "ok" ? "Delta > 0 — Vantagem" : s === "alerta" ? "−1.0 a 0 — Empate Técnico" : "Delta < −1.0 — Desvantagem";
  }

  return {
    id: "02",
    title: "Concorrência",
    signal: worstSig(s1, s2f, s2m),
    metricas: [
      {
        label: "Share / Penetração",
        value: `${d.sharePenetracao}%`,
        formula: "Base Vivo / Total Domicílios (Zoox)",
        signal: s1,
        detail:
          s1 === "ok"
            ? "< 20% — Alta Oportunidade"
            : s1 === "alerta"
              ? "20–40% — Média Oportunidade"
              : "> 40% — Saturado",
      },
      {
        label: "Vantagem Satisfação Fibra",
        value: fmtDelta(dvf),
        formula: "Score Vivo Fibra − score líder Fibra (Ookla)",
        signal: s2f,
        detail: detailDelta(s2f),
      },
      {
        label: "Vantagem Satisfação Móvel",
        value: fmtDelta(dvm),
        formula: "Score Vivo Móvel − score líder Móvel (Ookla)",
        signal: s2m,
        detail: detailDelta(s2m),
      },
    ],
  };
}

function avaliarInfra(c2: Camada2 | undefined): PilarResult {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";
  // Fibra: Saudável=ok | Melhora da Qualidade=alerta | Aumento de Capacidade=alerta | Expansão Nova Área=critico
  const s1: Sig3 = fc === "SAUDAVEL" ? "ok" : fc === "EXPANSAO_NOVA_AREA" ? "critico" : "alerta";
  // Móvel: Saudável=ok | Melhora na Qualidade=critico | Expansão de Cobertura=alerta
  const s2: Sig3 = mc === "SAUDAVEL" ? "ok" : mc === "MELHORA_QUALIDADE" ? "critico" : "alerta";
  const FL: Record<string, string> = {
    SAUDAVEL:           "Saudável — Growth Liberado",
    MELHORA_QUALIDADE:  "Melhora da Qualidade — Intervenção Recomendada",
    AUMENTO_CAPACIDADE: "Aumento de Capacidade — Controlado",
    EXPANSAO_NOVA_AREA: "Expansão Nova Área — Bloqueado",
  };
  const ML: Record<string, string> = {
    SAUDAVEL:           "Saudável — Growth Liberado",
    MELHORA_QUALIDADE:  "Melhora na Qualidade — Crítico",
    EXPANSAO_COBERTURA: "Expansão de Cobertura — Controlado",
    EXPANSAO_5G:        "Expansão de Cobertura — Controlado",
    EXPANSAO_4G:        "Expansão de Cobertura — Controlado",
  };
  return {
    id: "03",
    title: "Infraestrutura",
    signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Fibra (Status)",
        value: fc,
        formula: "Saudável / Melhora da Qualidade / Aumento de Capacidade / Expansão Nova Área",
        signal: s1,
        detail: FL[fc] ?? fc,
      },
      {
        label: "Móvel (Status)",
        value: mc,
        formula: "Saudável / Melhora na Qualidade / Expansão de Cobertura",
        signal: s2,
        detail: ML[mc] ?? mc,
      },
    ],
  };
}

function avaliarComportamento(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 = d.arpuRelativo > 1.1 ? "ok" : d.arpuRelativo >= 0.9 ? "alerta" : "critico";
  const s2: Sig3 = d.canalPct >= 50 ? "ok" : d.canalPct >= 20 ? "alerta" : "critico";
  return {
    id: "04",
    title: "Comportamento",
    signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Sensibilidade a Preço",
        value: d.arpuRelativo.toFixed(2),
        formula: "ARPU Geohash / ARPU Médio da Cidade",
        signal: s1,
        detail:
          s1 === "ok"
            ? "Índice > 1.1 — Foco em Totalização"
            : s1 === "alerta"
              ? "0.9–1.1 — Mix de Ofertas"
              : "Índice < 0.9 — Sensível a Preço",
      },
      {
        label: "Afinidade de Canal",
        value: `${d.canalDominante} (${d.canalPct}%)`,
        formula: "Vendas Canal X / Total Vendas no Geohash",
        signal: s2,
        detail:
          s2 === "ok"
            ? "> 50% — Canal Dominante (80% verba)"
            : s2 === "alerta"
              ? "20–50% — Canal Complementar"
              : "< 20% — Canal Ineficiente",
      },
    ],
  };
}

function gerarRec(d: DiagnosticoGrowth, c2: Camada2 | undefined): AIRec {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";

  const fibraBloqueada = fc === "EXPANSAO_NOVA_AREA";
  const fibraGargalo = fc === "AUMENTO_CAPACIDADE";
  const movelProblema = mc === "MELHORA_QUALIDADE";
  const movelExpansao = mc === "EXPANSAO_5G" || mc === "EXPANSAO_4G";
  const percCritica = d.scoreOokla < 6 || d.taxaChamados > 5;
  const concCritica = d.deltaVsLider < -1;
  const infraControle = fibraGargalo || movelProblema;

  let decisao: AIRec["decisao"];
  let decisaoColor: string;
  if (fibraBloqueada || (percCritica && concCritica)) {
    decisao = "BLOQUEADO";
    decisaoColor = "#DC2626";
  } else if (infraControle || percCritica || concCritica) {
    decisao = "AGUARDAR";
    decisaoColor = "#D97706";
  } else {
    decisao = "ATIVAR";
    decisaoColor = "#16A34A";
  }

  let canal: string;
  if (d.canalPct >= 50) canal = `${d.canalDominante} (dominante — priorizar 80% da verba)`;
  else if (d.canalPct >= 20) canal = `${d.canalDominante} + canal complementar`;
  else canal = `Redefinir canal — ${d.canalDominante} ineficiente (<20%)`;

  let abordagem: string;
  if (fibraBloqueada) {
    abordagem =
      "Não ativar growth de fibra. Aguardar expansão de cobertura na área. Focar exclusivamente em móvel enquanto infraestrutura não está disponível.";
  } else if (fibraGargalo && !movelProblema) {
    abordagem =
      d.arpuRelativo >= 0.9
        ? "Rede móvel saudável — priorizar aquisição via móvel enquanto capacidade de fibra é ampliada. Retomar oferta de fibra após expansão de capacidade."
        : "Fibra com gargalo de capacidade. Abordar com planos móvel de entrada. Não oferecer fibra até capacidade ser ampliada.";
  } else if (!fibraGargalo && movelProblema) {
    abordagem =
      d.arpuRelativo > 1.1
        ? "Rede móvel com qualidade comprometida — priorizar oferta de fibra (rede saudável). Perfil premium: bundle com streaming."
        : "Focar em fibra como produto principal. Rede móvel com qualidade comprometida.";
  } else if (fibraGargalo && movelProblema) {
    abordagem =
      "Ambas as redes com restrições técnicas. Aguardar resolução de infraestrutura antes de ativar growth.";
  } else if (movelExpansao) {
    abordagem = `Expansão de cobertura ${mc === "EXPANSAO_5G" ? "5G" : "4G"} em andamento. Abordar com oferta de fibra como produto principal.`;
  } else {
    abordagem =
      d.arpuRelativo > 1.1
        ? "Oferta de totalização (Fibra + Móvel + Streaming). Perfil premium."
        : d.arpuRelativo >= 0.9
          ? "Mix de ofertas com ancoragem de preço."
          : "Oferta de entrada com preço competitivo. Cliente sensível a preço.";
  }

  const reasons: string[] = [];
  if (fibraBloqueada) reasons.push("fibra bloqueada — área sem cobertura");
  if (fibraGargalo) reasons.push("fibra com gargalo de capacidade");
  if (movelProblema) reasons.push("qualidade móvel comprometida");
  if (movelExpansao) reasons.push(`expansão ${mc === "EXPANSAO_5G" ? "5G" : "4G"} em andamento`);
  if (d.scoreOokla >= 8) reasons.push("percepção excelente (Ookla ≥ 8.0)");
  else if (d.scoreOokla < 6) reasons.push("percepção crítica (Ookla < 6.0)");
  if (d.taxaChamados > 5) reasons.push("volume crítico de chamados (>5%)");
  else if (d.taxaChamados < 3) reasons.push("baixo volume de chamados (<3%)");
  if (d.sharePenetracao < 20) reasons.push("alta oportunidade (share < 20%)");
  else if (d.sharePenetracao > 40) reasons.push("mercado saturado (share > 40%)");
  if (d.deltaVsLider > 0) reasons.push("Vivo com vantagem técnica");
  else if (d.deltaVsLider < -1) reasons.push("desvantagem técnica significativa");

  const raciocinio =
    reasons.length > 0
      ? `Decisão baseada em: ${reasons.join("; ")}.`
      : "Geohash com perfil equilibrado. Ativar growth com oferta adequada ao perfil de preço.";

  return { decisao, decisaoColor, canal, abordagem, raciocinio };
}

const INFRA_LABELS: Record<string, string> = {
  SAUDAVEL: "Saudável",
  AUMENTO_CAPACIDADE: "Aumento de Capacidade",
  EXPANSAO_NOVA_AREA: "Expansão Nova Área",
  MELHORA_QUALIDADE: "Melhora na Qualidade",
  EXPANSAO_5G: "Expansão 5G",
  EXPANSAO_4G: "Expansão 4G",
};

const PILAR_ICONS: Record<string, any> = {
  "01": Star,
  "02": TrendingUp,
  "03": Layers,
  "04": ShoppingBag,
};

const DECISAO_ICONS: Record<string, any> = {
  ATIVAR: CheckCircle2,
  AGUARDAR: AlertTriangle,
  BLOQUEADO: TrendingDown,
};

const search = ref("");
const selectedId = ref<string | null>(null);

const growthGeos = computed(() =>
  GEOHASH_DATA.filter((g) => g.quadrant === "GROWTH").sort(
    (a, b) => getPriorityInfo(b).score - getPriorityInfo(a).score
  )
);

const filtered = computed(() =>
  growthGeos.value.filter(
    (g) =>
      g.neighborhood.toLowerCase().includes(search.value.toLowerCase()) ||
      g.id.toLowerCase().includes(search.value.toLowerCase())
  )
);

const displayGeo = computed(
  () =>
    (selectedId.value ? growthGeos.value.find((g) => g.id === selectedId.value) : null) ??
    growthGeos.value[0] ??
    null
);

const pilares = computed<PilarResult[]>(() => {
  if (!displayGeo.value?.diagnostico) return [];
  const d = displayGeo.value.diagnostico;
  return [
    avaliarPercep(d),
    avaliarConcorrencia(d),
    avaliarInfra(displayGeo.value.camada2),
    avaliarComportamento(d),
  ];
});

const recomendacao = computed<AIRec | null>(() => {
  if (!displayGeo.value?.diagnostico) return null;
  return gerarRec(displayGeo.value.diagnostico, displayGeo.value.camada2);
});

const priority = computed(() =>
  displayGeo.value ? getPriorityInfo(displayGeo.value) : null
);

function priorityInfo(g: any) {
  return getPriorityInfo(g);
}
function metricDisplay(m: PilarMetrica) {
  return INFRA_LABELS[m.value] ?? m.value;
}
function vivoSat(g: any) {
  return g.satisfactionScores.find((s: any) => s.name === "Vivo")?.score?.toFixed(1) ?? "—";
}

// Classe social baseada em renda média mensal (critérios ABEP/IBGE)
function getSocialClass(income?: number): { label: string; color: string; bg: string; border: string } {
  if (!income) return { label: "—", color: "#94A3B8", bg: "#F1F5F9", border: "#CBD5E1" };
  if (income > 11296) return { label: "Classe A", color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" };
  if (income > 5648)  return { label: "Classe B", color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" };
  if (income > 2824)  return { label: "Classe C", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
  if (income > 1412)  return { label: "Classe D", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" };
  return                     { label: "Classe E", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" };
}

function fmtCurrency(v?: number): string {
  if (!v || v === 0) return "—";
  return `R$\u00a0${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDeltaShare(v?: number): string {
  if (v === undefined || v === null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}pp`;
}

function fmtPop(v?: number): string {
  if (!v) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toString();
}
</script>

<template>
  <div class="h-full flex flex-col bg-[#0f1117]">
    <!-- Header -->
    <div
      class="shrink-0 px-6 py-4 border-b border-white/10"
      style="background: linear-gradient(135deg, #1a0a2e 0%, #0f1117 100%)"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            style="background: linear-gradient(135deg, #16a34a, #15803d)"
          >
            <Rocket class="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 class="text-[15px] font-black text-white leading-none">Estratégias Growth</h1>
            <p class="text-[10px] text-slate-400 mt-0.5">
              Diagnóstico por geohash — 4 pilares de avaliação
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
            <span class="text-[9px] font-bold text-green-400"
              >{{ growthGeos.length }} geohashes Growth</span
            >
          </div>
          <div class="bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <span class="text-[9px] font-bold text-slate-400"
              >{{ growthGeos.filter((g) => g.diagnostico).length }} com diagnóstico</span
            >
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div class="w-64 shrink-0 border-r border-white/10 flex flex-col bg-[#0f1117]">
        <div class="px-3 py-2 border-b border-white/10">
          <div class="relative">
            <Search
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500"
            />
            <input
              v-model="search"
              type="text"
              placeholder="Buscar geohash..."
              class="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder-slate-500 outline-none focus:border-green-500/50"
            />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <button
            v-for="(geo, idx) in filtered"
            :key="geo.id"
            class="w-full text-left px-3 py-2.5 border-b border-white/5 transition-all hover:bg-white/5"
            :style="
              (selectedId ?? growthGeos[0]?.id) === geo.id
                ? { backgroundColor: '#16A34A18', borderLeft: '2px solid #16A34A' }
                : {}
            "
            @click="selectedId = geo.id"
          >
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-[8px] font-black text-slate-500 shrink-0"
                  >#{{ idx + 1 }}</span
                >
                <span class="text-[10px] font-bold text-white truncate">{{
                  geo.neighborhood
                }}</span>
              </div>
              <span
                class="text-[8px] font-black shrink-0"
                :style="{ color: priorityInfo(geo).color }"
                >{{ priorityInfo(geo).score }}</span
              >
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[8px] text-slate-500">{{ geo.id }}</span>
              <div class="flex items-center gap-1">
                <span
                  v-if="geo.diagnostico"
                  class="text-[7px] font-bold text-green-400 bg-green-500/10 px-1 py-0.5 rounded"
                  >Diagnóstico</span
                >
                <span
                  v-else
                  class="text-[7px] text-slate-600 bg-white/5 px-1 py-0.5 rounded"
                  >Sem dados</span
                >
                <span class="text-[8px] text-slate-400"
                  >{{ geo.marketShare.percentage }}%</span
                >
              </div>
            </div>
          </button>
          <div
            v-if="filtered.length === 0"
            class="flex flex-col items-center justify-center py-10 text-center px-4"
          >
            <Search class="w-6 h-6 text-slate-600 mb-2" />
            <p class="text-[10px] text-slate-500">Nenhum geohash encontrado</p>
          </div>
        </div>
      </div>

      <!-- Main -->
      <div class="flex-1 overflow-y-auto bg-slate-50">
        <div v-if="displayGeo" class="p-4 space-y-4">
          <!-- Header geohash -->
          <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 border border-green-100"
                >
                  <MapPin class="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 class="text-[15px] font-black text-slate-800 leading-tight">
                    {{ displayGeo.neighborhood }}
                  </h2>
                  <p class="text-[10px] text-slate-400">
                    {{ displayGeo.city }} · {{ displayGeo.id }}
                  </p>
                </div>
              </div>
              <!-- Badge de Prioridade -->
              <div v-if="priority" class="shrink-0">
                <div
                  class="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border-2"
                  :style="{
                    borderColor: priority.percentile >= 75 ? '#DC2626' : priority.percentile >= 40 ? '#D97706' : '#16A34A',
                    background:  priority.percentile >= 75 ? '#FEF2F2' : priority.percentile >= 40 ? '#FFFBEB' : '#F0FDF4',
                  }"
                >
                  <span
                    class="text-[8px] font-black uppercase tracking-widest"
                    :style="{ color: priority.percentile >= 75 ? '#DC2626' : priority.percentile >= 40 ? '#D97706' : '#16A34A' }"
                  >
                    {{ priority.percentile >= 75 ? 'ALTA PRIORIDADE' : priority.percentile >= 40 ? 'MÉDIA PRIORIDADE' : 'BAIXA PRIORIDADE' }}
                  </span>
                  <span
                    class="text-[22px] font-black leading-none"
                    :style="{ color: priority.percentile >= 75 ? '#DC2626' : priority.percentile >= 40 ? '#D97706' : '#16A34A' }"
                  >{{ priority.score }}</span>
                  <span class="text-[8px] text-slate-400">#{{ priority.rank }} de {{ priority.total }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Painel de Indicadores-Chave -->
          <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <!-- Demográficos -->
            <div class="px-4 py-2 border-b border-slate-100" style="background:#F8FAFC">
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Demográficos</p>
              <div class="grid grid-cols-4 gap-3">
                <!-- População -->
                <div>
                  <p class="text-[8px] text-slate-400 mb-0.5">População</p>
                  <p class="text-[13px] font-black text-slate-800">{{ fmtPop(displayGeo.marketShare.totalPopulation) }}</p>
                </div>
                <!-- Densidade -->
                <div>
                  <p class="text-[8px] text-slate-400 mb-0.5">Densidade</p>
                  <p class="text-[13px] font-black text-slate-800">
                    {{ displayGeo.demographics?.populationDensity ? displayGeo.demographics.populationDensity.toLocaleString('pt-BR') + ' hab/km²' : '—' }}
                  </p>
                </div>
                <!-- Renda Média -->
                <div>
                  <p class="text-[8px] text-slate-400 mb-0.5">Renda Média</p>
                  <p class="text-[13px] font-black text-slate-800">{{ fmtCurrency(displayGeo.demographics?.avgIncome) }}</p>
                </div>
                <!-- Classe Social -->
                <div>
                  <p class="text-[8px] text-slate-400 mb-0.5">Classe Social</p>
                  <span
                    class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full border"
                    :style="{ color: getSocialClass(displayGeo.demographics?.avgIncome).color, background: getSocialClass(displayGeo.demographics?.avgIncome).bg, borderColor: getSocialClass(displayGeo.demographics?.avgIncome).border }"
                  >{{ getSocialClass(displayGeo.demographics?.avgIncome).label }}</span>
                </div>
              </div>
            </div>

            <!-- Móvel + Fibra -->
            <div class="grid grid-cols-2 divide-x divide-slate-100">
              <!-- Móvel -->
              <div class="px-4 py-2">
                <div class="flex items-center gap-1.5 mb-2">
                  <div class="w-4 h-4 rounded-full flex items-center justify-center" style="background:#EFF6FF">
                    <span class="text-[7px] font-black" style="color:#1D4ED8">M</span>
                  </div>
                  <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Móvel</p>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <!-- Share Móvel + Delta -->
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">Share Vivo</p>
                    <p class="text-[13px] font-black text-slate-800">{{ displayGeo.shareTrend.shareMovel != null ? displayGeo.shareTrend.shareMovel + '%' : (displayGeo.marketShare.percentage + '%') }}</p>
                    <p class="text-[8px] font-bold" :class="(displayGeo.shareTrend.deltaMovel ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'">
                      {{ fmtDeltaShare(displayGeo.shareTrend.deltaMovel ?? displayGeo.shareTrend.delta) }}
                    </p>
                  </div>
                  <!-- Plano Móvel -->
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">Plano Principal</p>
                    <p class="text-[11px] font-black text-slate-800">{{ displayGeo.crm?.planoMovel ?? '—' }}</p>
                  </div>
                  <!-- ARPU Móvel -->
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">ARPU Móvel</p>
                    <p class="text-[13px] font-black text-slate-800">{{ fmtCurrency(displayGeo.crm?.arpuMovel) }}</p>
                  </div>
                </div>
              </div>

              <!-- Fibra -->
              <div class="px-4 py-2">
                <div class="flex items-center gap-1.5 mb-2">
                  <div class="w-4 h-4 rounded-full flex items-center justify-center" style="background:#F0FDF4">
                    <span class="text-[7px] font-black" style="color:#15803D">F</span>
                  </div>
                  <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fibra</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <!-- Share Fibra + Delta -->
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">Share Vivo</p>
                    <template v-if="(displayGeo.shareTrend.shareFibra ?? 0) > 0">
                      <p class="text-[13px] font-black text-slate-800">{{ displayGeo.shareTrend.shareFibra }}%</p>
                      <p class="text-[8px] font-bold" :class="(displayGeo.shareTrend.deltaFibra ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'">
                        {{ fmtDeltaShare(displayGeo.shareTrend.deltaFibra) }}
                      </p>
                    </template>
                    <template v-else>
                      <p class="text-[11px] font-bold text-slate-400">Sem cobertura</p>
                    </template>
                  </div>
                  <!-- ARPU Fibra -->
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">ARPU Fibra</p>
                    <p class="text-[13px] font-black text-slate-800">{{ fmtCurrency(displayGeo.crm?.arpuFibra) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Diagnóstico -->
          <div
            v-if="displayGeo.diagnostico && pilares.length > 0 && recomendacao"
            class="grid grid-cols-3 gap-4"
          >
            <div class="col-span-2 space-y-3">
              <div class="flex items-center gap-2">
                <BarChart3 class="w-4 h-4 text-slate-400" />
                <h3
                  class="text-[11px] font-black text-slate-600 uppercase tracking-wide"
                >
                  Avaliação dos 4 Pilares
                </h3>
              </div>
              <div
                v-for="pilar in pilares"
                :key="pilar.id"
                class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm"
              >
                <div
                  class="flex items-center justify-between px-3 py-2 border-b border-slate-100"
                  :style="{ backgroundColor: SIG[pilar.signal].bg }"
                >
                  <div class="flex items-center gap-2">
                    <div
                      class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black"
                      :style="{ backgroundColor: SIG[pilar.signal].dot }"
                    >
                      {{ pilar.id }}
                    </div>
                    <div
                      class="flex items-center gap-1.5"
                      :style="{ color: SIG[pilar.signal].text }"
                    >
                      <component
                        :is="PILAR_ICONS[pilar.id]"
                        class="w-3.5 h-3.5"
                      />
                      <span class="text-[11px] font-black uppercase tracking-wide">{{
                        pilar.title
                      }}</span>
                    </div>
                  </div>
                  <span
                    class="text-[8px] font-bold px-2 py-0.5 rounded-full text-white"
                    :style="{ backgroundColor: SIG[pilar.signal].dot }"
                    >{{ SIG[pilar.signal].label }}</span
                  >
                </div>
                <div class="p-2 space-y-1.5">
                  <div
                    v-for="(m, i) in pilar.metricas"
                    :key="i"
                    class="rounded-lg border px-3 py-2"
                    :style="{
                      backgroundColor: SIG[m.signal].bg,
                      borderColor: SIG[m.signal].border,
                    }"
                  >
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <div class="min-w-0">
                        <p class="text-[10px] font-bold text-slate-700 leading-tight">
                          {{ m.label }}
                        </p>
                        <p class="text-[8px] text-slate-400 leading-tight mt-0.5">
                          {{ m.formula }}
                        </p>
                      </div>
                      <p
                        class="text-[11px] font-black shrink-0"
                        :style="{ color: SIG[m.signal].text }"
                      >
                        {{ metricDisplay(m) }}
                      </p>
                    </div>
                    <p
                      class="text-[8.5px] font-medium leading-tight"
                      :style="{ color: SIG[m.signal].text }"
                    >
                      {{ m.detail }}
                    </p>
                  </div>

                  <!-- Tabela comparativa de concorrêntes (apenas no pilar 02) -->
                  <div
                    v-if="pilar.id === '02' && displayGeo?.diagnostico?.concorrentes?.length"
                    class="rounded-lg border border-slate-200 overflow-hidden"
                  >
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                      <TrendingUp class="w-3 h-3 text-slate-400" />
                      <span class="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Comparativo de Concorrência</span>
                    </div>
                    <table class="w-full text-[8px]">
                      <thead>
                        <tr class="border-b border-slate-100 bg-slate-50">
                          <th class="text-left px-3 py-1.5 font-bold text-slate-500">Operadora</th>
                          <th class="text-center px-2 py-1.5 font-bold text-slate-500">Cobertura</th>
                          <th class="text-left px-2 py-1.5 font-bold text-slate-500">Plano Prioritário</th>
                          <th class="text-right px-3 py-1.5 font-bold text-slate-500">Preço</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(c, ci) in displayGeo.diagnostico.concorrentes"
                          :key="ci"
                          class="border-b border-slate-50 last:border-0"
                          :class="ci % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'"
                        >
                          <td class="px-3 py-1.5 font-black text-slate-700">{{ c.nome }}</td>
                          <td class="px-2 py-1.5 text-center">
                            <span
                              class="inline-block px-1.5 py-0.5 rounded-full text-[7px] font-bold"
                              :class="c.temCobertura ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'"
                            >{{ c.temCobertura ? 'Sim' : 'Não' }}</span>
                          </td>
                          <td class="px-2 py-1.5 text-slate-600">{{ c.planoPrioritario }}</td>
                          <td class="px-3 py-1.5 text-right font-bold text-slate-700">
                            R$ {{ c.preco.toFixed(2).replace('.', ',') }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recomendação IA -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Brain class="w-4 h-4 text-slate-400" />
                <h3
                  class="text-[11px] font-black text-slate-600 uppercase tracking-wide"
                >
                  Recomendação
                </h3>
              </div>
              <div
                class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm flex flex-col"
              >
                <div
                  class="px-4 py-3 border-b border-slate-100 flex items-center gap-2"
                  :style="{
                    background: `linear-gradient(135deg, ${recomendacao.decisaoColor}15, ${recomendacao.decisaoColor}05)`,
                  }"
                >
                  <Brain class="w-4 h-4 text-purple-600" />
                  <span
                    class="text-[11px] font-black text-slate-700 uppercase tracking-wide"
                    >Recomendação IA</span
                  >
                  <span class="ml-auto text-[8px] text-slate-400"
                    >Gerado automaticamente</span
                  >
                </div>
                <div class="px-4 py-3 border-b border-slate-100">
                  <p
                    class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2"
                  >
                    Decisão
                  </p>
                  <div
                    class="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    :style="{
                      backgroundColor: recomendacao.decisaoColor + '12',
                      borderColor: recomendacao.decisaoColor + '40',
                    }"
                  >
                    <component
                      :is="DECISAO_ICONS[recomendacao.decisao]"
                      class="w-5 h-5"
                      :style="{ color: recomendacao.decisaoColor }"
                    />
                    <span
                      class="text-[14px] font-black"
                      :style="{ color: recomendacao.decisaoColor }"
                      >{{ recomendacao.decisao }}</span
                    >
                  </div>
                </div>
                <div class="px-4 py-3 border-b border-slate-100">
                  <p
                    class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
                  >
                    Canal Recomendado
                  </p>
                  <div
                    class="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                  >
                    <ShoppingBag class="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                    <p class="text-[10px] text-slate-700 leading-snug">
                      {{ recomendacao.canal }}
                    </p>
                  </div>
                </div>
                <div class="px-4 py-3 border-b border-slate-100">
                  <p
                    class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
                  >
                    Abordagem Comercial
                  </p>
                  <div
                    class="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                  >
                    <Zap class="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p class="text-[10px] text-slate-700 leading-snug">
                      {{ recomendacao.abordagem }}
                    </p>
                  </div>
                </div>
                <div class="px-4 py-3 flex-1">
                  <p
                    class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
                  >
                    Raciocínio
                  </p>
                  <div
                    class="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100"
                  >
                    <Brain class="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                    <p class="text-[10px] text-purple-700 leading-snug">
                      {{ recomendacao.raciocinio }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-100"
          >
            <BarChart3 class="w-10 h-10 text-slate-200 mb-3" />
            <p class="text-[12px] font-bold text-slate-400">
              Sem dados de diagnóstico
            </p>
          </div>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center h-full text-center"
        >
          <Rocket class="w-10 h-10 text-slate-200 mb-3" />
          <p class="text-[12px] font-bold text-slate-400">Selecione um geohash</p>
        </div>
      </div>
    </div>
  </div>
</template>
