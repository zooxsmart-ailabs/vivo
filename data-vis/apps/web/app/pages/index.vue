<template>
  <div class="flex-1 flex flex-col overflow-hidden min-h-0" style="font-family: 'DM Sans', sans-serif; background: #F0F2F8">
    <!-- Layout sem o container padrão do default layout -->
    <FilterBar
      :total-count="geohashes.length"
      :visible-count="visibleCount"
      :retencao-count="retencaoCount"
    />

    <div class="flex flex-1 overflow-hidden min-h-0">
      <!-- Mapa -->
      <div class="flex-1 relative overflow-hidden min-w-0">
        <MapCanvas
          :geohashes="geohashes"
          :visible-geohash-ids="visibleIds"
          @hover="onHover"
          @click="onPin"
          @zoom-change="onZoomChange"
          @viewport-change="onViewportChange"
        />

        <!-- Dica inicial -->
        <Transition name="fade">
          <div
            v-if="!hoveredGeohash && !pinnedGeohash && !loading"
            class="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-slate-100 flex items-center gap-2 text-xs text-slate-500 pointer-events-none"
          >
            <svg class="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Passe o cursor sobre uma célula para ver a ficha estratégica
          </div>
        </Transition>

        <!-- Loading overlay -->
        <div
          v-if="loading"
          class="absolute inset-0 bg-white/60 flex items-center justify-center pointer-events-none"
        >
          <div class="flex flex-col items-center gap-2">
            <div class="w-8 h-8 border-2 border-[#660099] border-t-transparent rounded-full animate-spin" />
            <span class="text-xs text-slate-500">Carregando geohashes…</span>
          </div>
        </div>

        <!-- Legenda -->
        <div class="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2">
          <div class="flex items-start gap-8 flex-wrap">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quadrante</p>
              <div class="flex flex-wrap gap-x-5 gap-y-1">
                <div
                  v-for="q in QUADRANT_ORDER"
                  :key="q"
                  class="flex items-center gap-1.5"
                >
                  <span class="w-3 h-3 rounded-sm shrink-0" :style="{ backgroundColor: QUADRANT_COLORS[q].hex }" />
                  <span class="text-xs text-slate-600 font-medium">{{ QUADRANT_COLORS[q].label }}</span>
                </div>
              </div>
            </div>
            <div v-if="currentPeriod" class="text-xs text-slate-400 self-end">
              Período: <strong class="text-slate-600">{{ currentPeriod }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Painel lateral direito -->
      <div class="w-80 bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-hidden" style="box-shadow: -2px 0 12px rgba(0,0,0,0.04)">
        <div class="px-5 py-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-bold text-[#660099]">
              {{ displayedGeohash ? "Ficha de Geohash" : "Territórios de Ação" }}
            </h2>
            <button
              v-if="pinnedGeohash"
              @click="unpin"
              class="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border hover:bg-red-50 transition-colors"
              style="color: #660099; borderColor: #66009940; backgroundColor: #66009908"
            >
              📌 Fixado
            </button>
          </div>
          <p v-if="!displayedGeohash" class="text-xs text-slate-500 leading-relaxed mt-1">
            Tradução do diagnóstico em <strong class="text-slate-700">4 estratégias distintas</strong>,
            aplicadas sobre o mapa real da cidade para maximizar o ROI.
          </p>
          <p v-else-if="!pinnedGeohash" class="text-[9px] text-slate-400 mt-0.5">
            Clique na célula para fixar a ficha
          </p>
        </div>

        <div class="flex-1 overflow-hidden min-h-0">
          <GeohashCard
            :data="displayedGeohash"
            :detail-data="detailData"
          />
        </div>

        <!-- Diagnóstico bivariado colapsável -->
        <div class="border-t border-slate-100 shrink-0">
          <button
            class="w-full px-5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            @click="showDiagnostic = !showDiagnostic"
          >
            <span class="text-xs font-bold text-[#660099]">Diagnóstico Bivariado</span>
            <span class="text-slate-400 text-xs">{{ showDiagnostic ? "▲" : "▼" }}</span>
          </button>
          <div v-if="showDiagnostic" class="px-5 pb-3">
            <p class="text-xs text-slate-500 leading-relaxed mb-2">
              Cruzamento de <strong class="text-slate-700">Share de Mercado</strong> com
              <strong class="text-slate-700">Satisfação do Usuário</strong>.
            </p>
            <div class="space-y-1.5">
              <div
                v-for="q in QUADRANT_ORDER"
                :key="q"
                class="flex items-start gap-2"
              >
                <span class="w-2.5 h-2.5 rounded-sm shrink-0 mt-0.5" :style="{ backgroundColor: QUADRANT_COLORS[q].hex }" />
                <span class="text-[10px] text-slate-500">
                  <strong :style="{ color: QUADRANT_COLORS[q].hex }">{{ QUADRANT_COLORS[q].label }}</strong>
                  {{ " — " }}{{ QUADRANT_DESCRIPTIONS[q] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  QUADRANT_ORDER,
  QUADRANT_COLORS,
  QUADRANT_DESCRIPTIONS,
} from "../composables/useFilters";

definePageMeta({ layout: "fullscreen" });

const trpc = useTrpc();
const filters = useFilters();
const session = useSession();

// Estado local do mapa
const hoveredGeohash = ref<any>(null);
const pinnedGeohash = ref<any>(null);
const detailData = ref<any>(null);
const showDiagnostic = ref(false);
const currentPeriod = ref<string | null>(null);

const displayedGeohash = computed(() => pinnedGeohash.value ?? hoveredGeohash.value);

// Carrega dados via tRPC
const { data: rawGeohashes, pending: loading } = await useAsyncData(
  "geohashes",
  () =>
    trpc.geohash.list.query({
      precision: filters.precision.value,
      period: filters.period.value ?? undefined,
      state: filters.state.value ?? undefined,
      city: filters.city.value ?? undefined,
      neighborhood: filters.neighborhood.value ?? undefined,
    }),
  {
    watch: [filters.precision, filters.period, filters.state, filters.city, filters.neighborhood],
  },
);

const geohashes = computed(() => rawGeohashes.value ?? []);

// IDs visíveis considerando filtros de quadrante e tech
const visibleIds = computed(() => {
  const ids = new Set<string>();
  for (const gh of geohashes.value) {
    if (filters.isVisible(gh)) ids.add(gh.geohash_id);
  }
  return ids;
});

const visibleCount = computed(() => visibleIds.value.size);
const retencaoCount = computed(
  () => geohashes.value.filter((g: any) => g.quadrant_type === "RETENCAO").length,
);

// Atualiza período exibido
watch(geohashes, (list) => {
  if (list.length > 0) currentPeriod.value = list[0].period ?? null;
});

// Reload quando filtros de quadrante/tech mudam (apenas visibilidade, não rebusca)
watch([filters.activeQuadrants, filters.techFilter], () => {
  session.scheduleFlush();
});

async function loadDetail(geohashId: string) {
  try {
    detailData.value = await trpc.geohash.getById.query({
      geohashId,
      period: filters.period.value ?? undefined,
    });
  } catch {
    detailData.value = null;
  }
}

function onHover(gh: any | null) {
  hoveredGeohash.value = gh;
  if (gh && !pinnedGeohash.value) {
    loadDetail(gh.geohash_id);
  }
}

function onPin(gh: any) {
  if (pinnedGeohash.value?.geohash_id === gh.geohash_id) {
    unpin();
    return;
  }
  pinnedGeohash.value = gh;
  loadDetail(gh.geohash_id);
  session.scheduleFlush();
}

function unpin() {
  pinnedGeohash.value = null;
  detailData.value = null;
}

function onZoomChange(zoom: number) {
  // UC005 — Drill-down: zoom 11-13 = precisão 6; 14+ = precisão 7
  filters.setPrecision(zoom >= 14 ? 7 : 6);
}

function onViewportChange(_vp: any) {
  // O reload é gerenciado pelo watcher de precision acima
}

// Carrega sessão salva na montagem
onMounted(async () => {
  await session.load();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
