<template>
  <div class="h-full flex flex-col overflow-hidden" style="font-size: 0">
    <!-- Empty state -->
    <div v-if="!data" class="flex flex-col items-center justify-center h-full text-center px-4 gap-2">
      <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
        <MapPin class="w-4 h-4 text-purple-300" />
      </div>
      <p class="text-[10px] font-semibold text-slate-400">Nenhum geohash selecionado</p>
      <p class="text-[9px] text-slate-300">Passe o cursor sobre uma célula no mapa.</p>
    </div>

    <template v-else>
      <!-- ══ HEADER ══ -->
      <div
        class="shrink-0 px-3 pt-2.5 pb-2 relative"
        :style="{
          background: `linear-gradient(150deg, ${qColor.hex}22 0%, ${qColor.hex}06 100%)`,
          borderBottom: `1px solid ${qColor.hex}20`,
        }"
      >
        <div class="absolute left-0 top-0 bottom-0 w-0.5 rounded-r" :style="{ backgroundColor: qColor.hex }" />

        <!-- Badges -->
        <div class="flex items-center gap-1 mb-1.5 pl-1">
          <span class="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" :style="{ backgroundColor: qColor.hex }">
            {{ qColor.label }}
          </span>
          <span class="text-[7px] font-bold px-1.5 py-0.5 rounded-full text-white" :style="{ backgroundColor: techMeta.color }">
            {{ techMeta.label }}
          </span>
          <span
            class="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full border"
            :style="{ color: priorityColor, borderColor: priorityColor + '40', backgroundColor: priorityColor + '10' }"
          >
            {{ priorityLabel }}
          </span>
        </div>

        <!-- Name -->
        <div class="pl-1 mb-1.5">
          <h3 class="text-[12px] font-black text-slate-800 leading-tight">{{ data.neighborhood ?? data.geohash_id }}</h3>
          <p class="text-[7.5px] text-slate-400">{{ data.city }} · <span class="font-mono">{{ data.geohash_id }}</span></p>
        </div>

        <!-- 3 metric boxes -->
        <div class="grid grid-cols-3 gap-1.5 pl-1">
          <div class="rounded-lg p-1.5 text-center" :style="{ backgroundColor: qColor.hex + '12', border: `1px solid ${qColor.hex}20` }">
            <div class="text-[6.5px] text-slate-400 font-semibold mb-0.5">Share Vivo</div>
            <div class="text-[13px] font-black leading-none" :style="{ color: qColor.hex }">{{ Math.round(data.share_vivo) }}%</div>
            <div class="flex items-center justify-center gap-0.5 mt-0.5">
              <span class="text-[6.5px] font-bold" :style="{ color: trendColor }">
                {{ trendArrow }} {{ Math.abs(data.trend_delta).toFixed(1) }}pp
              </span>
            </div>
          </div>
          <div class="rounded-lg p-1.5 text-center" style="background-color: #FFFBEB; border: 1px solid #FDE68A">
            <div class="text-[6.5px] text-slate-400 font-semibold mb-0.5">Sat. Vivo</div>
            <div class="text-[13px] font-black leading-none text-amber-500">{{ vivoScore.toFixed(1) }}</div>
            <div class="text-[6.5px] text-amber-400 font-semibold mt-0.5">
              {{ vivoScore >= 7.5 ? "Alta" : vivoScore >= 6 ? "Média" : "Crítica" }}
            </div>
          </div>
          <div class="rounded-lg p-1.5 text-center" :style="{ backgroundColor: priorityColor + '10', border: `1px solid ${priorityColor}30` }">
            <div class="text-[6.5px] text-slate-400 font-semibold mb-0.5">Prioridade</div>
            <div class="text-[13px] font-black leading-none" :style="{ color: priorityColor }">{{ data.priority_score.toFixed(1) }}</div>
            <div class="text-[6.5px] font-bold mt-0.5" :style="{ color: priorityColor }">/10</div>
          </div>
        </div>
      </div>

      <!-- ══ TABS ══ -->
      <div class="shrink-0 flex gap-0.5 bg-slate-100 mx-3 my-1.5 rounded-lg p-0.5">
        <button
          v-for="t in TABS"
          :key="t.key"
          @click="tab = t.key"
          class="flex-1 flex items-center justify-center gap-0.5 text-[7px] font-bold py-1 rounded-md transition-all"
          :style="tab === t.key ? { backgroundColor: '#660099', color: 'white' } : { color: '#64748b' }"
        >
          <component :is="t.icon" class="w-2 h-2" />
          {{ t.label }}
        </button>
      </div>

      <!-- ══ TAB C1 — COMERCIAL ══ -->
      <div v-if="tab === 'c1'" class="flex-1 px-3 pb-2 flex flex-col gap-1.5 overflow-hidden">
        <!-- Satisfação Comparativa -->
        <div class="rounded-lg border border-slate-100 overflow-hidden">
          <div class="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-100">
            <Activity class="w-2.5 h-2.5 text-slate-400" />
            <span class="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Satisfação Comparativa</span>
          </div>
          <div class="px-2 py-1.5 space-y-1">
            <div v-for="op in operatorScores" :key="op.name" class="flex items-center gap-1.5">
              <span class="text-[8px] font-black w-7 shrink-0" :style="{ color: op.bar }">{{ op.name }}</span>
              <div class="flex-1 h-2.5 rounded-full overflow-hidden" :style="{ backgroundColor: op.bg }">
                <div class="h-full rounded-full" :style="{ width: `${Math.min(100, (op.score / 10) * 100)}%`, backgroundColor: op.bar }" />
              </div>
              <span class="text-[9px] font-black text-slate-700 w-5 text-right shrink-0">{{ op.score.toFixed(1) }}</span>
              <span class="text-[6.5px] font-bold w-5 shrink-0" :style="{ color: qualityColor(op.score) }">
                {{ qualityLabel(op.score) }}
              </span>
            </div>
          </div>
        </div>

        <!-- SpeedTest + CRM in 2 cols -->
        <div class="grid grid-cols-2 gap-1.5">
          <div v-if="hasSpeedtest" class="rounded-lg border border-slate-100 p-1.5">
            <div class="flex items-center gap-1 mb-1">
              <Zap class="w-2.5 h-2.5 text-sky-400" />
              <span class="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">SpeedTest</span>
            </div>
            <DataRow label="Download" :value="`${detailData?.download_mbps ?? 0} Mbps`" />
            <DataRow label="Latência" :value="`${detailData?.latency_ms ?? 0} ms`" />
            <DataRow label="Qualidade" :value="detailData?.quality_label ?? '—'" />
          </div>
          <div v-if="hasCrm" class="rounded-lg border border-slate-100 p-1.5">
            <div class="flex items-center gap-1 mb-1">
              <DollarSign class="w-2.5 h-2.5 text-emerald-400" />
              <span class="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">CRM Vivo</span>
            </div>
            <DataRow label="ARPU" :value="`R$ ${detailData?.crm?.avg_arpu ?? '—'}`" />
            <DataRow label="Device" :value="detailData?.crm?.device_tier ?? '—'" />
            <DataRow label="Plano" :value="detailData?.crm?.dominant_plan_type ?? '—'" />
          </div>
        </div>

        <!-- Perfil da Área -->
        <div class="rounded-lg border border-slate-100 p-1.5">
          <div class="flex items-center gap-1 mb-1">
            <Users class="w-2.5 h-2.5 text-orange-400" />
            <span class="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">Perfil da Área</span>
          </div>
          <div class="grid grid-cols-2 gap-x-3">
            <DataRow label="Pop. BK" :value="formatPop(detailData?.populacao_residente)" />
            <DataRow label="Renda Méd." :value="formatIncome(detailData?.avg_income)" />
            <DataRow label="Domicílios" :value="formatPop(detailData?.total_domicilios)" />
          </div>
        </div>

        <!-- Insights -->
        <div v-if="insights.length > 0" class="space-y-1">
          <div
            v-for="(ins, i) in insights"
            :key="i"
            class="rounded-lg border px-2 py-1 flex items-start gap-1.5"
            :style="{ backgroundColor: INSIGHT_STYLES[ins.type].bg, borderColor: INSIGHT_STYLES[ins.type].border }"
          >
            <component
              :is="ins.type === 'positive' ? TrendingUp : AlertTriangle"
              class="w-2.5 h-2.5 mt-0.5 shrink-0"
              :style="{ color: INSIGHT_STYLES[ins.type].icon }"
            />
            <p class="text-[7.5px] leading-snug font-medium" :style="{ color: INSIGHT_STYLES[ins.type].text }">
              {{ ins.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- ══ TAB C2 — INFRAESTRUTURA ══ -->
      <div v-if="tab === 'c2'" class="flex-1 px-3 pb-2 flex flex-col gap-1.5 overflow-hidden">
        <template v-if="detailData?.camada2">
          <!-- Fibra -->
          <div v-if="detailData.camada2.fibra" class="rounded-lg border overflow-hidden" :style="{ borderColor: fibraClass.color + '30' }">
            <div
              class="flex items-center justify-between px-2 py-1.5 border-b"
              :style="{ backgroundColor: fibraClass.bg, borderColor: fibraClass.color + '20' }"
            >
              <div class="flex items-center gap-1">
                <Wifi class="w-3 h-3" :style="{ color: fibraClass.color }" />
                <span class="text-[7px] font-bold text-slate-600 uppercase tracking-wider">Fibra Óptica</span>
              </div>
              <span class="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" :style="{ backgroundColor: fibraClass.color }">
                {{ fibraClass.label }}
              </span>
            </div>
            <div class="px-2 py-1.5 space-y-1">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-[7px] text-slate-400">Score de Intervenção</span>
                <span class="text-[8px] font-black" :style="{ color: fibraClass.color }">{{ detailData.camada2.fibra.score }}/100</span>
              </div>
              <div class="relative h-2.5 rounded-full overflow-hidden bg-slate-100">
                <div class="h-full rounded-full" :style="{ width: `${Math.min(100, detailData.camada2.fibra.score)}%`, backgroundColor: fibraClass.color }" />
              </div>
              <div class="grid grid-cols-2 gap-x-2 pt-0.5">
                <DataRow v-if="detailData.camada2.fibra.taxa_ocupacao" label="Ocupação" :value="`${detailData.camada2.fibra.taxa_ocupacao}%`" />
                <DataRow v-if="detailData.camada2.fibra.potencial_mercado" label="Potencial" :value="`${detailData.camada2.fibra.potencial_mercado}`" />
              </div>
            </div>
          </div>

          <!-- Móvel -->
          <div v-if="detailData.camada2.movel" class="rounded-lg border overflow-hidden" :style="{ borderColor: movelClass.color + '30' }">
            <div
              class="flex items-center justify-between px-2 py-1.5 border-b"
              :style="{ backgroundColor: movelClass.bg, borderColor: movelClass.color + '20' }"
            >
              <div class="flex items-center gap-1">
                <Signal class="w-3 h-3" :style="{ color: movelClass.color }" />
                <span class="text-[7px] font-bold text-slate-600 uppercase tracking-wider">Rede Móvel</span>
              </div>
              <span class="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white" :style="{ backgroundColor: movelClass.color }">
                {{ movelClass.label }}
              </span>
            </div>
            <div class="px-2 py-1.5 space-y-1">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-[7px] text-slate-400">Score de Intervenção</span>
                <span class="text-[8px] font-black" :style="{ color: movelClass.color }">{{ detailData.camada2.movel.score }}/100</span>
              </div>
              <div class="relative h-2.5 rounded-full overflow-hidden bg-slate-100">
                <div class="h-full rounded-full" :style="{ width: `${Math.min(100, detailData.camada2.movel.score)}%`, backgroundColor: movelClass.color }" />
              </div>
              <div class="grid grid-cols-2 gap-x-2 pt-0.5">
                <DataRow v-if="detailData.camada2.movel.speedtest_score" label="Score Ookla" :value="`${detailData.camada2.movel.speedtest_score}`" />
                <DataRow v-if="detailData.camada2.movel.concentracao_renda" label="Conc. Renda" :value="`${detailData.camada2.movel.concentracao_renda}`" />
              </div>
            </div>
          </div>
        </template>

        <div v-else class="flex flex-col items-center justify-center flex-1 text-center gap-2">
          <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Layers class="w-4 h-4 text-slate-300" />
          </div>
          <p class="text-[9px] text-slate-400 font-bold">Sem dados de Camada 2</p>
          <p class="text-[8px] text-slate-300">Infraestrutura não mapeada</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  MapPin, Activity, Zap, DollarSign, Users,
  TrendingUp, AlertTriangle, Layers, Wifi, Signal,
} from "lucide-vue-next";
import { QUADRANT_COLORS, type Quadrant } from "../composables/useFilters";

// ─── Sub-component: DataRow ──────────────────────────────────────────────────
const DataRow = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () =>
      h("div", { class: "flex items-center justify-between" }, [
        h("span", { class: "text-[7.5px] text-slate-400" }, props.label),
        h("span", { class: "text-[8px] font-bold text-slate-700" }, props.value),
      ]);
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

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
  download_mbps?: number | null;
  latency_ms?: number | null;
  quality_label?: string | null;
  avg_income?: number | null;
  populacao_residente?: number | null;
  total_domicilios?: number | null;
  crm?: {
    avg_arpu: number | null;
    dominant_plan_type: string | null;
    device_tier: string | null;
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
      speedtest_score?: number | null;
      concentracao_renda?: number | null;
    } | null;
  } | null;
}

