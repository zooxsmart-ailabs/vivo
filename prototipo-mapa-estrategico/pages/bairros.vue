<script setup lang="ts">
import { computed, ref } from "vue";
import {
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  Search,
  ChevronRight,
  AlertTriangle,
  Wifi,
  Smartphone,
  Shield,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  DollarSign,
} from "lucide-vue-next";
import {
  GEOHASH_DATA,
  QUADRANT_COLORS,
  QUADRANT_LABELS,
  type GeohashData,
} from "~/utils/geohashData";

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

function getScore(gh: GeohashData, name: string): number {
  return gh.satisfactionScores.find((s) => s.name === name)?.score ?? 0;
}

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
    const totalClients = ghs.reduce((s, g) => s + g.marketShare.activeClients, 0);
    const avgShare = Math.round(
      ghs.reduce((s, g) => s + g.marketShare.percentage, 0) / ghs.length
    );
    const avgVivoScore = parseFloat(
      (ghs.reduce((s, g) => s + getScore(g, "VIVO"), 0) / ghs.length).toFixed(1)
    );
    const avgTimScore = parseFloat(
      (ghs.reduce((s, g) => s + getScore(g, "TIM"), 0) / ghs.length).toFixed(1)
    );
    const avgClaroScore = parseFloat(
      (ghs.reduce((s, g) => s + getScore(g, "CLARO"), 0) / ghs.length).toFixed(1)
    );

    const withIncome = ghs.filter((g) => g.demographics?.avgIncome);
    const avgIncome = withIncome.length
      ? Math.round(
          withIncome.reduce((s, g) => s + (g.demographics!.avgIncome as number), 0) /
            withIncome.length
        )
      : null;

    const withDom = ghs.filter((g: any) => g.shareTrend?.fibra?.totalDomicilios);
    const totalDomicilios = withDom.length
      ? withDom.reduce(
          (s, g: any) => s + (g.shareTrend?.fibra?.totalDomicilios ?? 0),
          0
        )
      : null;

    const trendUp = ghs.filter((g: any) => g.shareTrend?.direction === "UP").length;
    const trendDown = ghs.filter((g: any) => g.shareTrend?.direction === "DOWN").length;
    const trendStable = ghs.filter(
      (g: any) => g.shareTrend?.direction === "STABLE"
    ).length;
    const dominantTrend: "UP" | "DOWN" | "STABLE" =
      trendUp > trendDown && trendUp > trendStable
        ? "UP"
        : trendDown > trendUp && trendDown > trendStable
          ? "DOWN"
          : "STABLE";
    const trendDelta = parseFloat(
      (ghs.reduce((s, g: any) => s + (g.shareTrend?.delta ?? 0), 0) / ghs.length).toFixed(
        1
      )
    );

    const quadrantCounts: Record<string, number> = {};
    for (const gh of ghs) {
      quadrantCounts[gh.quadrant] = (quadrantCounts[gh.quadrant] ?? 0) + 1;
    }
    const dominantQuadrant = Object.entries(quadrantCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    const hasFibra = ghs.some(
      (g) => g.technology === "FIBRA" || g.technology === "AMBOS"
    );
    const hasMovel = ghs.some(
      (g) => g.technology === "MOVEL" || g.technology === "AMBOS"
    );

    result.push({
      name,
      geohashes: ghs,
      totalPopulation,
      totalClients,
      avgShare,
      avgVivoScore,
      avgTimScore,
      avgClaroScore,
      avgIncome,
      totalDomicilios,
      trendUp,
      trendDown,
      trendStable,
      dominantTrend,
      trendDelta,
      quadrantCounts,
      dominantQuadrant,
      hasFibra,
      hasMovel,
    });
  }
  return result.sort((a, b) => b.totalClients - a.totalClients);
}

const BAIRROS_DATA = buildBairroData();

type RankingTab = "GROWTH" | "UPSELL" | "RETENCAO";
const RANKING_TABS: { key: RankingTab; label: string; icon: any }[] = [
  { key: "GROWTH", label: "Growth", icon: Target },
  { key: "UPSELL", label: "Upsell", icon: Zap },
  { key: "RETENCAO", label: "Retenção", icon: Shield },
];

