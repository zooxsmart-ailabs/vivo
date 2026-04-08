<script setup lang="ts">
import { ref, computed } from "vue";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Wifi,
  Signal,
  Cpu,
  Layers,
  Activity,
  Zap,
  Users,
  DollarSign,
} from "lucide-vue-next";
import {
  type GeohashData,
  QUADRANT_COLORS,
  type TechCategory,
  BENCHMARKS,
  getPriorityInfo,
  QUADRANT_LABELS,
} from "~/utils/geohashData";

interface Props {
  data: GeohashData | null;
  techFilter?: string;
}
const props = withDefaults(defineProps<Props>(), { techFilter: "TODOS" });

const TECH_META: Record<TechCategory, { label: string; color: string }> = {
  FIBRA: { label: "Fibra", color: "#0EA5E9" },
  MOVEL: { label: "Móvel", color: "#F97316" },
  AMBOS: { label: "F+M", color: "#8B5CF6" },
};

const FIBRA_CLASS: Record<string, { label: string; color: string; bg: string }> = {
  SAUDAVEL:           { label: "Saudável",              color: "#16A34A", bg: "#F0FDF4" },
  OK:                 { label: "Saudável",              color: "#16A34A", bg: "#F0FDF4" },
  MELHORA_QUALIDADE:  { label: "Melhora da Qualidade",  color: "#2563EB", bg: "#EFF6FF" },
  AUMENTO_CAPACIDADE: { label: "Aumento de Capacidade", color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_NOVA_AREA: { label: "Expansão Nova Área",    color: "#D97706", bg: "#FFFBEB" },
  SEM_FIBRA:          { label: "Sem Fibra",              color: "#94A3B8", bg: "#F8FAFC" },
};
const MOVEL_CLASS: Record<string, { label: string; color: string; bg: string }> = {
  SAUDAVEL:           { label: "Saudável",              color: "#16A34A", bg: "#F0FDF4" },
  MELHORA_QUALIDADE:  { label: "Melhora na Qualidade",  color: "#DC2626", bg: "#FEF2F2" },
  EXPANSAO_COBERTURA: { label: "Expansão de Cobertura", color: "#D97706", bg: "#FFFBEB" },
  EXPANSAO_5G:        { label: "Expansão de Cobertura", color: "#D97706", bg: "#FFFBEB" },
  EXPANSAO_4G:        { label: "Expansão de Cobertura", color: "#D97706", bg: "#FFFBEB" },
};
const CARRIER: Record<string, { bar: string; bg: string }> = {
  Vivo: { bar: "#F59E0B", bg: "#FEF3C7" },
  TIM: { bar: "#22C55E", bg: "#DCFCE7" },
  Claro: { bar: "#EF4444", bg: "#FEE2E2" },
};
const INSIGHT_S = {
  positive: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D", icon: "#16A34A" },
  negative: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", icon: "#EF4444" },
  warning: { bg: "#FFFBEB", border: "#FCD34D", text: "#B45309", icon: "#D97706" },
  neutral: { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", icon: "#64748B" },
};

const tab = ref<"c1" | "c2">("c1");

const showFibra = computed(
  () =>
    props.techFilter === "TODOS" ||
    props.techFilter === "FIBRA" ||
    props.techFilter === "AMBOS"
);
const showMovel = computed(
  () =>
    props.techFilter === "TODOS" ||
    props.techFilter === "MOVEL" ||
    props.techFilter === "AMBOS"
);

function buildInsights(d: GeohashData) {
  const ins: Array<{ type: keyof typeof INSIGHT_S; text: string }> = [];
  const share = d.marketShare.percentage;
  const vivo =
    d.satisfactionScores.find((s) => s.name.toUpperCase() === "VIVO")?.score ?? 0;
  const compScores = d.satisfactionScores
    .filter((s) => s.name.toUpperCase() !== "VIVO")
    .map((s) => s.score);
  const best = compScores.length ? Math.max(...compScores) : 0;
  if (share >= 40)
    ins.push({ type: "positive", text: "Share dominante — foco em upsell e retenção" });
  else if (share < 25)
    ins.push({ type: "warning", text: "Share baixo — oportunidade de crescimento" });
  if (vivo >= 7.5)
    ins.push({ type: "positive", text: "Satisfação alta — base estável, baixo churn" });
  else if (vivo < 6.0)
    ins.push({ type: "negative", text: "Satisfação crítica — risco elevado de churn" });
  if (best > vivo + 0.5)
    ins.push({ type: "negative", text: "Concorrente com satisfação superior" });
  else if (vivo > best + 0.5)
    ins.push({ type: "positive", text: "Vivo lidera satisfação no geohash" });
  if (d.demographics?.avgIncome && d.demographics.avgIncome > 8000)
    ins.push({ type: "positive", text: "Renda alta — potencial para planos premium" });
  return ins.slice(0, 2);
}

const view = computed(() => {
  if (!props.data) return null;
  const d = props.data;
  const qColor = QUADRANT_COLORS[d.quadrant];
  const tech = TECH_META[d.technology];
  const ins = buildInsights(d);
  const prio = getPriorityInfo(d);
  const qLabel = QUADRANT_LABELS[d.quadrant];
  const share = d.marketShare.percentage;
  const vivo =
    d.satisfactionScores.find((s) => s.name.toUpperCase() === "VIVO")?.score ?? 0;
  const tim =
    d.satisfactionScores.find((s) => s.name.toUpperCase() === "TIM")?.score ?? 0;
  const claro =
    d.satisfactionScores.find((s) => s.name.toUpperCase() === "CLARO")?.score ?? 0;
  const bench = BENCHMARKS.shareMediaCidadeSP;
  const delta = share - bench;
  const dColor = delta > 0 ? "#16A34A" : delta < 0 ? "#DC2626" : "#94A3B8";
  const DIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  return { d, qColor, tech, ins, prio, qLabel, share, vivo, tim, claro, delta, dColor, DIcon };
});

// Classificação socioeconômica baseada em renda média mensal domiciliar (critério ABEP/IBGE)
const SOCIAL_CLASS: Array<{ max: number; label: string; color: string; bg: string }> = [
  { max: 1412,  label: "Classe E",   color: "#6B7280", bg: "#F3F4F6" },
  { max: 2824,  label: "Classe D",   color: "#D97706", bg: "#FFFBEB" },
  { max: 5648,  label: "Classe C",   color: "#2563EB", bg: "#EFF6FF" },
  { max: 11296, label: "Classe B",   color: "#7C3AED", bg: "#F5F3FF" },
  { max: Infinity, label: "Classe A", color: "#16A34A", bg: "#F0FDF4" },
];

function getSocialClass(income: number | undefined) {
  if (!income) return null;
  return SOCIAL_CLASS.find((c) => income <= c.max) ?? SOCIAL_CLASS[SOCIAL_CLASS.length - 1];
}

function carrierMeta(label: string) {
  return CARRIER[label] ?? { bar: "#818CF8", bg: "#EDE9FE" };
}
function carrierQ(score: number) {
  return score >= 8 ? "Exc" : score >= 7 ? "Bom" : score >= 6 ? "Reg" : "Crít";
}
function carrierQc(score: number) {
  return score >= 8
    ? "#16A34A"
    : score >= 7
      ? "#0EA5E9"
      : score >= 6
        ? "#D97706"
        : "#DC2626";
}
function insightIcon(type: string) {
  return type === "positive"
    ? TrendingUp
    : type === "negative" || type === "warning"
      ? AlertTriangle
      : TrendingDown;
}
</script>

<template>
  <div
    v-if="!data"
    class="flex flex-col items-center justify-center h-full text-center px-4 gap-2"
  >
    <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
      <MapPin class="w-4 h-4 text-purple-300" />
    </div>
    <p class="text-[10px] font-semibold text-slate-400">Nenhum geohash selecionado</p>
    <p class="text-[9px] text-slate-300">Passe o cursor sobre uma célula no mapa.</p>
  </div>

  <div v-else-if="view" class="h-full flex flex-col overflow-hidden">
    <!-- HEADER -->
    <div
      class="shrink-0 px-3 pt-2.5 pb-2 relative"
      :style="{
        background: `linear-gradient(150deg, ${view.qColor.hex}22 0%, ${view.qColor.hex}06 100%)`,
        borderBottom: `1px solid ${view.qColor.hex}20`,
      }"
    >
      <div
        class="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
        :style="{ backgroundColor: view.qColor.hex }"
      />
      <div class="flex items-center gap-1 mb-1.5 pl-1">
        <span
          class="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white"
          :style="{ backgroundColor: view.qColor.hex }"
          >{{ view.qLabel }}</span
        >
        <span
          class="text-[7px] font-bold px-1.5 py-0.5 rounded-full text-white"
          :style="{ backgroundColor: view.tech.color }"
          >{{ view.tech.label }}</span
        >
        <span
          class="ml-auto text-[7px] font-bold px-1.5 py-0.5 rounded-full border"
          :style="{
            color: view.prio.color,
            borderColor: `${view.prio.color}40`,
            backgroundColor: `${view.prio.color}10`,
          }"
          >{{ view.prio.label }}</span
        >
      </div>
      <div class="pl-1 mb-1.5">
        <h3 class="text-[12px] font-black text-slate-800 leading-tight">
          {{ data.neighborhood }}
        </h3>
        <p class="text-[7.5px] text-slate-400">
          {{ data.city }} · <span class="font-mono">{{ data.id }}</span>
        </p>
      </div>
      <div class="grid grid-cols-3 gap-1.5 pl-1">
        <div
          class="rounded-lg p-1.5 text-center"
          :style="{
            backgroundColor: `${view.qColor.hex}12`,
            border: `1px solid ${view.qColor.hex}20`,
          }"
        >
          <div class="text-[6.5px] text-slate-400 font-semibold mb-0.5">Share Vivo</div>
          <div
            class="text-[13px] font-black leading-none"
            :style="{ color: view.qColor.hex }"
          >
            {{ view.share }}%
          </div>
          <div class="flex items-center justify-center gap-0.5 mt-0.5">
            <component :is="view.DIcon" class="w-1.5 h-1.5" :style="{ color: view.dColor }" />
            <span class="text-[6.5px] font-bold" :style="{ color: view.dColor }"
              >{{ view.delta > 0 ? "+" : "" }}{{ view.delta.toFixed(1) }}pp</span
            >
          </div>
        </div>
        <div
          class="rounded-lg p-1.5 text-center"
          style="background-color: #fffbeb; border: 1px solid #fde68a"
        >
          <div class="text-[6.5px] text-slate-400 font-semibold mb-0.5">Sat. Vivo</div>
          <div class="text-[13px] font-black leading-none text-amber-500">
            {{ view.vivo.toFixed(1) }}
          </div>
          <div class="text-[6.5px] text-amber-400 font-semibold mt-0.5">
            {{ view.vivo >= 7.5 ? "Alta" : view.vivo >= 6 ? "Média" : "Crítica" }}
          </div>
        </div>
        <div
          class="rounded-lg p-1.5 text-center"
          :style="{
            backgroundColor: `${view.prio.color}10`,
            border: `1px solid ${view.prio.color}30`,
          }"
        >
          <div class="text-[6.5px] text-slate-400 font-semibold mb-0.5">Prioridade</div>
          <div
            class="text-[13px] font-black leading-none"
            :style="{ color: view.prio.color }"
          >
            {{ view.prio.score }}
          </div>
          <div class="text-[6.5px] font-bold mt-0.5" :style="{ color: view.prio.color }">
            /100
          </div>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="shrink-0 flex gap-0.5 bg-slate-100 mx-3 my-1.5 rounded-lg p-0.5">
      <button
        v-for="t in [
          { key: 'c1', icon: Activity, label: 'CAMADA 1: Comercial' },
          { key: 'c2', icon: Layers, label: 'CAMADA 2: Infraestrutura' },
        ]"
        :key="t.key"
        class="flex-1 flex items-center justify-center gap-0.5 text-[7px] font-bold py-1 rounded-md transition-all"
        :style="
          tab === t.key ? { backgroundColor: '#660099', color: 'white' } : { color: '#64748b' }
        "
        @click="tab = t.key as 'c1' | 'c2'"
      >
        <component :is="t.icon" class="w-2 h-2" />
        {{ t.label }}
      </button>
    </div>

    <!-- C1 -->
    <div
      v-if="tab === 'c1'"
      class="flex-1 px-3 pb-2 flex flex-col gap-1.5 overflow-hidden"
    >
      <div class="rounded-lg border border-slate-100 overflow-hidden">
        <div
          class="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-100"
        >
          <Activity class="w-2.5 h-2.5 text-slate-400" />
          <span
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest"
            >Satisfação Comparativa</span
          >
        </div>
        <div class="px-2 py-1.5 space-y-1">
          <div
            v-for="row in [
              { label: 'Vivo', score: view.vivo },
              { label: 'TIM', score: view.tim },
              { label: 'Claro', score: view.claro },
            ]"
            :key="row.label"
            class="flex items-center gap-1.5"
          >
            <span
              class="text-[8px] font-black w-7 shrink-0"
              :style="{ color: carrierMeta(row.label).bar }"
              >{{ row.label }}</span
            >
            <div
              class="flex-1 h-2.5 rounded-full overflow-hidden"
              :style="{ backgroundColor: carrierMeta(row.label).bg }"
            >
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${Math.min(100, (row.score / 10) * 100)}%`,
                  backgroundColor: carrierMeta(row.label).bar,
                }"
              />
            </div>
            <span
              class="text-[9px] font-black text-slate-700 w-5 text-right shrink-0"
              >{{ row.score.toFixed(1) }}</span
            >
            <span
              class="text-[6.5px] font-bold w-5 shrink-0"
              :style="{ color: carrierQc(row.score) }"
              >{{ carrierQ(row.score) }}</span
            >
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <div v-if="data.speedtest" class="rounded-lg border border-slate-100 p-1.5">
          <div class="flex items-center gap-1 mb-1">
            <Zap class="w-2.5 h-2.5 text-sky-400" />
            <span
              class="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider"
              >SpeedTest</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Download</span>
            <span class="text-[8px] font-bold text-slate-700"
              >{{ data.speedtest.downloadMbps }} Mbps</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Latência</span>
            <span class="text-[8px] font-bold text-slate-700"
              >{{ data.speedtest.latencyMs }} ms</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Qualidade</span>
            <span class="text-[8px] font-bold text-slate-700">{{
              data.speedtest.qualityLabel
            }}</span>
          </div>
        </div>
        <div v-if="data.crm" class="rounded-lg border border-slate-100 p-1.5">
          <div class="flex items-center gap-1 mb-1">
            <DollarSign class="w-2.5 h-2.5 text-emerald-400" />
            <span
              class="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider"
              >CRM Vivo</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">ARPU</span>
            <span class="text-[8px] font-bold text-slate-700"
              >R$ {{ data.crm.arpu }}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Device</span>
            <span class="text-[8px] font-bold text-slate-700">{{
              data.crm.deviceTier
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Plano</span>
            <span class="text-[8px] font-bold text-slate-700">{{
              data.crm.planType
            }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-slate-100 p-1.5">
        <div class="flex items-center gap-1 mb-1">
          <Users class="w-2.5 h-2.5 text-orange-400" />
          <span
            class="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider"
            >Perfil da Área</span
          >
        </div>
        <div class="grid grid-cols-2 gap-x-3">
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Pop. BK</span>
            <span class="text-[8px] font-bold text-slate-700">{{
              data.marketShare.totalPopulation.toLocaleString("pt-BR")
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Renda Méd.</span>
            <span class="text-[8px] font-bold text-slate-700"
              >R$
              {{ data.demographics?.avgIncome?.toLocaleString("pt-BR") ?? "—" }}</span
            >
          </div>
          <div class="flex items-center justify-between col-span-2">
            <span class="text-[7.5px] text-slate-400">Classe Social</span>
            <template v-if="getSocialClass(data.demographics?.avgIncome)">
              <span
                class="text-[7px] font-black px-1.5 py-0.5 rounded-full"
                :style="{
                  color: getSocialClass(data.demographics?.avgIncome)!.color,
                  backgroundColor: getSocialClass(data.demographics?.avgIncome)!.bg,
                }"
              >{{ getSocialClass(data.demographics?.avgIncome)!.label }}</span>
            </template>
            <span v-else class="text-[8px] font-bold text-slate-700">—</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[7.5px] text-slate-400">Densidade</span>
            <span class="text-[8px] font-bold text-slate-700"
              >{{
                data.demographics?.populationDensity?.toLocaleString("pt-BR") ?? "—"
              }}
              h/km²</span
            >
          </div>
        </div>
      </div>

      <div v-if="view.ins.length > 0" class="space-y-1">
        <div
          v-for="(i, idx) in view.ins"
          :key="idx"
          class="rounded-lg border px-2 py-1 flex items-start gap-1.5"
          :style="{
            backgroundColor: INSIGHT_S[i.type].bg,
            borderColor: INSIGHT_S[i.type].border,
          }"
        >
          <component
            :is="insightIcon(i.type)"
            class="w-2.5 h-2.5 mt-0.5 shrink-0"
            :style="{ color: INSIGHT_S[i.type].icon }"
          />
          <p
            class="text-[7.5px] leading-snug font-medium"
            :style="{ color: INSIGHT_S[i.type].text }"
          >
            {{ i.text }}
          </p>
        </div>
      </div>
    </div>

    <!-- C2 -->
    <div
      v-if="tab === 'c2'"
      class="flex-1 px-3 pb-2 flex flex-col gap-1.5 overflow-hidden"
    >
      <template v-if="data.camada2">
        <div
          v-if="techFilter !== 'TODOS'"
          class="flex items-center gap-1 bg-purple-50 border border-purple-100 rounded-lg px-2 py-1"
        >
          <Layers class="w-2.5 h-2.5 text-purple-400" />
          <span class="text-[7px] font-bold text-purple-600">
            {{
              techFilter === "FIBRA"
                ? "Apenas Fibra"
                : techFilter === "MOVEL"
                  ? "Apenas Móvel"
                  : "Fibra + Móvel"
            }}
          </span>
        </div>

        <div
          v-if="showFibra && data.camada2.fibra"
          class="rounded-lg border overflow-hidden"
          :style="{
            borderColor: `${(FIBRA_CLASS[data.camada2.fibra.classification] ?? FIBRA_CLASS.SAUDAVEL).color}30`,
          }"
        >
          <div
            class="flex items-center justify-between px-2 py-1.5 border-b"
            :style="{
              backgroundColor: (FIBRA_CLASS[data.camada2.fibra.classification] ?? FIBRA_CLASS.SAUDAVEL).bg,
              borderColor: `${(FIBRA_CLASS[data.camada2.fibra.classification] ?? FIBRA_CLASS.SAUDAVEL).color}20`,
            }"
          >
            <div class="flex items-center gap-1">
              <Wifi
                class="w-3 h-3"
                :style="{
                  color: (FIBRA_CLASS[data.camada2.fibra.classification] ?? FIBRA_CLASS.SAUDAVEL).color,
                }"
              />
              <span
                class="text-[7px] font-bold text-slate-600 uppercase tracking-wider"
                >Fibra Óptica</span
              >
            </div>
            <span
              class="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white"
              :style="{
                backgroundColor: (FIBRA_CLASS[data.camada2.fibra.classification] ?? FIBRA_CLASS.SAUDAVEL).color,
              }"
              >{{
                (FIBRA_CLASS[data.camada2.fibra.classification] ?? FIBRA_CLASS.SAUDAVEL).label
              }}</span
            >
          </div>

        </div>

        <div
          v-if="showMovel && data.camada2.movel"
          class="rounded-lg border overflow-hidden"
          :style="{
            borderColor: `${(MOVEL_CLASS[data.camada2.movel.classification] ?? MOVEL_CLASS.SAUDAVEL).color}30`,
          }"
        >
          <div
            class="flex items-center justify-between px-2 py-1.5 border-b"
            :style="{
              backgroundColor: (MOVEL_CLASS[data.camada2.movel.classification] ?? MOVEL_CLASS.SAUDAVEL).bg,
              borderColor: `${(MOVEL_CLASS[data.camada2.movel.classification] ?? MOVEL_CLASS.SAUDAVEL).color}20`,
            }"
          >
            <div class="flex items-center gap-1">
              <Signal
                class="w-3 h-3"
                :style="{
                  color: (MOVEL_CLASS[data.camada2.movel.classification] ?? MOVEL_CLASS.SAUDAVEL).color,
                }"
              />
              <span
                class="text-[7px] font-bold text-slate-600 uppercase tracking-wider"
                >Rede Móvel</span
              >
            </div>
            <span
              class="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white"
              :style="{
                backgroundColor: (MOVEL_CLASS[data.camada2.movel.classification] ?? MOVEL_CLASS.SAUDAVEL).color,
              }"
              >{{
                (MOVEL_CLASS[data.camada2.movel.classification] ?? MOVEL_CLASS.SAUDAVEL).label
              }}</span
            >
          </div>

        </div>

        <div
          v-if="showFibra && showMovel && data.camada2.decisaoIntegrada"
          class="rounded-lg bg-purple-50 border border-purple-100 px-2 py-1.5"
        >
          <div class="flex items-center gap-1 mb-0.5">
            <Layers class="w-2.5 h-2.5 text-purple-500" />
            <span
              class="text-[7px] font-bold text-purple-500 uppercase tracking-wider"
              >Decisão Integrada</span
            >
          </div>
          <p class="text-[7.5px] text-purple-800 leading-snug font-medium">
            {{ data.camada2.decisaoIntegrada }}
          </p>
        </div>
      </template>

      <div
        v-else
        class="flex flex-col items-center justify-center flex-1 text-center gap-2"
      >
        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Layers class="w-4 h-4 text-slate-300" />
        </div>
        <p class="text-[9px] text-slate-400 font-bold">Sem dados de Camada 2</p>
        <p class="text-[8px] text-slate-300">Infraestrutura não mapeada</p>
      </div>
    </div>
  </div>
</template>
