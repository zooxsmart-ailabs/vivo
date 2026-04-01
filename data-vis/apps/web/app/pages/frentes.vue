<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Frentes Estratégicas</h1>
        <p class="text-gray-500 text-sm mt-1">
          4 estratégias com ranking de geohashes por prioridade de ação
        </p>
      </div>
      <div v-if="currentPeriod" class="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
        Período: <strong class="text-slate-700">{{ currentPeriod }}</strong>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#660099] border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Colunas por quadrante -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div
        v-for="q in QUADRANT_ORDER"
        :key="q"
        class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <!-- Header da coluna -->
        <div
          class="px-4 py-3 border-b"
          :style="{ backgroundColor: QUADRANT_COLORS[q].hex + '10', borderColor: QUADRANT_COLORS[q].hex + '30' }"
        >
          <div class="flex items-center gap-2 mb-1">
            <span
              class="w-3 h-3 rounded-sm shrink-0"
              :style="{ backgroundColor: QUADRANT_COLORS[q].hex }"
            />
            <h2 class="text-sm font-bold" :style="{ color: QUADRANT_COLORS[q].hex }">
              {{ QUADRANT_COLORS[q].label }}
            </h2>
          </div>
          <div v-if="summaryByQuadrant[q]" class="flex items-center gap-3 text-xs text-slate-500">
            <span>{{ summaryByQuadrant[q].total }} geohashes</span>
            <span class="text-red-500 font-semibold" v-if="summaryByQuadrant[q].critica_count > 0">
              {{ summaryByQuadrant[q].critica_count }} P1 críticos
            </span>
          </div>
        </div>

        <!-- Ranking items -->
        <div class="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
          <div
            v-for="(item, idx) in rankingByQuadrant[q]"
            :key="item.geohash_id"
            class="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
            @click="selectedGeohash = item"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <span
                class="text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shrink-0"
                :style="{ backgroundColor: QUADRANT_COLORS[q].hex + '20', color: QUADRANT_COLORS[q].hex }"
              >
                {{ Number(idx) + 1 }}
              </span>
              <div class="min-w-0">
                <p class="text-xs font-mono font-bold text-slate-700 truncate">{{ item.geohash_id }}</p>
                <p class="text-[10px] text-slate-400 truncate">{{ item.neighborhood ?? "—" }}, {{ item.city }}</p>
              </div>
              <span
                class="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                :class="PRIORITY_CLASSES[item.priority_label as keyof typeof PRIORITY_CLASSES]"
              >
                {{ PRIORITY_LABELS[item.priority_label as keyof typeof PRIORITY_LABELS] }}
              </span>
            </div>

            <!-- Mini KPIs -->
            <div class="flex gap-3 text-[9px] text-slate-400">
              <div>
                <span class="font-semibold text-slate-600">{{ item.share_vivo.toFixed(0) }}%</span> share
              </div>
              <div>
                <span class="font-semibold text-slate-600">{{ item.avg_satisfaction_vivo.toFixed(1) }}</span> QoE
              </div>
              <div>
                <span
                  :class="item.trend_direction === 'UP' ? 'text-green-600' : item.trend_direction === 'DOWN' ? 'text-red-600' : 'text-slate-400'"
                  class="font-semibold"
                >
                  {{ item.trend_direction === 'UP' ? '↑' : item.trend_direction === 'DOWN' ? '↓' : '→' }}
                  {{ Math.abs(item.trend_delta).toFixed(1) }}pp
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="!rankingByQuadrant[q] || rankingByQuadrant[q].length === 0"
            class="px-4 py-8 text-center text-slate-400 text-xs"
          >
            Nenhum geohash neste quadrante
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de detalhe (simplificado) -->
    <div
      v-if="selectedGeohash"
      class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      @click.self="selectedGeohash = null"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 font-mono">{{ selectedGeohash.geohash_id }}</h3>
          <button @click="selectedGeohash = null" class="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div class="h-72">
          <GeohashCard :data="selectedGeohash" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// QUADRANT_ORDER, QUADRANT_COLORS, useFilters are auto-imported from app/composables

const trpc = useTrpc();
const filters = useFilters();

const selectedGeohash = ref<any>(null);
const currentPeriod = ref<string | null>(null);

const PRIORITY_LABELS = {
  P1_CRITICA: "P1",
  P2_ALTA: "P2",
  P3_MEDIA: "P3",
  P4_BAIXA: "P4",
};

const PRIORITY_CLASSES = {
  P1_CRITICA: "bg-red-100 text-red-700",
  P2_ALTA: "bg-orange-100 text-orange-700",
  P3_MEDIA: "bg-yellow-100 text-yellow-700",
  P4_BAIXA: "bg-green-100 text-green-700",
};

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

const { data: summaryData } = await useAsyncData(
  "frentes-summary",
  () =>
    trpc.frente.summary.query({
      period: filters.period.value ?? undefined,
      state: filters.state.value ?? undefined,
      city: filters.city.value ?? undefined,
    }),
  { watch: [filters.period, filters.state, filters.city] },
);

const rankingByQuadrant = computed(() => rankingData.value ?? {});

const summaryByQuadrant = computed(() => {
  const result: Record<string, any> = {};
  for (const item of summaryData.value ?? []) {
    result[item.quadrant_type] = item;
  }
  return result;
});

watch(rankingData, (data) => {
  if (data) {
    const firstItems = Object.values(data).flat();
    if (firstItems.length > 0) currentPeriod.value = (firstItems[0] as any)?.period ?? null;
  }
});
</script>
