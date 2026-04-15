<template>
  <div class="flex-1 flex flex-col overflow-hidden" style="font-family: 'DM Sans', sans-serif">
    <!-- Dark header -->
    <div
      class="shrink-0 px-6 py-4 border-b border-white/10"
      style="background: linear-gradient(135deg, #1a0a2e 0%, #0f1117 100%)"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            style="background: linear-gradient(135deg, #16A34A, #15803D)"
          >
            <Rocket class="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 class="text-[15px] font-black text-white leading-none">Estratégias Growth</h1>
            <p class="text-[10px] text-slate-400 mt-0.5">Diagnóstico por geohash — 4 pilares de avaliação</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
            <span class="text-[9px] font-bold text-green-400">{{ growthOnlyCount }} Growth</span>
          </div>
          <div class="bg-teal-500/20 border border-teal-500/30 rounded-full px-3 py-1">
            <span class="text-[9px] font-bold text-teal-400">{{ growthRetencaoCount }} Growth+R</span>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <span class="text-[9px] font-bold text-slate-400">{{ diagCount }} com diagnóstico</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div class="w-64 shrink-0 border-r border-white/10 flex flex-col" style="background: #0f1117">
        <!-- Search -->
        <div class="px-3 py-2 border-b border-white/10">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input
              v-model="search"
              type="text"
              placeholder="Buscar geohash..."
              class="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder-slate-500 outline-none focus:border-green-500/50"
            />
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <!-- List -->
        <div v-else class="flex-1 overflow-y-auto">
          <button
            v-for="(geo, idx) in filteredList"
            :key="geo.geohash_id"
            class="w-full text-left px-3 py-2.5 border-b border-white/5 transition-all hover:bg-white/5"
            :style="selectedId === geo.geohash_id
              ? { backgroundColor: '#16A34A18', borderLeft: '2px solid #16A34A' }
              : {}"
            @click="selectGeohash(geo.geohash_id)"
          >
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-[8px] font-black text-slate-500 shrink-0">#{{ Number(idx) + 1 }}</span>
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
                  :class="PRIORITY_CLASSES[geo.priority_label as keyof typeof PRIORITY_CLASSES]"
                >
                  {{ PRIORITY_SHORT[geo.priority_label as keyof typeof PRIORITY_SHORT] }}
                </span>
                <span class="text-[8px] text-slate-400">{{ Number(geo.share_vivo).toFixed(0) }}%</span>
              </div>
            </div>
          </button>

          <div v-if="filteredList.length === 0" class="flex flex-col items-center justify-center py-10 text-center px-4">
            <Search class="w-6 h-6 text-slate-600 mb-2" />
            <p class="text-[10px] text-slate-500">Nenhum geohash encontrado</p>
          </div>
        </div>
      </div>

      <!-- Main panel -->
      <div class="flex-1 overflow-y-auto bg-slate-50">
        <div v-if="displayGeo" class="p-4 space-y-4">
          <!-- Geohash header -->
          <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 border border-green-100">
                  <MapPin class="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 class="text-[15px] font-black text-slate-800 leading-tight">
                    {{ displayGeo.neighborhood ?? displayGeo.geohash_id }}
                  </h2>
                  <p class="text-[10px] text-slate-400">{{ displayGeo.city }} · {{ displayGeo.geohash_id }}</p>
                </div>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                <div class="text-center">
                  <p class="text-[8px] text-slate-400 mb-0.5">Share</p>
                  <p class="text-[14px] font-black text-slate-800">{{ Number(displayGeo.share_vivo).toFixed(0) }}%</p>
                </div>
                <div class="text-center">
                  <p class="text-[8px] text-slate-400 mb-0.5">Satisfação</p>
                  <div class="flex items-center gap-0.5">
                    <Star class="w-3 h-3 text-amber-400" />
                    <p class="text-[14px] font-black text-slate-800">
                      {{ Number(displayGeo.avg_satisfaction_vivo).toFixed(1) }}
                    </p>
                  </div>
                </div>
                <div class="text-center">
                  <p class="text-[8px] text-slate-400 mb-0.5">Prioridade</p>
                  <p class="text-[14px] font-black text-green-600">
                    {{ Number(displayGeo.priority_score).toFixed(1) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading detail -->
          <div v-if="loadingDetail" class="flex justify-center py-12">
            <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>

          <!-- 4 Pilares + Recomendação IA -->
          <div v-else-if="pilares.length > 0 && recomendacao" class="grid grid-cols-3 gap-4">
            <div class="col-span-2 space-y-3">
              <div class="flex items-center gap-2">
                <BarChart3 class="w-4 h-4 text-slate-400" />
                <h3 class="text-[11px] font-black text-slate-600 uppercase tracking-wide">Avaliação dos 4 Pilares</h3>
              </div>
              <GrowthPilarCard v-for="p in pilares" :key="p.id" :pilar="p" />
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Brain class="w-4 h-4 text-slate-400" />
                <h3 class="text-[11px] font-black text-slate-600 uppercase tracking-wide">Recomendação</h3>
              </div>
              <GrowthRecIA :rec="recomendacao" />
            </div>
          </div>

          <!-- Sem dados -->
          <div v-else class="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-100">
            <BarChart3 class="w-10 h-10 text-slate-200 mb-3" />
            <p class="text-[12px] font-bold text-slate-400">Sem dados de diagnóstico</p>
            <p class="text-[10px] text-slate-300 mt-1 max-w-xs">
              Este geohash ainda não possui dados dos 4 pilares preenchidos.
            </p>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center h-full text-center">
          <Rocket class="w-10 h-10 text-slate-200 mb-3" />
          <p class="text-[12px] font-bold text-slate-400">Selecione um geohash</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Rocket, Search, MapPin, Star, BarChart3, Brain,
} from "lucide-vue-next";
import {
  avaliarPercep,
  avaliarConcorrencia,
  avaliarInfra,
  avaliarComportamento,
  gerarRec,
  buildDiagnostico,
  buildCamada2,
  type PilarResult,
  type AIRec,
} from "../composables/useDiagnostico";

definePageMeta({ layout: "fullscreen" });

const trpc = useTrpc();
const filters = useFilters();

const search = ref("");
const selectedId = ref<string | null>(null);
const detailData = ref<any>(null);
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

// Fetch ranking data
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

// Growth geohashes (GROWTH + GROWTH_RETENCAO) sorted by priority score desc
const growthList = computed(() => {
  const data = rankingData.value as any;
  if (!data) return [];
  const g = (data.GROWTH ?? []).map((x: any) => ({ ...x, _quadrant: "GROWTH" }));
  const gr = (data.GROWTH_RETENCAO ?? []).map((x: any) => ({ ...x, _quadrant: "GROWTH_RETENCAO" }));
  return [...g, ...gr].sort((a, b) => Number(b.priority_score) - Number(a.priority_score));
});

const growthOnlyCount = computed(() => growthList.value.filter((g: any) => g._quadrant === "GROWTH").length);
const growthRetencaoCount = computed(() => growthList.value.filter((g: any) => g._quadrant === "GROWTH_RETENCAO").length);
const diagCount = computed(() => growthList.value.length);

const filteredList = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return growthList.value;
  return growthList.value.filter(
    (g: any) =>
      g.geohash_id.toLowerCase().includes(q) ||
      (g.neighborhood ?? "").toLowerCase().includes(q),
  );
});

