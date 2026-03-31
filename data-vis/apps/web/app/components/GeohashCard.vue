<template>
  <div class="h-full px-3 py-2 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">

    <!-- Empty state -->
    <template v-if="!data">
      <div class="flex flex-col items-center justify-center h-full text-center px-6">
        <div class="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-2">
          <svg class="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>
        <p class="text-xs font-semibold text-slate-400 mb-1">Nenhum geohash selecionado</p>
        <p class="text-[10px] text-slate-300 leading-relaxed">
          Passe o cursor sobre uma célula no mapa.
        </p>
      </div>
    </template>

    <template v-else>
      <!-- Header -->
      <div class="shrink-0 pb-1.5 border-b border-slate-100">
        <div class="flex items-center justify-between gap-1">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-mono text-[13px] font-bold text-slate-800 tracking-tight leading-none truncate">
              {{ data.geohash_id }}
            </span>
            <span
              v-if="data.is_top10"
              class="inline-flex items-center gap-0.5 bg-amber-400 text-amber-900 text-[7px] font-bold px-1 py-0.5 rounded-full leading-none shrink-0"
            >
              ★ Top 10
            </span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span
              class="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded-full border"
              :style="{ color: techColor, borderColor: techColor + '40', backgroundColor: techColor + '10' }"
            >
              {{ techLabel }}
            </span>
            <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: quadrantColor.hex }" />
          </div>
        </div>
        <div class="flex items-center gap-1 mt-0.5 text-[9px] text-slate-400">
          <svg class="w-2 h-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span class="truncate">{{ data.neighborhood ?? "—" }}, {{ data.city }}</span>
        </div>
      </div>

      <!-- Priority -->
      <div
        class="shrink-0 rounded px-2 py-1 border"
        :style="{ backgroundColor: priorityColor + '08', borderColor: priorityColor + '30' }"
      >
        <div class="flex items-center justify-between mb-0.5">
          <span class="text-[7px] font-bold uppercase tracking-widest leading-none" :style="{ color: priorityColor }">
            Prioridade em {{ quadrantColor.label }}
          </span>
          <span class="text-[7px] font-bold px-1 py-0.5 rounded-full text-white leading-none" :style="{ backgroundColor: priorityColor }">
            {{ priorityLabelText }}
          </span>
        </div>
        <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full"
            :style="{ width: `${Math.min(data.priority_score * 10, 100)}%`, backgroundColor: priorityColor }"
          />
        </div>
        <div class="mt-0.5 text-[8px] text-slate-400 text-right">
          Score: {{ data.priority_score.toFixed(2) }}/10
        </div>
      </div>

      <!-- Tabs -->
      <div class="shrink-0 flex gap-1 bg-slate-100 rounded-md p-0.5">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 flex items-center justify-center gap-1 text-[8px] font-bold py-1 rounded transition-all"
          :style="activeTab === tab.key
            ? { backgroundColor: '#660099', color: 'white' }
            : { color: '#64748b' }"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: Camada 1 -->
      <template v-if="activeTab === 'camada1'">
        <!-- Satisfação -->
        <div class="shrink-0">
          <p class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Satisfação — QoE
          </p>
          <div class="flex flex-col gap-0.5">
            <div
              v-for="op in operatorScores"
              :key="op.name"
              class="flex items-center gap-1"
            >
              <span class="text-[8px] font-semibold text-slate-400 w-8 shrink-0">{{ op.name }}</span>
              <div class="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :style="{ width: `${(op.score / 10) * 100}%`, backgroundColor: op.color }"
                />
              </div>
              <span class="text-[8px] font-bold text-slate-600 w-5 text-right shrink-0">
                {{ op.score.toFixed(1) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Share -->
        <div class="shrink-0 pb-1.5 border-b border-slate-100">
          <p class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Share de Mercado (Vivo)
          </p>
          <div class="flex items-center gap-2">
            <div class="relative w-8 h-8 shrink-0">
              <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" stroke-width="6" />
                <circle
                  cx="18" cy="18" r="14" fill="none" stroke="#660099" stroke-width="6"
                  :stroke-dasharray="`${2 * Math.PI * 14}`"
                  :stroke-dashoffset="`${2 * Math.PI * 14 * (1 - data.share_vivo / 100)}`"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-[7px] font-bold text-slate-700">{{ data.share_vivo.toFixed(0) }}%</span>
              </div>
            </div>
            <div class="min-w-0">
              <p class="text-[9px] font-bold text-slate-700 leading-tight">
                {{ shareLevel }}
              </p>
              <p class="text-[8px] text-slate-400 leading-tight flex items-center gap-0.5">
                <span
                  class="font-bold"
                  :class="data.trend_direction === 'UP' ? 'text-green-600' : data.trend_direction === 'DOWN' ? 'text-red-600' : 'text-slate-400'"
                >
                  {{ trendArrow }} {{ Math.abs(data.trend_delta).toFixed(1) }}pp
                </span>
                {{ trendLabel }}
              </p>
            </div>
          </div>
        </div>

        <!-- Posição competitiva -->
        <div class="shrink-0">
          <p class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Posição Competitiva
          </p>
          <div class="bg-slate-50 rounded px-2 py-1.5 border border-slate-100">
            <span
              class="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
              :style="{ backgroundColor: compColor + '18', color: compColor }"
            >
              {{ compLabel }}
            </span>
            <p class="text-[8px] text-slate-500 mt-0.5">
              Delta vs. melhor concorrente
            </p>
          </div>
        </div>

        <!-- Estratégia recomendada -->
        <div class="shrink-0 mt-auto pt-1">
          <p class="text-[7px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
            Estratégia Recomendada
          </p>
          <div
            class="rounded px-2 py-1 border"
            :style="{ backgroundColor: quadrantColor.hex + '10', borderColor: quadrantColor.hex + '40' }"
          >
            <span
              class="text-[7px] font-bold uppercase tracking-widest block leading-none mb-0.5"
              :style="{ color: quadrantColor.hex }"
            >
              {{ quadrantColor.label }}
            </span>
            <p class="text-[9px] font-bold leading-tight" :style="{ color: quadrantColor.hex }">
              {{ strategyTitle }}
            </p>
          </div>
        </div>
      </template>

      <!-- Tab: Camada 2 -->
      <template v-if="activeTab === 'camada2'">
        <template v-if="detailData?.camada2">
          <!-- Fibra -->
          <div v-if="detailData.camada2.fibra" class="shrink-0">
            <div class="flex items-center gap-1 mb-1">
              <span class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Fibra</span>
              <span
                class="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                :style="{ backgroundColor: fibraColor + '18', color: fibraColor }"
              >
                {{ fibraLabel }}
              </span>
            </div>
            <div class="bg-slate-50 rounded px-2 py-1.5 border border-slate-100 flex flex-col gap-1.5">
              <div>
                <p class="text-[7px] text-slate-400 mb-0.5">Score de Intervenção</p>
                <div class="flex items-center gap-1">
                  <div class="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :style="{ width: `${detailData.camada2.fibra.score}%`, backgroundColor: fibraScoreColor }"
                    />
                  </div>
                  <span class="text-[7px] font-bold w-5 text-right shrink-0" :style="{ color: fibraScoreColor }">
                    {{ detailData.camada2.fibra.score }}
                  </span>
                  <span class="text-[7px] text-slate-400 shrink-0">({{ detailData.camada2.fibra.score_label }})</span>
                </div>
              </div>
              <div v-if="detailData.camada2.fibra.taxa_ocupacao" class="flex items-center justify-between gap-1">
                <span class="text-[8px] text-slate-400">Taxa de Ocupação</span>
                <span class="text-[8px] font-bold text-slate-700">{{ detailData.camada2.fibra.taxa_ocupacao }}%</span>
              </div>
              <div v-if="detailData.camada2.fibra.potencial_mercado" class="flex items-center justify-between gap-1">
                <span class="text-[8px] text-slate-400">Potencial de Mercado</span>
                <span class="text-[8px] font-bold text-slate-700">{{ detailData.camada2.fibra.potencial_mercado }}%</span>
              </div>
            </div>
          </div>

          <!-- Móvel -->
          <div v-if="detailData.camada2.movel" class="shrink-0">
            <div class="flex items-center gap-1 mb-1">
              <span class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Móvel</span>
              <span
                class="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                :style="{ backgroundColor: movelColor + '18', color: movelColor }"
              >
                {{ movelLabel }}
              </span>
            </div>
            <div class="bg-slate-50 rounded px-2 py-1.5 border border-slate-100 flex flex-col gap-1.5">
              <div>
                <p class="text-[7px] text-slate-400 mb-0.5">Score de Intervenção</p>
                <div class="flex items-center gap-1">
                  <div class="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :style="{ width: `${detailData.camada2.movel.score}%`, backgroundColor: movelScoreColor }"
                    />
                  </div>
                  <span class="text-[7px] font-bold w-5 text-right shrink-0" :style="{ color: movelScoreColor }">
                    {{ detailData.camada2.movel.score }}
                  </span>
                  <span class="text-[7px] text-slate-400 shrink-0">({{ detailData.camada2.movel.score_label }})</span>
                </div>
              </div>
              <div v-if="detailData.camada2.movel.tech_recommendation" class="flex items-center justify-between gap-1">
                <span class="text-[8px] text-slate-400">Tecnologia Recomendada</span>
                <span class="text-[8px] font-bold text-[#660099]">
                  {{ detailData.camada2.movel.tech_recommendation === '5G_PREMIUM' ? '5G (Premium)' : '4G (Mass)' }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="flex flex-col items-center justify-center flex-1 text-center py-6">
          <p class="text-[9px] text-slate-400 font-medium">Dados de Camada 2 não disponíveis</p>
          <p class="text-[8px] text-slate-300 mt-0.5">para este geohash</p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { QUADRANT_COLORS, type Quadrant } from "../composables/useFilters";

interface GeohashSummary {
  geohash_id: string;
  neighborhood: string | null;
  city: string;
  state: string;
  quadrant_type: string;
  share_vivo: number;
  avg_satisfaction_vivo: number;
  priority_score: number;
  priority_label: string;
  tech_category: string;
  trend_direction: string;
  trend_delta: number;
  competitive_position: string;
  vivo_score?: number | null;
  tim_score?: number | null;
  claro_score?: number | null;
  is_top10?: boolean;
}

interface DetailData extends GeohashSummary {
  crm?: {
    avg_arpu: number | null;
    dominant_plan_type: string | null;
    device_tier: string | null;
    avg_income: number | null;
    income_label: string | null;
  } | null;
  camada2?: {
    fibra: {
      classification: string;
      score: number;
      score_label: string;
      taxa_ocupacao?: number | null;
      potencial_mercado?: number | null;
    } | null;
    movel: {
      classification: string;
      score: number;
      score_label: string;
      tech_recommendation?: string | null;
    } | null;
  } | null;
}

const props = defineProps<{
  data: GeohashSummary | null;
  detailData?: DetailData | null;
}>();

const activeTab = ref<"camada1" | "camada2">("camada1");

const TABS = [
  { key: "camada1" as const, label: "CAMADA 1: Comercial" },
  { key: "camada2" as const, label: "CAMADA 2: Infraestrutura" },
];

const quadrantColor = computed(() =>
  props.data
    ? QUADRANT_COLORS[props.data.quadrant_type as Quadrant]
    : QUADRANT_COLORS.GROWTH,
);

const techLabel = computed(() => {
  const map: Record<string, string> = { FIBRA: "Fibra", MOVEL: "Móvel", AMBOS: "F+M" };
  return map[props.data?.tech_category ?? ""] ?? "—";
});

const techColor = computed(() => {
  const map: Record<string, string> = {
    FIBRA: "#0EA5E9",
    MOVEL: "#F97316",
    AMBOS: "#8B5CF6",
  };
  return map[props.data?.tech_category ?? ""] ?? "#64748B";
});

const priorityColor = computed(() => {
  const map: Record<string, string> = {
    P1_CRITICA: "#DC2626",
    P2_ALTA: "#EA580C",
    P3_MEDIA: "#CA8A04",
    P4_BAIXA: "#16A34A",
  };
  return map[props.data?.priority_label ?? ""] ?? "#64748B";
});

const priorityLabelText = computed(() => {
  const map: Record<string, string> = {
    P1_CRITICA: "P1 Crítica",
    P2_ALTA: "P2 Alta",
    P3_MEDIA: "P3 Média",
    P4_BAIXA: "P4 Baixa",
  };
  return map[props.data?.priority_label ?? ""] ?? "—";
});

const trendArrow = computed(() => {
  const d = props.data?.trend_direction;
  return d === "UP" ? "↑" : d === "DOWN" ? "↓" : "→";
});

const trendLabel = computed(() => {
  const d = props.data?.trend_direction;
  return d === "UP" ? "Subindo" : d === "DOWN" ? "Caindo" : "Estável";
});

const shareLevel = computed(() => {
  const s = props.data?.share_vivo ?? 0;
  if (s >= 50) return "Share Muito Alto";
  if (s >= 35) return "Share Alto";
  if (s >= 20) return "Share Médio";
  return "Share Baixo";
});

const operatorScores = computed(() => {
  if (!props.data) return [];
  return [
    { name: "VIVO", score: props.data.vivo_score ?? props.data.avg_satisfaction_vivo, color: "#660099" },
    { name: "TIM", score: props.data.tim_score ?? 0, color: "#0EA5E9" },
    { name: "CLARO", score: props.data.claro_score ?? 0, color: "#EF4444" },
  ].filter((op) => op.score > 0);
});

const compColor = computed(() => {
  const map: Record<string, string> = {
    LIDER: "#16A34A",
    COMPETITIVO: "#22C55E",
    EMPATADO: "#CA8A04",
    ABAIXO: "#EA580C",
    CRITICO: "#DC2626",
  };
  return map[props.data?.competitive_position ?? ""] ?? "#64748B";
});

const compLabel = computed(() => {
  const map: Record<string, string> = {
    LIDER: "Líder",
    COMPETITIVO: "Competitivo",
    EMPATADO: "Empatado",
    ABAIXO: "Abaixo",
    CRITICO: "Crítico",
  };
  return map[props.data?.competitive_position ?? ""] ?? "—";
});

const strategyTitle = computed(() => {
  const map: Record<string, string> = {
    GROWTH: "Gerar leads — atacar share baixo com qualidade como diferencial",
    UPSELL: "Maximizar receita — base fiel, potencial de upsell premium",
    RETENCAO: "Reter clientes — ação urgente anti-churn com foco em QoE",
    GROWTH_RETENCAO: "Dupla frente — resolver infraestrutura e atacar concorrência",
  };
  return map[props.data?.quadrant_type ?? ""] ?? "—";
});

function scoreColor(score: number) {
  if (score >= 80) return "#DC2626";
  if (score >= 60) return "#D97706";
  if (score >= 40) return "#2563EB";
  return "#16A34A";
}

const fibraColor = computed(() => {
  const map: Record<string, string> = {
    AUMENTO_CAPACIDADE: "#DC2626",
    EXPANSAO_NOVA_AREA: "#D97706",
    SAUDAVEL: "#16A34A",
    SEM_FIBRA: "#94A3B8",
  };
  return map[props.detailData?.camada2?.fibra?.classification ?? ""] ?? "#64748B";
});

const fibraLabel = computed(() => {
  const map: Record<string, string> = {
    AUMENTO_CAPACIDADE: "Aumento de Capacidade",
    EXPANSAO_NOVA_AREA: "Expansão Nova Área",
    SAUDAVEL: "Rede Saudável",
    SEM_FIBRA: "Sem Fibra",
  };
  return map[props.detailData?.camada2?.fibra?.classification ?? ""] ?? "—";
});

const fibraScoreColor = computed(() =>
  scoreColor(props.detailData?.camada2?.fibra?.score ?? 0),
);

const movelColor = computed(() => {
  const c = props.detailData?.camada2?.movel?.classification ?? "";
  if (c.includes("MELHORA")) return "#DC2626";
  if (c.includes("EXPANSAO")) return "#D97706";
  return "#16A34A";
});

const movelLabel = computed(() => {
  const map: Record<string, string> = {
    MELHORA_QUALIDADE_5G: "Melhora Qualidade 5G",
    MELHORA_QUALIDADE_4G: "Melhora Qualidade 4G",
    EXPANSAO_COBERTURA_5G: "Expansão Cobertura 5G",
    EXPANSAO_COBERTURA_4G: "Expansão Cobertura 4G",
    SAUDAVEL: "Rede Saudável",
  };
  return map[props.detailData?.camada2?.movel?.classification ?? ""] ?? "—";
});

const movelScoreColor = computed(() =>
  scoreColor(props.detailData?.camada2?.movel?.score ?? 0),
);
</script>
