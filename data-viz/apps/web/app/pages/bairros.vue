<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Visão por Bairro</h1>
        <p class="text-gray-500 text-sm mt-1">
          Agregação de geohashes por bairro com KPIs e distribuição de quadrantes
        </p>
      </div>

      <!-- Filtros de localização -->
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="selectedState"
          @change="selectedCity = ''"
          class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#660099]/30"
        >
          <option value="">Todos os estados</option>
          <option v-for="loc in locations" :key="loc.state" :value="loc.state">
            {{ loc.state }}
          </option>
        </select>

        <select
          v-model="selectedCity"
          class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#660099]/30"
          :disabled="!selectedState"
        >
          <option value="">Todas as cidades</option>
          <option
            v-for="c in selectedStateCities"
            :key="c.city"
            :value="c.city"
          >
            {{ c.city }}
          </option>
        </select>

        <!-- Filtro por quadrante -->
        <select
          v-model="selectedQuadrant"
          class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#660099]/30"
        >
          <option value="">Todos os quadrantes</option>
          <option v-for="q in QUADRANT_ORDER" :key="q" :value="q">
            {{ QUADRANT_COLORS[q].label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#660099] border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Tabela de ranking de bairros -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-700">
          {{ bairros.length }} bairros encontrados
        </p>
        <p v-if="currentPeriod" class="text-xs text-slate-400">
          Período: <strong class="text-slate-600">{{ currentPeriod }}</strong>
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-slate-50 text-slate-400 uppercase tracking-wide text-[10px]">
              <th class="px-4 py-2.5 text-left font-semibold">Rank</th>
              <th class="px-4 py-2.5 text-left font-semibold">Bairro / Cidade</th>
              <th class="px-4 py-2.5 text-center font-semibold">Geohashes</th>
              <th class="px-4 py-2.5 text-center font-semibold">Share Médio</th>
              <th class="px-4 py-2.5 text-center font-semibold">QoE Médio</th>
              <th class="px-4 py-2.5 text-center font-semibold">Prioridade</th>
              <th class="px-4 py-2.5 text-center font-semibold">Quadrante Dom.</th>
              <th class="px-4 py-2.5 text-center font-semibold">Distribuição</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr
              v-for="(bairro, idx) in bairros"
              :key="`${bairro.neighborhood}-${bairro.city}`"
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              @click="selectedBairro = bairro"
            >
              <td class="px-4 py-3">
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                  :class="Number(idx) < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'"
                >
                  {{ Number(idx) + 1 }}
                </span>
              </td>
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-800">{{ bairro.neighborhood }}</p>
                <p class="text-slate-400 text-[10px]">{{ bairro.city }} · {{ bairro.state }}</p>
              </td>
              <td class="px-4 py-3 text-center font-mono text-slate-600">{{ bairro.total_geohashes }}</td>
              <td class="px-4 py-3 text-center">
                <span class="font-semibold text-slate-700">{{ Number(bairro.avg_share).toFixed(1) }}%</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="font-semibold"
                  :class="Number(bairro.avg_satisfaction) >= 7 ? 'text-green-600' : Number(bairro.avg_satisfaction) >= 5 ? 'text-yellow-600' : 'text-red-600'"
                >
                  {{ Number(bairro.avg_satisfaction).toFixed(2) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden w-20 mx-auto">
                  <div
                    class="h-full rounded-full"
                    :style="{ width: `${Math.min(Number(bairro.avg_priority_score) * 10, 100)}%`, backgroundColor: '#660099' }"
                  />
                </div>
                <span class="text-[10px] text-slate-500">{{ Number(bairro.avg_priority_score).toFixed(1) }}/10</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="bairro.dominant_quadrant"
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  :style="{
                    backgroundColor: QUADRANT_COLORS[bairro.dominant_quadrant as keyof typeof QUADRANT_COLORS]?.hex + '18',
                    color: QUADRANT_COLORS[bairro.dominant_quadrant as keyof typeof QUADRANT_COLORS]?.hex,
                  }"
                >
                  {{ QUADRANT_COLORS[bairro.dominant_quadrant as keyof typeof QUADRANT_COLORS]?.label ?? bairro.dominant_quadrant }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-0.5 h-4 items-end w-24 mx-auto">
                  <div
                    v-for="q in QUADRANT_ORDER"
                    :key="q"
                    class="flex-1 rounded-t-sm min-h-px"
                    :title="`${QUADRANT_COLORS[q].label}: ${bairro[`geohash_count_${q.toLowerCase()}` as keyof typeof bairro]}`"
                    :style="{
                      backgroundColor: QUADRANT_COLORS[q].hex,
                      height: `${getBarHeight(bairro, q)}px`
                    }"
                  />
                </div>
              </td>
            </tr>

            <tr v-if="bairros.length === 0">
              <td colspan="8" class="px-4 py-10 text-center text-slate-400">
                Nenhum bairro encontrado para os filtros selecionados
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de detalhe do bairro -->
    <div
      v-if="selectedBairro"
      class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      @click.self="selectedBairro = null"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-800 text-lg">{{ selectedBairro.neighborhood }}</h3>
            <p class="text-slate-400 text-sm">{{ selectedBairro.city }} · {{ selectedBairro.state }}</p>
          </div>
          <button @click="selectedBairro = null" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <!-- KPIs do bairro -->
        <div class="grid grid-cols-3 gap-4 p-5 border-b border-slate-100">
          <div class="text-center">
            <p class="text-2xl font-black text-[#660099]">{{ Number(selectedBairro.avg_share).toFixed(0) }}%</p>
            <p class="text-xs text-slate-400 mt-0.5">Share Médio</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-black text-slate-800">{{ Number(selectedBairro.avg_satisfaction).toFixed(2) }}</p>
            <p class="text-xs text-slate-400 mt-0.5">QoE Médio</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-black text-slate-800">{{ selectedBairro.total_geohashes }}</p>
            <p class="text-xs text-slate-400 mt-0.5">Geohashes</p>
          </div>
        </div>

        <!-- Distribuição por quadrante -->
        <div class="p-5">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Distribuição por Quadrante</p>
          <div class="space-y-2">
            <div
              v-for="q in QUADRANT_ORDER"
              :key="q"
              class="flex items-center gap-2"
            >
              <span class="w-20 text-[10px] font-semibold shrink-0" :style="{ color: QUADRANT_COLORS[q].hex }">
                {{ QUADRANT_COLORS[q].label }}
              </span>
              <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${getQuadrantPct(selectedBairro, q)}%`,
                    backgroundColor: QUADRANT_COLORS[q].hex,
                  }"
                />
              </div>
              <span class="text-[10px] text-slate-500 w-12 text-right shrink-0">
                {{ getQuadrantCount(selectedBairro, q) }} ({{ getQuadrantPct(selectedBairro, q).toFixed(0) }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Quadrant } from "../composables/useFilters";

const trpc = useTrpc();
const filters = useFilters();

const selectedState = ref("");
const selectedCity = ref("");
const selectedQuadrant = ref<string>("");
const selectedBairro = ref<any>(null);
const currentPeriod = ref<string | null>(null);

// Localidades disponíveis para filtros
const { data: locationsData } = await useAsyncData("locations", () =>
  trpc.meta.locations.query(),
);
const locations = computed(() => locationsData.value ?? []);

const selectedStateCities = computed(() => {
  if (!selectedState.value) return [];
  return locations.value.find((l) => l.state === selectedState.value)?.cities ?? [];
});

// Dados dos bairros
const { data: bairroData, pending: loading } = await useAsyncData(
  "bairros",
  () =>
    trpc.bairro.list.query({
      period: filters.period.value ?? undefined,
      state: selectedState.value || undefined,
      city: selectedCity.value || undefined,
      quadrant: (selectedQuadrant.value as Quadrant) || undefined,
      limit: 100,
    }),
  {
    watch: [filters.period, selectedState, selectedCity, selectedQuadrant],
  },
);

const bairros = computed(() => bairroData.value?.items ?? []);

watch(bairros, (list) => {
  if (list.length > 0) currentPeriod.value = (list[0] as any)?.period ?? null;
});

function getQuadrantCount(bairro: any, q: string): number {
  return bairro[`geohash_count_${q.toLowerCase()}`] ?? 0;
}

function getQuadrantPct(bairro: any, q: string): number {
  const count = getQuadrantCount(bairro, q);
  const total = bairro.total_geohashes ?? 1;
  return (count / total) * 100;
}

function getBarHeight(bairro: any, q: string): number {
  const pct = getQuadrantPct(bairro, q);
  return Math.max(2, Math.round((pct / 100) * 14));
}
</script>