const props = defineProps<{
  data: GeohashSummary | null;
  detailData?: DetailData | null;
}>();

// ─── State ───────────────────────────────────────────────────────────────────

const tab = ref<"c1" | "c2">("c1");

const TABS = [
  { key: "c1" as const, icon: Activity, label: "CAMADA 1: Comercial" },
  { key: "c2" as const, icon: Layers, label: "CAMADA 2: Infraestrutura" },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const TECH_META: Record<string, { label: string; color: string }> = {
  FIBRA: { label: "Fibra", color: "#0EA5E9" },
  MOVEL: { label: "Móvel", color: "#F97316" },
  AMBOS: { label: "F+M", color: "#8B5CF6" },
};

const CARRIER: Record<string, { bar: string; bg: string }> = {
  Vivo: { bar: "#F59E0B", bg: "#FEF3C7" },
  TIM: { bar: "#22C55E", bg: "#DCFCE7" },
  Claro: { bar: "#EF4444", bg: "#FEE2E2" },
};

const FIBRA_CLASS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  AUMENTO_CAPACIDADE: { label: "Aumento de Capacidade", color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_NOVA_AREA: { label: "Expansão Nova Área", color: "#D97706", bg: "#FFFBEB" },
  SAUDAVEL: { label: "Rede Saudável", color: "#16A34A", bg: "#F0FDF4" },
  OK: { label: "Rede Saudável", color: "#16A34A", bg: "#F0FDF4" },
  SEM_FIBRA: { label: "Sem Fibra", color: "#94A3B8", bg: "#F8FAFC" },
};

const MOVEL_CLASS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  MELHORA_QUALIDADE: { label: "Melhora na Qualidade", color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_COBERTURA: { label: "Expansão de Cobertura", color: "#D97706", bg: "#FFFBEB" },
  SAUDAVEL: { label: "Rede Saudável", color: "#16A34A", bg: "#F0FDF4" },
  EXPANSAO_5G: { label: "Expansão 5G", color: "#7C3AED", bg: "#F5F3FF" },
  EXPANSAO_4G: { label: "Expansão 4G", color: "#2563EB", bg: "#EFF6FF" },
};

const INSIGHT_STYLES = {
  positive: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D", icon: "#16A34A" },
  negative: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", icon: "#EF4444" },
  warning: { bg: "#FFFBEB", border: "#FCD34D", text: "#B45309", icon: "#D97706" },
  neutral: { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", icon: "#64748B" },
};

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  P1_CRITICA: { color: "#DC2626", label: "P1 Crítica" },
  P2_ALTA: { color: "#EA580C", label: "P2 Alta" },
  P3_MEDIA: { color: "#CA8A04", label: "P3 Média" },
  P4_BAIXA: { color: "#16A34A", label: "P4 Baixa" },
};

// ─── Computed ────────────────────────────────────────────────────────────────

const qColor = computed(() =>
  QUADRANT_COLORS[props.data?.quadrant_type as Quadrant] ?? QUADRANT_COLORS.GROWTH,
);

const techMeta = computed(() =>
  TECH_META[props.data?.tech_category ?? ""] ?? { label: "—", color: "#64748B" },
);

const priorityColor = computed(() =>
  PRIORITY_MAP[props.data?.priority_label ?? ""]?.color ?? "#64748B",
);

const priorityLabel = computed(() =>
  PRIORITY_MAP[props.data?.priority_label ?? ""]?.label ?? "—",
);

const vivoScore = computed(() =>
  props.data?.vivo_score ?? props.data?.avg_satisfaction_vivo ?? 0,
);

const trendArrow = computed(() => {
  const d = props.data?.trend_direction;
  return d === "UP" ? "↑" : d === "DOWN" ? "↓" : "→";
});

const trendColor = computed(() => {
  const d = props.data?.trend_direction;
  return d === "UP" ? "#16A34A" : d === "DOWN" ? "#DC2626" : "#94A3B8";
});

const operatorScores = computed(() => {
  if (!props.data) return [];
  return [
    { name: "Vivo", score: props.data.vivo_score ?? props.data.avg_satisfaction_vivo, ...CARRIER.Vivo },
    { name: "TIM", score: props.data.tim_score ?? 0, ...CARRIER.TIM },
    { name: "Claro", score: props.data.claro_score ?? 0, ...CARRIER.Claro },
  ].filter((op) => op.score > 0);
});

const hasSpeedtest = computed(() =>
  props.detailData?.download_mbps != null || props.detailData?.latency_ms != null,
);

const hasCrm = computed(() => props.detailData?.crm != null);

const fibraClass = computed(() => {
  const c = props.detailData?.camada2?.fibra?.classification ?? "";
  return FIBRA_CLASS_MAP[c] ?? { label: c, color: "#64748B", bg: "#F8FAFC" };
});

const movelClass = computed(() => {
  const c = props.detailData?.camada2?.movel?.classification ?? "";
  return MOVEL_CLASS_MAP[c] ?? { label: c, color: "#64748B", bg: "#F8FAFC" };
});

const insights = computed(() => {
  if (!props.data) return [];
  const ins: Array<{ type: "positive" | "negative" | "warning" | "neutral"; text: string }> = [];
  const share = props.data.share_vivo;
  const vivo = vivoScore.value;
  const best = Math.max(props.data.tim_score ?? 0, props.data.claro_score ?? 0);

  if (share >= 40) ins.push({ type: "positive", text: "Share dominante — foco em upsell e retenção" });
  else if (share < 25) ins.push({ type: "warning", text: "Share baixo — oportunidade de crescimento" });
  if (vivo >= 7.5) ins.push({ type: "positive", text: "Satisfação alta — base estável, baixo churn" });
  else if (vivo < 6.0) ins.push({ type: "negative", text: "Satisfação crítica — risco elevado de churn" });
  if (best > vivo + 0.5) ins.push({ type: "negative", text: "Concorrente com satisfação superior" });
  else if (vivo > best + 0.5) ins.push({ type: "positive", text: "Vivo lidera satisfação no geohash" });
  if (props.detailData?.avg_income && props.detailData.avg_income > 8000)
    ins.push({ type: "positive", text: "Renda alta — potencial para planos premium" });
  return ins.slice(0, 2);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qualityLabel(score: number): string {
  return score >= 8 ? "Exc" : score >= 7 ? "Bom" : score >= 6 ? "Reg" : "Crít";
}

function qualityColor(score: number): string {
  return score >= 8 ? "#16A34A" : score >= 7 ? "#0EA5E9" : score >= 6 ? "#D97706" : "#DC2626";
}

function formatPop(val?: number | null): string {
  if (val == null) return "—";
  return val.toLocaleString("pt-BR");
}

function formatIncome(val?: number | null): string {
  if (val == null) return "—";
  return `R$ ${val.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
</script>