const FIBRA_LABELS: Record<string, string> = {
  AUMENTO_CAPACIDADE: "Aumento de Capacidade",
  EXPANSAO_NOVA_AREA: "Expansão Nova Área",
  SAUDAVEL: "Saudável (Monitorar)",
};
const MOVEL_LABELS: Record<string, string> = {
  MELHORA_QUALIDADE: "Melhora na Qualidade",
  SAUDAVEL: "Rede Saudável",
  EXPANSAO_5G: "Expansão 5G (Premium)",
  EXPANSAO_4G: "Expansão 4G (Mass)",
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

const QUADRANT_LIST = ["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"] as const;

function scoreColor(s: number) {
  return s >= 70 ? "#EF4444" : s >= 40 ? "#F97316" : "#22C55E";
}
function satColor(s: number) {
  return s >= 7 ? "#16a34a" : s >= 6 ? "#d97706" : "#dc2626";
}
function quadrantLabelShort(q: string) {
  return (
    { RETENCAO: "Ret.", UPSELL: "Up.", GROWTH: "Gr.", GROWTH_RETENCAO: "G+R" }[q] ?? q
  );
}
function trendIcon(t: "UP" | "DOWN" | "STABLE") {
  return t === "UP" ? ArrowUpRight : t === "DOWN" ? ArrowDownRight : Minus;
}
function trendColor(t: "UP" | "DOWN" | "STABLE") {
  return t === "UP" ? "#16a34a" : t === "DOWN" ? "#dc2626" : "#64748b";
}
function trendLabel(t: "UP" | "DOWN" | "STABLE") {
  return t === "UP" ? "Crescendo" : t === "DOWN" ? "Caindo" : "Estável";
}
function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

const selectedBairro = ref<BairroData>(BAIRROS_DATA[0]);
const rankingTab = ref<RankingTab>("GROWTH");
const search = ref("");

const rankingList = computed(() => {
  let list = BAIRROS_DATA.filter((b) => (b.quadrantCounts[rankingTab.value] ?? 0) > 0);
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter((b) => b.name.toLowerCase().includes(q));
  }
  return [...list].sort(
    (a, b) =>
      (b.quadrantCounts[rankingTab.value] ?? 0) - (a.quadrantCounts[rankingTab.value] ?? 0)
  );
});

const tabColor = computed(() => QUADRANT_COLORS[rankingTab.value].hex);

// detail computeds
const detail = computed(() => {
  const b = selectedBairro.value;
  if (!b) return null;
  const dominantColor =
    QUADRANT_COLORS[b.dominantQuadrant as keyof typeof QUADRANT_COLORS]?.hex ?? "#660099";
  const bestCompetitor = Math.max(b.avgTimScore, b.avgClaroScore);
  const deltaVsCompetitor = parseFloat((b.avgVivoScore - bestCompetitor).toFixed(1));
  const deltaColor =
    deltaVsCompetitor > 0 ? "#16a34a" : deltaVsCompetitor < 0 ? "#dc2626" : "#64748b";
  const DeltaIcon =
    deltaVsCompetitor > 0 ? TrendingUp : deltaVsCompetitor < 0 ? TrendingDown : Minus;

  // camada 2 aggregations
  const ghsWithC2 = b.geohashes.filter((g) => g.camada2);
  const fibraGhs = ghsWithC2.filter(
    (g) => g.camada2?.fibra.classification !== "EXPANSAO_NOVA_AREA"
  );
  const movelGhs = ghsWithC2.filter(
    (g) => g.camada2?.movel.classification !== "EXPANSAO_4G"
  );
  const avgFibraScore = fibraGhs.length
    ? Math.round(
        fibraGhs.reduce((s, g) => s + (g.camada2?.fibra.score ?? 0), 0) / fibraGhs.length
      )
    : null;
  const avgMovelScore = movelGhs.length
    ? Math.round(
        movelGhs.reduce((s, g) => s + (g.camada2?.movel.score ?? 0), 0) / movelGhs.length
      )
    : null;
  const fibraClassCounts: Record<string, number> = {};
  const movelClassCounts: Record<string, number> = {};
  for (const g of ghsWithC2) {
    if (g.camada2) {
      fibraClassCounts[g.camada2.fibra.classification] =
        (fibraClassCounts[g.camada2.fibra.classification] ?? 0) + 1;
      movelClassCounts[g.camada2.movel.classification] =
        (movelClassCounts[g.camada2.movel.classification] ?? 0) + 1;
    }
  }

  return {
    dominantColor,
    deltaVsCompetitor,
    deltaColor,
    DeltaIcon,
    ghsWithC2,
    fibraGhs,
    movelGhs,
    avgFibraScore,
    avgMovelScore,
    fibraClassCounts,
    movelClassCounts,
  };
});
</script>

