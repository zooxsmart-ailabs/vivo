<template>
  <div
    class="flex-1 flex flex-col overflow-hidden"
    style="font-family: 'DM Sans', sans-serif"
  >
    <!-- Dark header -->
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
            <h1 class="text-[15px] font-black text-white leading-none">
              Estratégias Growth
            </h1>
            <p class="text-[10px] text-slate-400 mt-0.5">
              Diagnóstico por geohash — 4 pilares de avaliação
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div
            class="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1"
          >
            <span class="text-[9px] font-bold text-green-400">
              {{ growthOnlyCount }} Growth
            </span>
          </div>
          <div
            class="bg-teal-500/20 border border-teal-500/30 rounded-full px-3 py-1"
          >
            <span class="text-[9px] font-bold text-teal-400">
              {{ growthRetencaoCount }} Growth+R
            </span>
          </div>
          <div
            class="bg-white/5 border border-white/10 rounded-full px-3 py-1"
          >
            <span class="text-[9px] font-bold text-slate-400">
              {{ growthList.length }} geohashes
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div
        class="w-64 shrink-0 border-r border-white/10 flex flex-col"
        style="background: #0f1117"
      >
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

        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <div
            class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"
          />
        </div>

        <div v-else class="flex-1 overflow-y-auto">
          <button
            v-for="(geo, idx) in filteredList"
            :key="geo.geohash_id"
            class="w-full text-left px-3 py-2.5 border-b border-white/5 transition-all hover:bg-white/5"
            :style="
              effectiveSelectedId === geo.geohash_id
                ? {
                    backgroundColor: '#16A34A18',
                    borderLeft: '2px solid #16A34A',
                  }
                : {}
            "
            @click="selectGeohash(geo.geohash_id)"
          >
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-[8px] font-black text-slate-500 shrink-0">
                  #{{ Number(idx) + 1 }}
                </span>
                <span class="text-[10px] font-bold text-white truncate">
                  {{ geo.neighborhood ?? geo.geohash_id }}
                </span>
              </div>
              <span class="text-[8px] font-black shrink-0 text-green-400">
                {{ Number(geo.priority_score).toFixed(1) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[8px] text-slate-500">{{ geo.geohash_id }}</span>
              <div class="flex items-center gap-1">
                <span
                  v-if="geo._quadrant === 'GROWTH_RETENCAO'"
                  class="text-[7px] font-bold px-1 py-0.5 rounded bg-teal-500/20 text-teal-400"
                >+R</span>
                <span
                  class="text-[7px] font-bold px-1 py-0.5 rounded"
                  :class="
                    PRIORITY_CLASSES[
                      geo.priority_label as keyof typeof PRIORITY_CLASSES
                    ]
                  "
                >
                  {{
                    PRIORITY_SHORT[
                      geo.priority_label as keyof typeof PRIORITY_SHORT
                    ]
                  }}
                </span>
                <span class="text-[8px] text-slate-400">
                  {{ Number(geo.share_vivo).toFixed(0) }}%
                </span>
              </div>
            </div>
          </button>

          <div
            v-if="filteredList.length === 0"
            class="flex flex-col items-center justify-center py-10 text-center px-4"
          >
            <Search class="w-6 h-6 text-slate-600 mb-2" />
            <p class="text-[10px] text-slate-500">Nenhum geohash encontrado</p>
          </div>
        </div>
      </div>

      <!-- Main panel -->
      <div class="flex-1 overflow-y-auto bg-slate-50">
        <div v-if="displayGeo" class="p-4 space-y-4">
          <!-- Loading detail -->
          <div v-if="loadingDetail" class="flex justify-center py-12">
            <div
              class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"
            />
          </div>

          <template v-else>
            <!-- Header geohash + indicadores (card único) -->
            <div
              class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <!-- Linha 1: nome + badge prioridade -->
              <div
                class="flex items-center justify-between gap-4 px-4 pt-3 pb-2 border-b border-slate-100"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-xl flex items-center justify-center bg-green-50 border border-green-100"
                  >
                    <MapPin class="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h2
                      class="text-[15px] font-black text-slate-800 leading-tight"
                    >
                      {{ displayGeo.neighborhood ?? displayGeo.geohash_id }}
                    </h2>
                    <p class="text-[10px] text-slate-400">
                      {{ displayGeo.city }} · {{ displayGeo.geohash_id }}
                    </p>
                  </div>
                </div>
                <div v-if="recomendacao" class="shrink-0">
                  <div
                    class="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2"
                    :style="{
                      borderColor: PRIO_STYLE[recomendacao.prioTotal].color,
                      background: PRIO_STYLE[recomendacao.prioTotal].bg,
                    }"
                  >
                    <span
                      class="text-[20px] font-black leading-none"
                      :style="{
                        color: PRIO_STYLE[recomendacao.prioTotal].color,
                      }"
                    >{{ recomendacao.scoreTotal.toFixed(1) }}</span>
                    <div class="flex flex-col">
                      <span
                        class="text-[8px] font-black uppercase tracking-widest leading-tight"
                        :style="{
                          color: PRIO_STYLE[recomendacao.prioTotal].color,
                        }"
                      >{{ recomendacao.prioTotal }}</span>
                      <span
                        class="text-[8px] font-black uppercase tracking-widest leading-tight"
                        :style="{
                          color: PRIO_STYLE[recomendacao.prioTotal].color,
                        }"
                      >PRIORIDADE</span>
                      <span class="text-[7px] text-slate-400 leading-tight">
                        #{{ rankIndex }} de {{ growthList.length }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Linha 2: Demográficos -->
              <div
                class="px-4 py-2 border-b border-slate-100"
                style="background: #f8fafc"
              >
                <p
                  class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5"
                >
                  Demográficos
                </p>
                <div class="grid grid-cols-4 gap-3">
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">População</p>
                    <p class="text-[13px] font-black text-slate-800">
                      {{ fmtPop(detail?.populacao_residente) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">Densidade</p>
                    <p class="text-[13px] font-black text-slate-800">
                      {{
                        detail?.crm?.population_density
                          ? Number(
                              detail.crm.population_density,
                            ).toLocaleString("pt-BR") + " hab/km²"
                          : "—"
                      }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">Renda Média</p>
                    <p class="text-[13px] font-black text-slate-800">
                      {{ fmtCurrency(detail?.crm?.avg_income) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[8px] text-slate-400 mb-0.5">Classe Social</p>
                    <span
                      class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full border"
                      :style="{
                        color: socialClass.color,
                        background: socialClass.bg,
                        borderColor: socialClass.border,
                      }"
                    >{{ socialClass.label }}</span>
                  </div>
                </div>
              </div>

              <!-- Linha 3: Móvel + Fibra -->
              <div class="grid grid-cols-2 divide-x divide-slate-100">
                <!-- Móvel -->
                <div class="px-4 py-2">
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <div
                      class="w-4 h-4 rounded-full flex items-center justify-center"
                      style="background: #eff6ff"
                    >
                      <span class="text-[7px] font-black" style="color: #1d4ed8"
                        >M</span
                      >
                    </div>
                    <p
                      class="text-[8px] font-black text-slate-400 uppercase tracking-widest"
                    >
                      Móvel
                    </p>
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <p class="text-[8px] text-slate-400 mb-0.5">Share Vivo</p>
                      <p class="text-[13px] font-black text-slate-800">
                        {{ shareMovel != null ? shareMovel + "%" : "—" }}
                      </p>
                    </div>
                    <div>
                      <p class="text-[8px] text-slate-400 mb-0.5">
                        Plano Principal
                      </p>
                      <p class="text-[11px] font-black text-slate-800">
                        {{ detail?.crm?.plan_type_movel ?? "—" }}
                      </p>
                    </div>
                    <div>
                      <p class="text-[8px] text-slate-400 mb-0.5">ARPU Móvel</p>
                      <p class="text-[13px] font-black text-slate-800">
                        {{ fmtCurrency(detail?.crm?.arpu_movel) }}
                      </p>
                    </div>
                  </div>
                </div>
                <!-- Fibra -->
                <div class="px-4 py-2">
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <div
                      class="w-4 h-4 rounded-full flex items-center justify-center"
                      style="background: #f0fdf4"
                    >
                      <span class="text-[7px] font-black" style="color: #15803d"
                        >F</span
                      >
                    </div>
                    <p
                      class="text-[8px] font-black text-slate-400 uppercase tracking-widest"
                    >
                      Fibra
                    </p>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <p class="text-[8px] text-slate-400 mb-0.5">Share Vivo</p>
                      <template v-if="(shareFibra ?? 0) > 0">
                        <p class="text-[13px] font-black text-slate-800">
                          {{ shareFibra }}%
                        </p>
                      </template>
                      <template v-else>
                        <p class="text-[11px] font-bold text-slate-400">
                          Sem cobertura
                        </p>
                      </template>
                    </div>
                    <div>
                      <p class="text-[8px] text-slate-400 mb-0.5">ARPU Fibra</p>
                      <p class="text-[13px] font-black text-slate-800">
                        {{ fmtCurrency(detail?.crm?.arpu_fibra) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Diagnóstico (4 Pilares + Recomendação) -->
            <div
              v-if="pilares.length > 0 && recomendacao"
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
                <GrowthPilarCard
                  v-for="p in pilares"
                  :key="p.id"
                  :pilar="p"
                />
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <Brain class="w-4 h-4 text-slate-400" />
                  <h3
                    class="text-[11px] font-black text-slate-600 uppercase tracking-wide"
                  >
                    Recomendação
                  </h3>
                </div>
                <GrowthRecIA
                  :rec="recomendacao"
                  :score-movel="scoreMovel"
                  :score-fibra="scoreFibra"
                />
              </div>
            </div>

            <!-- Sem dados -->
            <div
              v-else
              class="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-100"
            >
              <BarChart3 class="w-10 h-10 text-slate-200 mb-3" />
              <p class="text-[12px] font-bold text-slate-400">
                Sem dados de diagnóstico
              </p>
              <p class="text-[10px] text-slate-300 mt-1 max-w-xs">
                Este geohash ainda não possui dados dos 4 pilares preenchidos.
              </p>
            </div>
          </template>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex flex-col items-center justify-center h-full text-center"
        >
          <Rocket class="w-10 h-10 text-slate-200 mb-3" />
          <p class="text-[12px] font-bold text-slate-400">
            Selecione um geohash
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Rocket, Search, MapPin, BarChart3, Brain } from "lucide-vue-next";
import {
  avaliarPercep,
  avaliarConcorrencia,
  avaliarInfra,
  avaliarComportamento,
  gerarRec,
  buildDiagnostico,
  buildCamada2,
  PRIO_STYLE,
  type PilarResult,
  type AIRec,
} from "../composables/useDiagnostico";

definePageMeta({ layout: "default" });

const trpc = useTrpc();
const filters = useFilters();

const search = ref("");
const selectedId = ref<string | null>(null);
const detail = ref<any>(null);
const loadingDetail = ref(false);

const PRIORITY_SHORT: Record<string, string> = {
  P1_CRITICA: "P1",
  P2_ALTA: "P2",
  P3_MEDIA: "P3",
  P4_BAIXA: "P4",
};

const PRIORITY_CLASSES: Record<string, string> = {
  P1_CRITICA: "bg-red-500/20 text-red-400",
  P2_ALTA: "bg-orange-500/20 text-orange-400",
  P3_MEDIA: "bg-yellow-500/20 text-yellow-400",
  P4_BAIXA: "bg-green-500/20 text-green-400",
};

// Ranking
const { data: rankingData, pending: loading } = await useAsyncData(
  "frentes-ranking",
  () =>
    trpc.frente.ranking.query({
      period: filters.period.value ?? undefined,
      state: filters.state.value ?? undefined,
      city: filters.city.value ?? undefined,
    }),
  { watch: [filters.period, filters.state, filters.city] },
);

const growthList = computed(() => {
  const data = rankingData.value as any;
  if (!data) return [];
  const g = (data.GROWTH ?? []).map((x: any) => ({
    ...x,
    _quadrant: "GROWTH",
  }));
  const gr = (data.GROWTH_RETENCAO ?? []).map((x: any) => ({
    ...x,
    _quadrant: "GROWTH_RETENCAO",
  }));
  return [...g, ...gr].sort(
    (a, b) => Number(b.priority_score) - Number(a.priority_score),
  );
});

const growthOnlyCount = computed(
  () => growthList.value.filter((g: any) => g._quadrant === "GROWTH").length,
);
const growthRetencaoCount = computed(
  () =>
    growthList.value.filter((g: any) => g._quadrant === "GROWTH_RETENCAO")
      .length,
);

const filteredList = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return growthList.value;
  return growthList.value.filter(
    (g: any) =>
      g.geohash_id.toLowerCase().includes(q) ||
      (g.neighborhood ?? "").toLowerCase().includes(q),
  );
});

const effectiveSelectedId = computed(
  () => selectedId.value ?? growthList.value[0]?.geohash_id ?? null,
);

const displayGeo = computed(() => {
  if (selectedId.value) {
    return (
      growthList.value.find(
        (g: any) => g.geohash_id === selectedId.value,
      ) ??
      growthList.value[0] ??
      null
    );
  }
  return growthList.value[0] ?? null;
});

const rankIndex = computed(() => {
  const id = effectiveSelectedId.value;
  if (!id) return 0;
  const idx = growthList.value.findIndex((g: any) => g.geohash_id === id);
  return idx >= 0 ? idx + 1 : 0;
});

async function selectGeohash(id: string) {
  selectedId.value = id;
  await loadDetail(id);
}

async function loadDetail(geohashId: string) {
  loadingDetail.value = true;
  try {
    detail.value = await trpc.geohash.getById.query({
      geohashId,
      period: filters.period.value ?? undefined,
    });
  } catch {
    detail.value = null;
  } finally {
    loadingDetail.value = false;
  }
}

// Pilares + Recomendação
const pilares = computed<PilarResult[]>(() => {
  if (!detail.value) return [];
  const diag = buildDiagnostico(detail.value);
  return [
    avaliarPercep(diag),
    avaliarConcorrencia(diag),
    avaliarInfra(buildCamada2(detail.value)),
    avaliarComportamento(diag),
  ];
});

const recomendacao = computed<AIRec | null>(() => {
  if (!detail.value || pilares.value.length === 0) return null;
  const diag = buildDiagnostico(detail.value);
  return gerarRec(pilares.value, diag, buildCamada2(detail.value));
});

// Scores per-tech para o RecIA
const scoreMovel = computed<number>(() => {
  const dg = detail.value?.diagnosticoGrowth;
  return Number(dg?.score_ookla_movel ?? dg?.score_ookla ?? 0);
});
const scoreFibra = computed<number>(() =>
  Number(detail.value?.diagnosticoGrowth?.score_ookla_fibra ?? 0),
);

// Share por tech (vem como string do pg)
const shareMovel = computed<number | null>(() => {
  const v = detail.value?.share_movel;
  return v != null ? Number(Number(v).toFixed(0)) : null;
});
const shareFibra = computed<number | null>(() => {
  const v = detail.value?.share_fibra;
  return v != null ? Number(Number(v).toFixed(0)) : null;
});

// Classe social baseada em renda média (critérios ABEP/IBGE)
const socialClass = computed(() =>
  getSocialClass(
    detail.value?.crm?.avg_income != null
      ? Number(detail.value.crm.avg_income)
      : undefined,
  ),
);

function getSocialClass(income?: number) {
  if (!income)
    return {
      label: "—",
      color: "#94A3B8",
      bg: "#F1F5F9",
      border: "#CBD5E1",
    };
  if (income > 11296)
    return {
      label: "Classe A",
      color: "#15803D",
      bg: "#F0FDF4",
      border: "#BBF7D0",
    };
  if (income > 5648)
    return {
      label: "Classe B",
      color: "#6D28D9",
      bg: "#F5F3FF",
      border: "#DDD6FE",
    };
  if (income > 2824)
    return {
      label: "Classe C",
      color: "#1D4ED8",
      bg: "#EFF6FF",
      border: "#BFDBFE",
    };
  if (income > 1412)
    return {
      label: "Classe D",
      color: "#B45309",
      bg: "#FFFBEB",
      border: "#FDE68A",
    };
  return {
    label: "Classe E",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
  };
}

function fmtCurrency(v: unknown): string {
  const n = v != null ? Number(v) : 0;
  if (!n) return "—";
  return `R$ ${n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtPop(v: unknown): string {
  const n = v != null ? Number(v) : 0;
  if (!n) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// Auto-load do primeiro detail
watch(
  growthList,
  async (list) => {
    if (list.length > 0 && !selectedId.value) {
      await loadDetail(list[0].geohash_id);
    }
  },
  { immediate: true },
);
</script>
