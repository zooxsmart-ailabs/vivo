<template>
  <div class="h-full flex flex-col overflow-hidden" style="font-size: 0">
    <!-- Empty state -->
    <div v-if="!data" class="flex flex-col items-center justify-center h-full text-center px-4 gap-2">
      <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
        <MapPin class="w-4 h-4 text-purple-300" />
      </div>
      <p class="text-xs font-semibold text-slate-400">Nenhum geohash selecionado</p>
      <p class="text-xs text-slate-300">Passe o cursor sobre uma célula no mapa.</p>
    </div>

    <template v-else>
      <!-- ══ HEADER ══ -->
      <div
        class="shrink-0 px-4 pt-3 pb-3 relative"
        :style="{
          background: `linear-gradient(150deg, ${qColor.hex}22 0%, ${qColor.hex}06 100%)`,
          borderBottom: `1px solid ${qColor.hex}20`,
        }"
      >
        <div class="absolute left-0 top-0 bottom-0 w-0.5 rounded-r" :style="{ backgroundColor: qColor.hex }" />

        <!-- Badges -->
        <div class="flex items-center gap-1.5 mb-2 pl-1">
          <span class="text-xs font-black px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: qColor.hex }">
            {{ qColor.label }}
          </span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: techMeta.color }">
            {{ techMeta.label }}
          </span>
          <span
            class="ml-auto text-xs font-bold px-2 py-0.5 rounded-full border"
            :style="{ color: priorityColor, borderColor: priorityColor + '40', backgroundColor: priorityColor + '10' }"
          >
            {{ priorityLabel }}
          </span>
        </div>

        <!-- Name -->
        <div class="pl-1 mb-2">
          <h3 class="text-base font-black text-slate-800 leading-tight">{{ displayTitle }} <span class="text-xs font-mono font-medium text-slate-400">({{ data.geohash_id }})</span></h3>
          <p class="text-sm text-slate-400 mt-0.5">{{ displaySubtitle }}</p>
        </div>

        <!-- 3 metric boxes -->
        <div class="grid grid-cols-3 gap-2 pl-1">
          <div class="rounded-lg p-2 text-center" :style="{ backgroundColor: qColor.hex + '12', border: `1px solid ${qColor.hex}20` }">
            <div class="text-xs text-slate-400 font-semibold mb-1">Share Vivo</div>
            <div class="text-lg font-black leading-none" :style="{ color: qColor.hex }">{{ Math.round(data.share_vivo) }}%</div>
            <div class="flex items-center justify-center gap-0.5 mt-1">
              <span class="text-xs font-bold" :style="{ color: trendColor }">
                {{ trendArrow }} {{ Math.abs(Number(data.trend_delta)).toFixed(1) }}pp
              </span>
            </div>
          </div>
          <div class="rounded-lg p-2 text-center" style="background-color: #FFFBEB; border: 1px solid #FDE68A">
            <div class="text-xs text-slate-400 font-semibold mb-1">Sat. Vivo</div>
            <div class="text-lg font-black leading-none text-amber-500">{{ vivoScore.toFixed(0) }}</div>
            <div class="text-xs text-amber-400 font-semibold mt-1">
              {{ vivoScore >= 75 ? "Alta" : vivoScore >= 60 ? "Média" : "Crítica" }}
            </div>
          </div>
          <div class="rounded-lg p-2 text-center" :style="{ backgroundColor: priorityColor + '10', border: `1px solid ${priorityColor}30` }">
            <div class="text-xs text-slate-400 font-semibold mb-1">Prioridade</div>
            <div class="text-lg font-black leading-none" :style="{ color: priorityColor }">{{ (Number(data.priority_score) * 10).toFixed(0) }}</div>
            <div class="text-xs font-bold mt-1" :style="{ color: priorityColor }">/100</div>
          </div>
        </div>
      </div>

      <!-- ══ TABS ══ -->
      <div class="shrink-0 flex gap-1 bg-slate-100 mx-4 my-2 rounded-lg p-1">
        <button
          v-for="t in TABS"
          :key="t.key"
          @click="tab = t.key"
          class="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-1.5 rounded-md transition-all"
          :style="tab === t.key ? { backgroundColor: '#660099', color: 'white' } : { color: '#64748b' }"
        >
          <component :is="t.icon" class="w-3 h-3" />
          {{ t.label }}
        </button>
      </div>

      <!-- ══ TAB C1 — COMERCIAL ══ -->
      <div v-if="tab === 'c1'" class="flex-1 px-4 pb-3 flex flex-col gap-2 overflow-hidden">
        <!-- Satisfação Comparativa -->
        <div class="rounded-lg border border-slate-100 overflow-hidden">
          <div class="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-100">
            <Activity class="w-3.5 h-3.5 text-slate-400" />
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Satisfação Comparativa</span>
          </div>
          <div class="px-2 py-1.5 space-y-1">
            <div v-for="op in operatorScores" :key="op.name" class="flex items-center gap-1.5">
              <span class="text-xs font-black w-7 shrink-0" :style="{ color: op.bar }">{{ op.name }}</span>
              <div class="flex-1 h-2.5 rounded-full overflow-hidden" :style="{ backgroundColor: op.bg }">
                <div class="h-full rounded-full" :style="{ width: `${Math.min(100, op.score)}%`, backgroundColor: op.bar }" />
              </div>
              <span class="text-xs font-black text-slate-700 w-7 text-right shrink-0">{{ op.score.toFixed(0) }}</span>
              <span class="text-xs font-bold w-5 shrink-0" :style="{ color: qualityColor(op.score) }">
                {{ qualityLabel(op.score) }}
              </span>
            </div>
          </div>
        </div>

        <!-- SpeedTest + CRM in 2 cols -->
        <div class="grid grid-cols-2 gap-1.5">
          <div v-if="hasSpeedtest" class="rounded-lg border border-slate-100 p-1.5">
            <div class="flex items-center gap-1 mb-1">
              <Zap class="w-3.5 h-3.5 text-sky-400" />
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">SpeedTest</span>
            </div>
            <DataRow label="Download" :value="`${Number(detailData?.download_mbps ?? 0).toFixed(1)} Mbps`" />
            <DataRow label="Latência" :value="`${Number(detailData?.latency_ms ?? 0).toFixed(0)} ms`" />
            <DataRow label="Qualidade" :value="detailData?.quality_label ?? '—'" />
          </div>
          <div v-if="hasCrm" class="rounded-lg border border-slate-100 p-1.5">
            <div class="flex items-center gap-1 mb-1">
              <DollarSign class="w-3.5 h-3.5 text-emerald-400" />
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">CRM Vivo</span>
            </div>
            <DataRow label="ARPU" :value="detailData?.crm?.avg_arpu != null ? `R$ ${Number(detailData.crm.avg_arpu).toFixed(2)}` : '—'" />
            <DataRow label="Device" :value="detailData?.crm?.device_tier ?? '—'" />
            <DataRow label="Plano" :value="detailData?.crm?.dominant_plan_type ?? '—'" />
          </div>
        </div>

        <!-- Perfil da Área -->
        <div class="rounded-lg border border-slate-100 p-1.5">
          <div class="flex items-center gap-1 mb-1">
            <Users class="w-3.5 h-3.5 text-orange-400" />
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil da Área</span>
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
              class="w-3.5 h-3.5 mt-0.5 shrink-0"
              :style="{ color: INSIGHT_STYLES[ins.type].icon }"
            />
            <p class="text-xs leading-snug font-medium" :style="{ color: INSIGHT_STYLES[ins.type].text }">
              {{ ins.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- ══ TAB IA — RESUMO EXECUTIVO ══ -->
      <div v-if="tab === 'ia'" class="flex-1 px-4 pb-3 pt-1 overflow-y-auto">
        <GrowthRecIASummary
          v-if="data"
          :geohash-id="data.geohash_id"
          :period="detailData?.period"
        />
      </div>

      <!-- ══ TAB C2 — INFRAESTRUTURA ══ -->
      <div v-if="tab === 'c2'" class="flex-1 px-4 pb-3 flex flex-col gap-2 overflow-hidden">
        <template v-if="detailData?.camada2">
          <!-- Fibra -->
          <div v-if="detailData.camada2.fibra" class="rounded-lg border overflow-hidden" :style="{ borderColor: fibraClass.color + '30' }">
            <div
              class="flex items-center justify-between px-2 py-1.5 border-b"
              :style="{ backgroundColor: fibraClass.bg, borderColor: fibraClass.color + '20' }"
            >
              <div class="flex items-center gap-1">
                <Wifi class="w-3 h-3" :style="{ color: fibraClass.color }" />
                <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Fibra Óptica</span>
              </div>
              <span class="text-xs font-black px-1.5 py-0.5 rounded-full text-white" :style="{ backgroundColor: fibraClass.color }">
                {{ fibraClass.label }}
              </span>
            </div>
            <div class="px-2 py-1.5 space-y-1">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs text-slate-400">Score de Intervenção</span>
                <span class="text-xs font-black" :style="{ color: fibraClass.color }">{{ detailData.camada2.fibra.score }}/100</span>
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
                <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Rede Móvel</span>
              </div>
              <span class="text-xs font-black px-1.5 py-0.5 rounded-full text-white" :style="{ backgroundColor: movelClass.color }">
                {{ movelClass.label }}
              </span>
            </div>
            <div class="px-2 py-1.5 space-y-1">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs text-slate-400">Score de Intervenção</span>
                <span class="text-xs font-black" :style="{ color: movelClass.color }">{{ detailData.camada2.movel.score }}/100</span>
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
          <p class="text-xs text-slate-400 font-bold">Sem dados de Camada 2</p>
          <p class="text-xs text-slate-300">Infraestrutura não mapeada</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  MapPin, Activity, Zap, DollarSign, Users,
  TrendingUp, AlertTriangle, Layers, Wifi, Signal, Sparkles,
} from "lucide-vue-next";
import { QUADRANT_COLORS, type Quadrant } from "../composables/useFilters";

// ─── Sub-component: DataRow ──────────────────────────────────────────────────
const DataRow = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () =>
      h("div", { class: "flex items-center justify-between py-0.5" }, [
        h("span", { class: "text-[13px] text-slate-400" }, props.label),
        h("span", { class: "text-[13px] font-bold text-slate-700" }, props.value),
      ]);
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeohashSummary {
  geohash_id: string;
  precision: number;
  center_lat: number;
  center_lng: number;
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
  period?: string | null;
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

const tab = ref<"c1" | "c2" | "ia">("c1");

const TABS = [
  { key: "c1" as const, icon: Activity, label: "C1: Comercial" },
  { key: "c2" as const, icon: Layers, label: "C2: Infraestrutura" },
  { key: "ia" as const, icon: Sparkles, label: "Rec. IA" },
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
  AUMENTO_CAPACIDADE: { label: "Aumento de Capacidade", color: "#D97706", bg: "#FFFBEB" },
  EXPANSAO_NOVA_AREA: { label: "Expansão Nova Área", color: "#2563EB", bg: "#EFF6FF" },
  MELHORA_QUALIDADE: { label: "Melhora na Qualidade", color: "#DC2626", bg: "#FEF2F2" },
  SAUDAVEL: { label: "Rede Saudável", color: "#16A34A", bg: "#F0FDF4" },
  OK: { label: "Rede Saudável", color: "#16A34A", bg: "#F0FDF4" },
  SEM_FIBRA: { label: "Sem Fibra", color: "#6B7280", bg: "#F8FAFC" },
};

const MOVEL_CLASS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  MELHORA_QUALIDADE: { label: "Melhora na Qualidade", color: "#DC2626", bg: "#FEF2F2" },
  MELHORA_QUALIDADE_5G: { label: "Melhora na Qualidade 5G", color: "#DC2626", bg: "#FEF2F2" },
  MELHORA_QUALIDADE_4G: { label: "Melhora na Qualidade 4G", color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_COBERTURA: { label: "Expansão de Cobertura", color: "#D97706", bg: "#FFFBEB" },
  EXPANSAO_COBERTURA_5G: { label: "Expansão Cobertura 5G", color: "#7C3AED", bg: "#F5F3FF" },
  EXPANSAO_COBERTURA_4G: { label: "Expansão Cobertura 4G", color: "#2563EB", bg: "#EFF6FF" },
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
  Number(props.data?.vivo_score ?? props.data?.avg_satisfaction_vivo ?? 0) * 10,
);

// ─── Reverse Geocoding ────────────────────────────────────────────────────
const geocodeCache = new Map<string, { name: string; route: string | null }>();
const locationName = ref<string | null>(null);
const locationRoute = ref<string | null>(null);

watch(
  () => props.data?.geohash_id,
  async (id) => {
    if (!id || !props.data) {
      locationName.value = null;
      locationRoute.value = null;
      return;
    }
    const cached = geocodeCache.get(id);
    if (cached) {
      locationName.value = cached.name;
      locationRoute.value = cached.route;
      return;
    }
    if (!window.google?.maps?.Geocoder) {
      locationName.value = null;
      locationRoute.value = null;
      return;
    }
    try {
      const geocoder = new google.maps.Geocoder();
      const { results } = await geocoder.geocode({
        location: { lat: Number(props.data.center_lat), lng: Number(props.data.center_lng) },
      });
      if (results?.length) {
        // Extract neighborhood/sublocality and route
        let neighborhood: string | null = null;
        let route: string | null = null;
        for (const r of results) {
          for (const c of r.address_components) {
            if (!neighborhood && (c.types.includes("sublocality_level_1") || c.types.includes("neighborhood"))) {
              neighborhood = c.long_name;
            }
            if (!route && c.types.includes("route")) {
              route = c.long_name;
            }
          }
          if (neighborhood) break;
        }
        const entry = { name: neighborhood ?? results[0].formatted_address.split(",")[0], route };
        geocodeCache.set(id, entry);
        // Only update if still the same geohash
        if (props.data?.geohash_id === id) {
          locationName.value = entry.name;
          locationRoute.value = entry.route;
        }
      }
    } catch {
      locationName.value = null;
      locationRoute.value = null;
    }
  },
  { immediate: true },
);

const displayTitle = computed(() => {
  const gh = props.data;
  if (!gh) return "";
  const name = locationName.value;
  if (!name) return gh.geohash_id;
  return name;
});

const displaySubtitle = computed(() => {
  const gh = props.data;
  if (!gh) return "";
  const parts: string[] = [];
  // For precision 7 (smaller area), show route if available
  if (gh.precision >= 7 && locationRoute.value) {
    parts.push(locationRoute.value);
  }
  if (gh.city) parts.push(gh.city);
  return parts.join(" · ");
});

const trendArrow = computed(() => {
  const d = props.data?.trend_direction;
  return d === "UP" ? "↑" : d === "DOWN" ? "↓" : "→";
});

const trendColor = computed(() => {
  const d = props.data?.trend_direction;
  return d === "UP" ? "#16A34A" : d === "DOWN" ? "#DC2626" : "#94A3B8";
});

const operatorScores = computed(() => {
  // detailData (getById) has all operator scores; data (list) only has vivo
  const d = props.detailData ?? props.data;
  if (!d) return [];
  return [
    { name: "Vivo", score: Number(d.vivo_score ?? d.avg_satisfaction_vivo ?? 0) * 10, ...CARRIER.Vivo },
    { name: "TIM", score: Number(d.tim_score ?? 0) * 10, ...CARRIER.TIM },
    { name: "Claro", score: Number(d.claro_score ?? 0) * 10, ...CARRIER.Claro },
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
  const share = Number(props.data.share_vivo ?? 0);
  const vivo = vivoScore.value;
  const d = props.detailData ?? props.data;
  const best = Math.max(Number(d.tim_score ?? 0), Number(d.claro_score ?? 0));
  const quadrant = props.data.quadrant_type;

  // Insight alinhado ao quadrante
  if (quadrant === "UPSELL") ins.push({ type: "positive", text: "Share alto + satisfação alta — maximizar receita com upsell premium" });
  else if (quadrant === "GROWTH") ins.push({ type: "warning", text: "Share baixo + satisfação alta — janela de ataque para aquisição" });
  else if (quadrant === "RETENCAO") ins.push({ type: "negative", text: "Share alto + satisfação baixa — risco iminente de churn, ação urgente" });
  else if (quadrant === "GROWTH_RETENCAO") ins.push({ type: "negative", text: "Share baixo + satisfação baixa — dupla frente: aquisição + infraestrutura" });

  // Insights competitivos
  if (best > vivo + 5) ins.push({ type: "negative", text: "Concorrente com satisfação superior" });
  else if (vivo > best + 5) ins.push({ type: "positive", text: "Vivo lidera satisfação no geohash" });

  // Renda
  if (props.detailData?.avg_income && Number(props.detailData.avg_income) > 8000)
    ins.push({ type: "positive", text: "Renda alta — potencial para planos premium" });
  return ins.slice(0, 3);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qualityLabel(score: number): string {
  return score >= 80 ? "Exc" : score >= 70 ? "Bom" : score >= 60 ? "Reg" : "Crít";
}

function qualityColor(score: number): string {
  return score >= 80 ? "#16A34A" : score >= 70 ? "#0EA5E9" : score >= 60 ? "#D97706" : "#DC2626";
}

function formatPop(val?: number | string | null): string {
  if (val == null) return "—";
  return Number(val).toLocaleString("pt-BR");
}

function formatIncome(val?: number | string | null): string {
  if (val == null) return "—";
  return `R$ ${Number(val).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
</script>