<template>
  <div
    class="h-full flex overflow-hidden"
    style="font-family: 'DM Sans', sans-serif; background: #f0f2f8"
  >
    <!-- Sidebar -->
    <aside
      class="w-96 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden"
      style="box-shadow: 2px 0 12px rgba(0, 0, 0, 0.04)"
    >
      <div class="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center justify-between mb-1">
          <h2
            class="text-sm font-bold text-slate-800"
            style="font-family: 'Space Grotesk', sans-serif"
          >
            Ranking por Categoria
          </h2>
          <span
            class="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"
            >{{ BAIRROS_DATA.length }} bairros</span
          >
        </div>
        <p class="text-[11px] text-slate-400 mb-4">
          {{ GEOHASH_DATA.length }} geohashes mapeados em São Paulo
        </p>

        <div class="flex flex-col gap-1.5 mb-4">
          <button
            v-for="t in RANKING_TABS"
            :key="t.key"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
            :style="{
              backgroundColor: rankingTab === t.key ? QUADRANT_COLORS[t.key].hex : 'transparent',
              border: `1.5px solid ${rankingTab === t.key ? QUADRANT_COLORS[t.key].hex : QUADRANT_COLORS[t.key].hex + '30'}`,
            }"
            @click="rankingTab = t.key"
          >
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              :style="{
                backgroundColor:
                  rankingTab === t.key ? 'rgba(255,255,255,0.25)' : QUADRANT_COLORS[t.key].hex + '15',
              }"
            >
              <component
                :is="t.icon"
                class="w-3.5 h-3.5"
                :style="{ color: rankingTab === t.key ? 'white' : QUADRANT_COLORS[t.key].hex }"
              />
            </div>
            <div class="flex-1">
              <p
                class="text-xs font-bold"
                :style="{ color: rankingTab === t.key ? 'white' : QUADRANT_COLORS[t.key].hex }"
              >
                {{ t.label }}
              </p>
              <p
                class="text-[10px]"
                :style="{
                  color: rankingTab === t.key ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                }"
              >
                {{ BAIRROS_DATA.filter((b) => (b.quadrantCounts[t.key] ?? 0) > 0).length }}
                bairros com geohashes
              </p>
            </div>
            <ChevronRight
              v-if="rankingTab === t.key"
              class="w-4 h-4 text-white/60 shrink-0"
            />
          </button>
        </div>

        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
          />
          <input
            v-model="search"
            type="text"
            placeholder="Buscar bairro..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 bg-slate-50 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-if="rankingList.length === 0"
          class="p-8 text-center text-slate-400"
        >
          <MapPin class="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p class="text-xs">Nenhum bairro encontrado</p>
        </div>
        <button
          v-for="(bairro, idx) in rankingList"
          :key="bairro.name"
          class="w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all"
          :style="{
            backgroundColor:
              selectedBairro.name === bairro.name ? tabColor + '0C' : 'transparent',
            borderLeft:
              selectedBairro.name === bairro.name
                ? `3px solid ${tabColor}`
                : '3px solid transparent',
          }"
          @click="selectedBairro = bairro"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              :style="{
                backgroundColor:
                  idx === 0
                    ? tabColor
                    : idx === 1
                      ? tabColor + 'CC'
                      : idx === 2
                        ? tabColor + '99'
                        : tabColor + '18',
                color: idx < 3 ? 'white' : tabColor,
              }"
            >
              {{ idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p
                  class="text-sm font-bold text-slate-800 truncate"
                  style="font-family: 'Space Grotesk', sans-serif"
                >
                  {{ bairro.name }}
                </p>
                <AlertTriangle
                  v-if="rankingTab === 'RETENCAO'"
                  class="w-3 h-3 text-red-500 shrink-0"
                />
              </div>
            </div>
            <div class="text-right shrink-0">
              <p
                class="text-base font-bold"
                :style="{
                  color: tabColor,
                  fontFamily: `'Space Grotesk', sans-serif`,
                }"
              >
                {{ bairro.avgShare }}%
              </p>
              <p class="text-[9px] text-slate-400">share</p>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-9">
            <span
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :style="{ backgroundColor: tabColor + '18', color: tabColor }"
            >
              {{ bairro.quadrantCounts[rankingTab] ?? 0 }} geohashes
            </span>
            <span
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :style="{
                backgroundColor: satColor(bairro.avgVivoScore) + '18',
                color: satColor(bairro.avgVivoScore),
              }"
            >
              ★ {{ bairro.avgVivoScore.toFixed(1) }}
            </span>
            <span
              class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              :style="{
                color: trendColor(bairro.dominantTrend),
                borderColor: trendColor(bairro.dominantTrend) + '40',
                backgroundColor: trendColor(bairro.dominantTrend) + '12',
              }"
            >
              <component :is="trendIcon(bairro.dominantTrend)" class="w-3 h-3" />
              {{ Math.abs(bairro.trendDelta).toFixed(1) }} pp ·
              {{ trendLabel(bairro.dominantTrend) }}
            </span>
          </div>
        </button>
      </div>
    </aside>

    <!-- Main panel -->
    <main class="flex-1 overflow-hidden flex flex-col min-w-0">
      <div
        v-if="selectedBairro && detail"
        class="flex-1 overflow-y-auto p-6"
        style="background: #f0f2f8"
      >
        <!-- Dados Regionais -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-1.5 h-5 rounded-full bg-indigo-500" />
            <p
              class="text-sm font-bold text-slate-800"
              style="font-family: 'Space Grotesk', sans-serif"
            >
              Dados Regionais
            </p>
            <span class="ml-auto text-[10px] text-slate-400">Zoox Smart Data</span>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div
              class="bg-indigo-50/60 rounded-xl p-3 text-center border border-indigo-100"
            >
              <Home class="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
              <p
                class="text-sm font-bold text-slate-800"
                style="font-family: 'Space Grotesk', sans-serif"
              >
                {{ selectedBairro.totalDomicilios ? fmt(selectedBairro.totalDomicilios) : "—" }}
              </p>
              <p class="text-[9px] text-slate-400">Domicílios</p>
            </div>
            <div
              class="bg-indigo-50/60 rounded-xl p-3 text-center border border-indigo-100"
            >
              <Users class="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
              <p
                class="text-sm font-bold text-slate-800"
                style="font-family: 'Space Grotesk', sans-serif"
              >
                {{ selectedBairro.totalPopulation ? fmt(selectedBairro.totalPopulation) : "—" }}
              </p>
              <p class="text-[9px] text-slate-400">População</p>
            </div>
            <div
              class="bg-indigo-50/60 rounded-xl p-3 text-center border border-indigo-100"
            >
              <DollarSign class="w-3.5 h-3.5 mx-auto mb-1 text-indigo-500" />
              <p
                class="text-sm font-bold text-slate-800"
                style="font-family: 'Space Grotesk', sans-serif"
              >
                {{ selectedBairro.avgIncome ? `R$ ${fmt(selectedBairro.avgIncome)}` : "—" }}
              </p>
              <p class="text-[9px] text-slate-400">Renda Média</p>
            </div>
          </div>
        </div>

        <!-- Header bairro -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <MapPin class="w-4 h-4" :style="{ color: detail.dominantColor }" />
                <h2
                  class="text-xl font-bold text-slate-800"
                  style="font-family: 'Space Grotesk', sans-serif"
                >
                  {{ selectedBairro.name }}
                </h2>
                <span class="text-xs text-slate-400">São Paulo, SP</span>
              </div>
              <div class="flex flex-wrap gap-1.5 mt-2">
                <template v-for="(c, q) in selectedBairro.quadrantCounts" :key="q">
                  <span
                    v-if="QUADRANT_COLORS[q as keyof typeof QUADRANT_COLORS]"
                    class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    :style="{
                      backgroundColor: QUADRANT_COLORS[q as keyof typeof QUADRANT_COLORS].hex + '20',
                      color: QUADRANT_COLORS[q as keyof typeof QUADRANT_COLORS].hex,
                      border: `1px solid ${QUADRANT_COLORS[q as keyof typeof QUADRANT_COLORS].hex}40`,
                    }"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full inline-block"
                      :style="{
                        backgroundColor: QUADRANT_COLORS[q as keyof typeof QUADRANT_COLORS].hex,
                      }"
                    />
                    {{ quadrantLabelShort(q as string) }} {{ c }}
                  </span>
                </template>
                <span
                  class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  :style="{
                    color: trendColor(selectedBairro.dominantTrend),
                    borderColor: trendColor(selectedBairro.dominantTrend) + '40',
                    backgroundColor: trendColor(selectedBairro.dominantTrend) + '12',
                  }"
                >
                  <component
                    :is="trendIcon(selectedBairro.dominantTrend)"
                    class="w-3 h-3"
                  />
                  {{ Math.abs(selectedBairro.trendDelta).toFixed(1) }} pp ·
                  {{ trendLabel(selectedBairro.dominantTrend) }}
                </span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p
                class="text-3xl font-bold"
                :style="{
                  color: detail.dominantColor,
                  fontFamily: `'Space Grotesk', sans-serif`,
                }"
              >
                {{ selectedBairro.avgShare }}%
              </p>
              <p class="text-[10px] text-slate-400">Share Médio Vivo</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 mb-4">
            <div
              class="bg-slate-50 rounded-xl p-3 text-center border border-slate-100"
            >
              <Users class="w-3.5 h-3.5 mx-auto mb-1 text-purple-500" />
              <p
                class="text-sm font-bold text-slate-800"
                style="font-family: 'Space Grotesk', sans-serif"
              >
                {{ fmt(selectedBairro.totalClients) }}
              </p>
              <p class="text-[9px] text-slate-400">Clientes Vivo</p>
            </div>
            <div
              class="bg-slate-50 rounded-xl p-3 text-center border border-slate-100"
            >
              <BarChart2
                class="w-3.5 h-3.5 mx-auto mb-1"
                :style="{ color: satColor(selectedBairro.avgVivoScore) }"
              />
              <p
                class="text-sm font-bold text-slate-800"
                style="font-family: 'Space Grotesk', sans-serif"
              >
                {{ selectedBairro.avgVivoScore.toFixed(1) }}
              </p>
              <p class="text-[9px] text-slate-400">Satisfação Vivo</p>
            </div>
            <div
              class="bg-slate-50 rounded-xl p-3 text-center border border-slate-100"
            >
              <component
                :is="detail.DeltaIcon"
                class="w-3.5 h-3.5 mx-auto mb-1"
                :style="{ color: detail.deltaColor }"
              />
              <p
                class="text-sm font-bold"
                :style="{
                  color: detail.deltaColor,
                  fontFamily: `'Space Grotesk', sans-serif`,
                }"
              >
                {{ detail.deltaVsCompetitor > 0 ? "+" : "" }}{{ detail.deltaVsCompetitor }}
              </p>
              <p class="text-[9px] text-slate-400">Delta vs. Concorrente</p>
            </div>
          </div>

          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p
              class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3"
            >
              Satisfação — SpeedTest (0–10)
            </p>
            <div
              v-for="row in [
                {
                  name: 'VIVO',
                  score: selectedBairro.avgVivoScore,
                  color: satColor(selectedBairro.avgVivoScore),
                  highlight: true,
                },
                { name: 'TIM', score: selectedBairro.avgTimScore, color: '#3B82F6' },
                {
                  name: 'CLARO',
                  score: selectedBairro.avgClaroScore,
                  color: '#EF4444',
                },
              ]"
              :key="row.name"
              class="flex items-center gap-2 mb-1.5"
            >
              <span
                class="text-[9px] font-bold w-9 shrink-0"
                :class="row.highlight ? 'text-slate-700' : 'text-slate-400'"
                >{{ row.name }}</span
              >
              <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{ width: `${row.score * 10}%`, backgroundColor: row.color }"
                />
              </div>
              <span
                class="text-[10px] font-bold w-7 text-right"
                :class="row.highlight ? 'text-slate-800' : ''"
                :style="{ color: row.color }"
                >{{ row.score }}</span
              >
            </div>
          </div>
        </div>

        <!-- Camada 1 -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-1.5 h-5 rounded-full bg-purple-500" />
            <p
              class="text-sm font-bold text-slate-800"
              style="font-family: 'Space Grotesk', sans-serif"
            >
              Camada 1 — Distribuição Comercial
            </p>
            <span class="ml-auto text-[10px] text-slate-400"
              >{{ selectedBairro.geohashes.length }} geohashes</span
            >
          </div>
          <div class="grid grid-cols-2 gap-3">
            <template v-for="q in QUADRANT_LIST" :key="q">
              <div
                v-if="(selectedBairro.quadrantCounts[q] ?? 0) > 0"
                class="rounded-xl p-3 border"
                :style="{
                  backgroundColor: QUADRANT_COLORS[q].hex + '08',
                  borderColor: QUADRANT_COLORS[q].hex + '25',
                }"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-2 h-2 rounded-full"
                      :style="{ backgroundColor: QUADRANT_COLORS[q].hex }"
                    />
                    <span
                      class="text-[10px] font-bold"
                      :style="{ color: QUADRANT_COLORS[q].hex }"
                      >{{ QUADRANT_LABELS[q] }}</span
                    >
                  </div>
                  <span
                    class="text-xs font-bold text-slate-700"
                    style="font-family: 'Space Grotesk', sans-serif"
                    >{{ selectedBairro.quadrantCounts[q] }}</span
                  >
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{
                      width: `${Math.round(((selectedBairro.quadrantCounts[q] ?? 0) / selectedBairro.geohashes.length) * 100)}%`,
                      backgroundColor: QUADRANT_COLORS[q].hex,
                    }"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-[9px] text-slate-400"
                    >{{ Math.round(((selectedBairro.quadrantCounts[q] ?? 0) / selectedBairro.geohashes.length) * 100) }}% dos geohashes</span
                  >
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Camada 2 -->
        <div
          v-if="detail.ghsWithC2.length > 0"
          class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          <div class="flex items-center gap-2 mb-4">
            <div class="w-1.5 h-5 rounded-full bg-blue-500" />
            <p
              class="text-sm font-bold text-slate-800"
              style="font-family: 'Space Grotesk', sans-serif"
            >
              Camada 2 — Infraestrutura
            </p>
            <span class="ml-auto text-[10px] text-slate-400"
              >{{ detail.ghsWithC2.length }}/{{ selectedBairro.geohashes.length }} com dados</span
            >
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-if="detail.fibraGhs.length > 0 && detail.avgFibraScore !== null"
              class="rounded-xl border border-blue-100 bg-blue-50/40 p-4"
            >
              <div class="flex items-center gap-2 mb-3">
                <Wifi class="w-4 h-4 text-blue-600" />
                <span class="text-xs font-bold text-blue-700">Fibra Óptica</span>
                <span
                  class="ml-auto text-lg font-bold"
                  :style="{
                    color: scoreColor(detail.avgFibraScore),
                    fontFamily: `'Space Grotesk', sans-serif`,
                  }"
                  >{{ detail.avgFibraScore }}</span
                >
              </div>
              <div class="h-1.5 bg-blue-100 rounded-full overflow-hidden mb-3">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${detail.avgFibraScore}%`,
                    backgroundColor: scoreColor(detail.avgFibraScore),
                  }"
                />
              </div>
              <div class="space-y-1.5">
                <div
                  v-for="(c, k) in detail.fibraClassCounts"
                  :key="k"
                  class="flex items-center justify-between"
                >
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="{ backgroundColor: FIBRA_COLORS[k] ?? '#94A3B8' }"
                    />
                    <span class="text-[9px] text-slate-600">{{
                      FIBRA_LABELS[k] ?? k
                    }}</span>
                  </div>
                  <span
                    class="text-[9px] font-bold"
                    :style="{ color: FIBRA_COLORS[k] ?? '#94A3B8' }"
                    >{{ c }} gh</span
                  >
                </div>
              </div>
            </div>

            <div
              v-if="detail.movelGhs.length > 0 && detail.avgMovelScore !== null"
              class="rounded-xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <div class="flex items-center gap-2 mb-3">
                <Smartphone class="w-4 h-4 text-orange-600" />
                <span class="text-xs font-bold text-orange-700">Rede Móvel</span>
                <span
                  class="ml-auto text-lg font-bold"
                  :style="{
                    color: scoreColor(detail.avgMovelScore),
                    fontFamily: `'Space Grotesk', sans-serif`,
                  }"
                  >{{ detail.avgMovelScore }}</span
                >
              </div>
              <div class="h-1.5 bg-orange-100 rounded-full overflow-hidden mb-3">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${detail.avgMovelScore}%`,
                    backgroundColor: scoreColor(detail.avgMovelScore),
                  }"
                />
              </div>
              <div class="space-y-1.5">
                <div
                  v-for="(c, k) in detail.movelClassCounts"
                  :key="k"
                  class="flex items-center justify-between"
                >
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :style="{ backgroundColor: MOVEL_COLORS[k] ?? '#94A3B8' }"
                    />
                    <span class="text-[9px] text-slate-600">{{
                      MOVEL_LABELS[k] ?? k
                    }}</span>
                  </div>
                  <span
                    class="text-[9px] font-bold"
                    :style="{ color: MOVEL_COLORS[k] ?? '#94A3B8' }"
                    >{{ c }} gh</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex-1 flex items-center justify-center text-slate-400">
        <div class="text-center">
          <MapPin class="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p class="text-sm">Selecione um bairro</p>
        </div>
      </div>
    </main>
  </div>
</template>
