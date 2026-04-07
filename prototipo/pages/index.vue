<script setup lang="ts">
/// <reference types="@types/google.maps" />
import { ref, computed, shallowRef } from "vue";
import {
  SlidersHorizontal,
  Info,
  ChevronRight,
  Wifi,
  Signal,
} from "lucide-vue-next";
import {
  GEOHASH_DATA,
  QUADRANT_COLORS,
  QUADRANT_LABELS,
  QUADRANT_ORDER,
  type GeohashData,
  type Quadrant,
  type TechCategory,
  geohashToPolygon,
} from "~/utils/geohashData";

const TECH_COLORS: Record<TechCategory, { hex: string; label: string }> = {
  FIBRA: { hex: "#0EA5E9", label: "Fibra" },
  MOVEL: { hex: "#F97316", label: "Móvel" },
  AMBOS: { hex: "#8B5CF6", label: "Ambos" },
};

const hoveredGeohash = shallowRef<GeohashData | null>(null);
const pinnedGeohash = shallowRef<GeohashData | null>(null);
let pinnedRef: GeohashData | null = null;
const activeFilters = ref<Set<Quadrant>>(new Set(QUADRANT_ORDER));
const techFilter = ref<TechCategory | "TODOS">("TODOS");
const showDiagnostic = ref(false);
const polygonsMap = new Map<string, google.maps.Polygon>();
let techFilterCurrent: TechCategory | "TODOS" = "TODOS";
let activeFiltersCurrent: Set<Quadrant> = new Set(QUADRANT_ORDER);

const displayedGeohash = computed(() => pinnedGeohash.value ?? hoveredGeohash.value);

function isVisible(
  gh: GeohashData,
  filters: Set<Quadrant>,
  tech: TechCategory | "TODOS"
) {
  if (!filters.has(gh.quadrant)) return false;
  if (tech !== "TODOS" && gh.technology !== tech && gh.technology !== "AMBOS")
    return false;
  return true;
}

function getPolygonColor(gh: GeohashData) {
  return QUADRANT_COLORS[gh.quadrant].hex;
}

function toggleFilter(q: Quadrant) {
  const next = new Set(activeFilters.value);
  if (next.has(q)) next.delete(q);
  else next.add(q);
  activeFilters.value = next;
  activeFiltersCurrent = next;
  polygonsMap.forEach((polygon, id) => {
    const data = GEOHASH_DATA.find((d) => d.id === id);
    if (data) polygon.setVisible(isVisible(data, next, techFilterCurrent));
  });
}

function handleTechFilter(tech: TechCategory | "TODOS") {
  techFilter.value = tech;
  techFilterCurrent = tech;
  polygonsMap.forEach((polygon, id) => {
    const data = GEOHASH_DATA.find((d) => d.id === id);
    if (!data) return;
    const visible = isVisible(data, activeFiltersCurrent, tech);
    polygon.setVisible(visible);
    if (visible) {
      const color = getPolygonColor(data);
      polygon.setOptions({ fillColor: color, strokeColor: color + "CC" });
    }
  });
}

function unpinFromButton() {
  if (!pinnedGeohash.value) return;
  const prev = polygonsMap.get(pinnedGeohash.value.id);
  if (prev) {
    const c = getPolygonColor(pinnedGeohash.value);
    prev.setOptions({
      fillOpacity: 0.4,
      strokeWeight: 1.5,
      strokeColor: c + "CC",
      zIndex: 1,
    });
  }
  pinnedRef = null;
  pinnedGeohash.value = null;
}

