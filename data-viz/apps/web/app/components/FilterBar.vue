<template>
  <div
    class="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 flex-wrap"
    style="box-shadow: 0 1px 0 rgba(0,0,0,0.04)"
  >
    <!-- Label -->
    <div class="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h18M7 8h10M11 12h2" />
      </svg>
      <span>Filtrar:</span>
    </div>

    <!-- Quadrante toggles -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="q in QUADRANT_ORDER"
        :key="q"
        :data-cy="`quadrant-${q}`"
        @click="toggleQuadrant(q)"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border"
        :class="activeQuadrants.has(q)
          ? 'border-transparent text-white'
          : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300'"
        :style="activeQuadrants.has(q)
          ? { backgroundColor: QUADRANT_COLORS[q].hex, boxShadow: `0 2px 8px ${QUADRANT_COLORS[q].hex}40` }
          : {}"
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          :style="{ backgroundColor: activeQuadrants.has(q) ? 'rgba(255,255,255,0.8)' : QUADRANT_COLORS[q].hex }"
        />
        {{ QUADRANT_COLORS[q].label }}
      </button>
    </div>

    <!-- Divider -->
    <div class="w-px h-5 bg-slate-200 mx-1 shrink-0" />

    <!-- Tech toggle -->
    <div class="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
      <button
        v-for="tab in TECH_TABS"
        :key="tab.key"
        :data-cy="`tech-${tab.key}`"
        @click="setTech(tab.key)"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150"
        :class="techFilter === tab.key ? 'bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'"
        :style="techFilter === tab.key ? { color: tab.color } : {}"
      >
        <span :style="techFilter === tab.key ? { color: tab.color } : {}" v-html="tab.icon" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Counter -->
    <div class="ml-auto flex items-center gap-3 text-xs text-slate-400">
      <span data-cy="counter-visible">{{ visibleCount }}/{{ totalCount }} visíveis</span>
      <span
        v-if="retencaoCount > 0"
        data-cy="counter-risco"
        class="flex items-center gap-1 text-red-500 font-semibold"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {{ retencaoCount }} em risco
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  QUADRANT_ORDER,
  QUADRANT_COLORS,
  type TechFilter,
} from "../composables/useFilters";

const props = defineProps<{
  totalCount: number;
  visibleCount: number;
  retencaoCount: number;
}>();

const { activeQuadrants, techFilter, toggleQuadrant, setTech } = useFilters();

const TECH_TABS: { key: TechFilter; label: string; icon: string; color: string }[] = [
  { key: "TODOS", label: "Todos", icon: "&#9776;", color: "#64748B" },
  { key: "FIBRA", label: "Fibra", icon: "&#8734;", color: "#0EA5E9" },
  { key: "MOVEL", label: "Móvel", icon: "&#9724;", color: "#F97316" },
  { key: "AMBOS", label: "F+M", icon: "&#10022;", color: "#8B5CF6" },
];
</script>