// Selected geohash (defaults to first)
const displayGeo = computed(() => {
  if (selectedId.value) {
    return growthList.value.find((g: any) => g.geohash_id === selectedId.value) ?? growthList.value[0] ?? null;
  }
  return growthList.value[0] ?? null;
});

// Load detail when selection changes
async function selectGeohash(id: string) {
  selectedId.value = id;
  await loadDetail(id);
}

async function loadDetail(geohashId: string) {
  loadingDetail.value = true;
  try {
    detailData.value = await trpc.geohash.getById.query({
      geohashId,
      period: filters.period.value ?? undefined,
    });
  } catch {
    detailData.value = null;
  } finally {
    loadingDetail.value = false;
  }
}

// Compute pilares + recomendação from detail data
const pilares = computed<PilarResult[]>(() => {
  if (!detailData.value) return [];
  const diag = buildDiagnostico(detailData.value);
  return [
    avaliarPercep(diag),
    avaliarConcorrencia(diag),
    avaliarInfra(buildCamada2(detailData.value)),
    avaliarComportamento(diag),
  ];
});

const recomendacao = computed<AIRec | null>(() => {
  if (!detailData.value || pilares.value.length === 0) return null;
  const diag = buildDiagnostico(detailData.value);
  return gerarRec(pilares.value, diag, buildCamada2(detailData.value));
});

// Auto-load first geohash detail
watch(growthList, async (list) => {
  if (list.length > 0 && !selectedId.value) {
    await loadDetail(list[0].geohash_id);
  }
}, { immediate: true });
</script>