function onMapReady(map: google.maps.Map) {
  map.setOptions({
    styles: [
      { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
      { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#dadada" }],
      },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    ],
  });

  GEOHASH_DATA.forEach((ghData) => {
    const path = geohashToPolygon(ghData.id);
    const colors = QUADRANT_COLORS[ghData.quadrant];
    const polygon = new google.maps.Polygon({
      paths: path,
      strokeColor: colors.stroke,
      strokeOpacity: 0.9,
      strokeWeight: 1.5,
      fillColor: colors.hex,
      fillOpacity: 0.4,
      map,
      zIndex: 1,
    });
    polygon.addListener("mouseover", () => {
      polygon.setOptions({
        fillOpacity: 0.72,
        strokeWeight: 2.5,
        strokeColor: "#ffffff",
        zIndex: 10,
      });
      if (!pinnedRef) hoveredGeohash.value = ghData;
    });
    polygon.addListener("mouseout", () => {
      const color = getPolygonColor(ghData);
      if (pinnedRef?.id === ghData.id) return;
      polygon.setOptions({
        fillOpacity: 0.4,
        strokeWeight: 1.5,
        strokeColor: color + "CC",
        zIndex: 1,
      });
      if (!pinnedRef) hoveredGeohash.value = null;
    });
    polygon.addListener("click", () => {
      const currentPin = pinnedRef;
      if (currentPin?.id === ghData.id) {
        pinnedRef = null;
        pinnedGeohash.value = null;
        const color = getPolygonColor(ghData);
        polygon.setOptions({
          fillOpacity: 0.4,
          strokeWeight: 1.5,
          strokeColor: color + "CC",
          zIndex: 1,
        });
      } else {
        if (currentPin) {
          const prevPolygon = polygonsMap.get(currentPin.id);
          if (prevPolygon) {
            const prevColor = getPolygonColor(currentPin);
            prevPolygon.setOptions({
              fillOpacity: 0.4,
              strokeWeight: 1.5,
              strokeColor: prevColor + "CC",
              zIndex: 1,
            });
          }
        }
        pinnedRef = ghData;
        pinnedGeohash.value = ghData;
        polygon.setOptions({
          fillOpacity: 0.8,
          strokeWeight: 3,
          strokeColor: "#ffffff",
          zIndex: 20,
        });
      }
    });
    polygonsMap.set(ghData.id, polygon);
  });
}

const totalGeohashes = GEOHASH_DATA.length;
const riscoCount = GEOHASH_DATA.filter((d) => d.quadrant === "RETENCAO").length;
const visibleCount = computed(
  () =>
    GEOHASH_DATA.filter((d) => isVisible(d, activeFilters.value, techFilter.value))
      .length
);

const DIAGNOSTIC_DESCRIPTIONS: Record<Quadrant, string> = {
  GROWTH: "Share baixo + Satisfação alta — janela de ataque, geração de leads",
  UPSELL: "Share alto + Satisfação alta — maximizar receita, upsell premium",
  GROWTH_RETENCAO:
    "Share baixo + Satisfação baixa — dupla frente: aquisição + infraestrutura",
  RETENCAO: "Share alto + Satisfação baixa — risco iminente de churn, ação urgente",
};

const TECH_TABS: {
  key: TechCategory | "TODOS";
  label: string;
  icon: any;
  color: string;
}[] = [
  { key: "TODOS", label: "Todos", icon: SlidersHorizontal, color: "#64748B" },
  { key: "FIBRA", label: "Fibra", icon: Wifi, color: TECH_COLORS.FIBRA.hex },
  { key: "MOVEL", label: "Móvel", icon: Signal, color: TECH_COLORS.MOVEL.hex },
  { key: "AMBOS", label: "Ambos", icon: null, color: TECH_COLORS.AMBOS.hex },
];

const techCounts = {
  TODOS: totalGeohashes,
  FIBRA: GEOHASH_DATA.filter((d) => d.technology === "FIBRA").length,
  MOVEL: GEOHASH_DATA.filter((d) => d.technology === "MOVEL").length,
  AMBOS: GEOHASH_DATA.filter((d) => d.technology === "AMBOS").length,
};
</script>

<template>
  <div
    class="h-full flex flex-col overflow-hidden"
    style="font-family: 'DM Sans', sans-serif; background: #f0f2f8"
  >
    <div class="flex flex-1 overflow-hidden">
      <!-- Map area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Filter bar -->
        <div
          class="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shrink-0 flex-wrap"
          style="box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <SlidersHorizontal class="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="q in QUADRANT_ORDER"
              :key="q"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border"
              :class="
                activeFilters.has(q)
                  ? 'border-transparent text-white'
                  : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300'
              "
              :style="
                activeFilters.has(q)
                  ? {
                      backgroundColor: QUADRANT_COLORS[q].hex,
                      boxShadow: `0 2px 8px ${QUADRANT_COLORS[q].hex}40`,
                    }
                  : {}
              "
              @click="toggleFilter(q)"
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :style="{
                  backgroundColor: activeFilters.has(q)
                    ? 'rgba(255,255,255,0.8)'
                    : QUADRANT_COLORS[q].hex,
                }"
              />
              {{ QUADRANT_LABELS[q] }}
            </button>
          </div>

          <div class="w-px h-5 bg-slate-200 mx-1 shrink-0" />

          <div class="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              v-for="tab in TECH_TABS"
              :key="tab.key"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150"
              :class="
                techFilter === tab.key
                  ? 'bg-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              "
              :style="techFilter === tab.key ? { color: tab.color } : {}"
              @click="handleTechFilter(tab.key)"
            >
              <component
                v-if="tab.icon"
                :is="tab.icon"
                class="w-3 h-3"
                :style="{ color: techFilter === tab.key ? tab.color : undefined }"
              />
              <span v-else class="text-[9px] font-bold">F+M</span>
              {{ tab.label }}
              <span
                class="text-[9px] font-bold px-1 py-0.5 rounded-full"
                :style="
                  techFilter === tab.key
                    ? { backgroundColor: tab.color + '18', color: tab.color }
                    : { backgroundColor: '#E2E8F0', color: '#94A3B8' }
                "
                >{{ techCounts[tab.key] }}</span
              >
            </button>
          </div>

          <div class="ml-auto flex items-center gap-3 text-xs text-slate-400">
            <span>{{ visibleCount }}/{{ totalGeohashes }} visíveis</span>
            <span
              v-if="riscoCount > 0"
              class="flex items-center gap-1 text-red-500 font-semibold"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {{ riscoCount }} em risco
            </span>
          </div>
        </div>

        <!-- Map -->
        <div class="flex-1 relative overflow-hidden" style="min-height: 0">
          <ClientOnly>
            <MapView
              :initial-center="{ lat: -23.5505, lng: -46.6333 }"
              :initial-zoom="11"
              @ready="onMapReady"
            />
          </ClientOnly>
          <div
            v-if="!hoveredGeohash"
            class="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-slate-100 flex items-center gap-2 text-xs text-slate-500 pointer-events-none"
          >
            <Info class="w-3.5 h-3.5 text-violet-400" />
            Passe o cursor sobre uma célula para ver a ficha estratégica
          </div>
        </div>

        <!-- Legend -->
        <div class="bg-white border-t border-slate-100 px-4 py-2.5 shrink-0">
          <div class="flex items-start gap-8 flex-wrap">
            <div>
              <p
                class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
              >
                Quadrante
              </p>
              <div class="flex flex-wrap gap-x-5 gap-y-1">
                <div
                  v-for="q in QUADRANT_ORDER"
                  :key="q"
                  class="flex items-center gap-1.5"
                >
                  <span
                    class="w-3 h-3 rounded-sm shrink-0"
                    :style="{ backgroundColor: QUADRANT_COLORS[q].hex }"
                  />
                  <span class="text-xs text-slate-600 font-medium">{{
                    QUADRANT_LABELS[q]
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div
        class="w-80 bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-hidden"
        style="box-shadow: -2px 0 12px rgba(0, 0, 0, 0.04)"
      >
        <div class="px-5 py-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded-full border-2 border-violet-300 flex items-center justify-center"
              >
                <ChevronRight class="w-3 h-3 text-[#660099]" />
              </div>
              <h2
                class="text-sm font-bold text-[#660099]"
                style="font-family: 'Space Grotesk', sans-serif"
              >
                {{ displayedGeohash ? "Ficha de Geohash" : "Territórios de Ação" }}
              </h2>
            </div>
            <button
              v-if="pinnedGeohash"
              class="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border transition-colors hover:bg-red-50"
              style="color: #660099; border-color: #66009940; background-color: #66009908"
              title="Clique para desafixar"
              @click="unpinFromButton"
            >
              Fixado
            </button>
          </div>
          <p
            v-if="!displayedGeohash"
            class="text-xs text-slate-500 leading-relaxed ml-8 mt-1"
          >
            Tradução do diagnóstico em
            <strong class="text-slate-700">4 estratégias distintas</strong>, aplicadas
            sobre o mapa real da cidade.
          </p>
          <p
            v-if="!pinnedGeohash && displayedGeohash"
            class="text-[9px] text-slate-400 ml-8 mt-0.5"
          >
            Clique na célula para fixar a ficha
          </p>
        </div>

        <div class="flex-1 overflow-hidden min-h-0">
          <GeohashCard :data="displayedGeohash" :tech-filter="techFilter" />
        </div>

        <div class="border-t border-slate-100 shrink-0">
          <button
            class="w-full px-5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            @click="showDiagnostic = !showDiagnostic"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-5 h-5 rounded-full border-2 border-violet-300 flex items-center justify-center"
              >
                <ChevronRight
                  class="w-2.5 h-2.5 text-[#660099] transition-transform"
                  :class="showDiagnostic ? 'rotate-90' : ''"
                />
              </div>
              <span
                class="text-xs font-bold text-[#660099]"
                style="font-family: 'Space Grotesk', sans-serif"
                >Diagnóstico Bivariado</span
              >
            </div>
          </button>
          <div v-if="showDiagnostic" class="px-5 pb-3">
            <p class="text-xs text-slate-500 leading-relaxed mb-2">
              Cruzamento de
              <strong class="text-slate-700">Share de Mercado (Vivo)</strong> com
              <strong class="text-slate-700">Satisfação do Usuário</strong>.
            </p>
            <div class="space-y-1.5">
              <div
                v-for="q in QUADRANT_ORDER"
                :key="q"
                class="flex items-start gap-2"
              >
                <span
                  class="w-2.5 h-2.5 rounded-sm shrink-0 mt-0.5"
                  :style="{ backgroundColor: QUADRANT_COLORS[q].hex }"
                />
                <span class="text-[10px] text-slate-500">
                  <strong :style="{ color: QUADRANT_COLORS[q].hex }">{{
                    QUADRANT_LABELS[q]
                  }}</strong>
                  — {{ DIAGNOSTIC_DESCRIPTIONS[q] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
