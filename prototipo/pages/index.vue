<script setup lang="ts">
/// <reference types="@types/google.maps" />
// pages/index.vue — Mapa Estratégico
// Layout split: esquerda (toolbar + mapa Google Maps) | direita (GeohashPanel)
// Migrado de MapaEstrategico.tsx (React) para Vue/Nuxt 3
import { ref, computed, shallowRef, watch } from "vue";
import ngeohash from "ngeohash";
import { GEOHASH_DATA, QUADRANT_CONFIG, DIAGNOSTICO_BIVARIADO } from "~/utils/goiania";
import type { GeohashEntry, Quadrant } from "~/utils/goiania";

definePageMeta({ layout: "default" });

const GOIANIA_CENTER = { lat: -16.6869, lng: -49.2648 };
const GOIANIA_ZOOM = 11;

function geohashToPolygon(geohashId: string): google.maps.LatLngLiteral[] | null {
  try {
    const [minLat, minLng, maxLat, maxLng] = ngeohash.decode_bbox(geohashId);
    return [
      { lat: maxLat, lng: minLng },
      { lat: maxLat, lng: maxLng },
      { lat: minLat, lng: maxLng },
      { lat: minLat, lng: minLng },
    ];
  } catch {
    return null;
  }
}

const TECH_FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "FIBRA", label: "Fibra" },
  { key: "MOVEL", label: "Móvel" },
];

const TECH_TOOLTIPS: Record<string, string> = {
  ALL: "Exibe todos os geohashes independente da tecnologia disponível.",
  FIBRA: "Fibra óptica — cobertura de banda larga fixa de alta velocidade.",
  MOVEL: "Móvel — cobertura de rede celular 4G/5G.",
  AMBOS: "Fibra + Móvel — geohashes com cobertura combinada de fibra óptica e rede celular 4G/5G.",
};

const QUADRANT_PILLS = [
  { key: "GROWTH" as Quadrant, label: "Growth", activeBg: "#22C55E", activeText: "#fff" },
  { key: "UPSELL" as Quadrant, label: "Upsell", activeBg: "#8B5CF6", activeText: "#fff" },
  { key: "RETENCAO" as Quadrant, label: "Retenção", activeBg: "#EF4444", activeText: "#fff" },
  { key: "GROWTH_RETENCAO" as Quadrant, label: "Growth+Retenção", activeBg: "#F97316", activeText: "#fff" },
];

const selectedGeohash = shallowRef<GeohashEntry | null>(null);
const hoveredGeohash = shallowRef<GeohashEntry | null>(null);
const activeQuadrants = ref<Quadrant[]>(["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"]);
const activeTech = ref<string>("ALL");
const hoveredQuadrant = ref<Quadrant | null>(null);
const hoveredTech = ref<string | null>(null);
const mapLoaded = ref(false);

let mapRef: google.maps.Map | null = null;
const polygonsMap = new Map<string, google.maps.Polygon>();
const markersMap = new Map<string, google.maps.Marker>();

const visibleGeohashes = computed(() => {
  return GEOHASH_DATA.filter((g) => {
    const quadrantOk = activeQuadrants.value.includes(g.quadrant);
    const techOk = activeTech.value === "ALL" || g.technology === activeTech.value;
    return quadrantOk && techOk;
  }).sort((a, b) => b.priorityScore - a.priorityScore);
});

const emRiscoCount = computed(() =>
  visibleGeohashes.value.filter(g => g.quadrant === "RETENCAO" || g.quadrant === "GROWTH_RETENCAO").length
);

function highlightPolygon(id: string) {
  polygonsMap.forEach((poly, pid) => {
    if (pid === id) {
      poly.setOptions({ fillOpacity: 0.55, strokeWeight: 2.5, zIndex: 10 });
    } else {
      poly.setOptions({ fillOpacity: 0.15, strokeWeight: 1, zIndex: 1 });
    }
  });
}

function handleMapReady(map: google.maps.Map) {
  mapRef = map;
  mapLoaded.value = true;

  map.setOptions({
    styles: [
      { elementType: "geometry", stylers: [{ color: "#f5f5f7" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f7" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#6E6E73" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e5e5ea" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f0e6f8" }] },
      { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d4b8e8" }] },
      { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#660099" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#c8d8e8" }] },
      { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8E8E93" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ebebf0" }] },
      { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8E8E93" }] },
      { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d4edda" }] },
      { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e5e5ea" }] },
      { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c7c7cc" }] },
      { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#1C1C1E" }] },
      { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#6E6E73" }] },
    ],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    scrollwheel: true,
    gestureHandling: "greedy",
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    panControl: true,
    panControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  });

  GEOHASH_DATA.forEach((g) => {
    const qc = QUADRANT_CONFIG[g.quadrant];
    const paths = geohashToPolygon(g.id);
    if (!paths) return;

    const polygon = new google.maps.Polygon({
      paths,
      strokeColor: qc.mapColor,
      strokeOpacity: 0.9,
      strokeWeight: 1.5,
      fillColor: qc.mapColor,
      fillOpacity: 0.25,
      map,
      zIndex: 1,
    });

    const marker = new google.maps.Marker({
      position: { lat: g.lat, lng: g.lng },
      map,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
      zIndex: 2,
    });

    polygon.addListener("click", () => {
      selectedGeohash.value = g;
      highlightPolygon(g.id);
    });

    polygon.addListener("mouseover", () => {
      hoveredGeohash.value = g;
      if (!selectedGeohash.value) {
        polygonsMap.forEach((poly, pid) => {
          if (pid === g.id) {
            poly.setOptions({ fillOpacity: 0.45, strokeWeight: 2, zIndex: 5 });
          }
        });
      }
    });

    polygon.addListener("mouseout", () => {
      hoveredGeohash.value = null;
      if (selectedGeohash.value) {
        highlightPolygon(selectedGeohash.value.id);
      } else {
        polygonsMap.forEach((poly) => {
          poly.setOptions({ fillOpacity: 0.25, strokeWeight: 1.5, zIndex: 1 });
        });
      }
    });

    polygonsMap.set(g.id, polygon);
    markersMap.set(g.id, marker);
  });
}

watch([activeQuadrants, activeTech], () => {
  polygonsMap.forEach((polygon, id) => {
    const g = GEOHASH_DATA.find(x => x.id === id);
    if (!g) return;
    const visible =
      activeQuadrants.value.includes(g.quadrant) &&
      (activeTech.value === "ALL" || g.technology === activeTech.value);
    polygon.setVisible(visible);
    markersMap.get(id)?.setVisible(visible);
  });
});

watch(selectedGeohash, (g) => {
  if (g) highlightPolygon(g.id);
});

function toggleQuadrant(q: Quadrant) {
  const prev = activeQuadrants.value;
  if (prev.includes(q)) {
    activeQuadrants.value = prev.filter(x => x !== q);
  } else {
    activeQuadrants.value = [...prev, q];
  }
}

function handleSelectGeohash(g: GeohashEntry) {
  selectedGeohash.value = g;
  highlightPolygon(g.id);
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
    <div style="display:flex;flex:1;overflow:hidden;">
      <!-- Coluna esquerda: toolbar + mapa -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Toolbar -->
        <div style="background:#fff;border-bottom:1px solid #E5E5EA;padding:0;display:flex;align-items:center;height:40px;flex-shrink:0;width:100%;user-select:none;position:relative;z-index:100;overflow:visible;">
          <div style="width:100%;display:flex;align-items:center;gap:0;padding:0 16px;flex-shrink:0;">
            <span style="font-size:12px;font-weight:500;color:#8E8E93;margin-right:10px;flex-shrink:0;display:flex;align-items:center;gap:5px;">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="0" y="0" width="14" height="1.5" rx="0.75" fill="#8E8E93"/>
                <rect x="2" y="4" width="10" height="1.5" rx="0.75" fill="#8E8E93"/>
                <rect x="4" y="8" width="6" height="1.5" rx="0.75" fill="#8E8E93"/>
              </svg>
              Filtrar:
            </span>

            <!-- Pills de Quadrante -->
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <div
                v-for="q in QUADRANT_PILLS"
                :key="q.key"
                style="position:relative;"
                @mouseenter="hoveredQuadrant = q.key"
                @mouseleave="hoveredQuadrant = null"
              >
                <div
                  v-if="hoveredQuadrant === q.key"
                  :style="{
                    position:'absolute', top:'calc(100% + 8px)', left:'50%',
                    transform:'translateX(-50%)', background:'#fff',
                    border:`1px solid ${QUADRANT_CONFIG[q.key].color}55`,
                    borderRadius:'10px', padding:'10px 14px', fontSize:'12px',
                    color:'#3C3C43', lineHeight:'1.5', zIndex:200,
                    boxShadow:'0 6px 24px rgba(0,0,0,0.14)', pointerEvents:'none',
                    width:'240px', whiteSpace:'normal',
                  }"
                >
                  <span :style="{ fontWeight:700, color:QUADRANT_CONFIG[q.key].color, display:'block', fontSize:'12px' }">
                    {{ DIAGNOSTICO_BIVARIADO[q.key].title }}
                  </span>
                  <span style="display:block;color:#6E6E73;font-size:11.5px;margin-top:6px;">
                    {{ DIAGNOSTICO_BIVARIADO[q.key].subtitle }}
                  </span>
                  <div :style="{
                    position:'absolute', bottom:'100%', left:'50%',
                    transform:'translateX(-50%)', width:0, height:0,
                    borderLeft:'5px solid transparent', borderRight:'5px solid transparent',
                    borderBottom:`5px solid ${QUADRANT_CONFIG[q.key].color}55`,
                  }" />
                </div>
                <button
                  @click="toggleQuadrant(q.key)"
                  :style="{
                    display:'flex', alignItems:'center', gap:'5px',
                    padding:'3px 10px 3px 8px', borderRadius:'20px', fontSize:'12px',
                    fontWeight: activeQuadrants.includes(q.key) ? '600' : '400',
                    color: activeQuadrants.includes(q.key) ? q.activeText : '#3C3C43',
                    background: activeQuadrants.includes(q.key) ? q.activeBg : 'transparent',
                    border:'none', cursor:'pointer', transition:'all 0.15s ease',
                    whiteSpace:'nowrap', lineHeight:'1',
                  }"
                >
                  <span :style="{
                    width:'7px', height:'7px', borderRadius:'50%',
                    background: activeQuadrants.includes(q.key) ? 'rgba(255,255,255,0.8)' : QUADRANT_CONFIG[q.key].color,
                    display:'inline-block', flexShrink:0,
                  }" />
                  {{ q.label }}
                </button>
              </div>
            </div>

            <div style="width:1px;height:16px;background:rgba(0,0,0,0.1);margin:0 12px;flex-shrink:0;" />

            <!-- Filtros de Tecnologia -->
            <div style="display:flex;align-items:center;gap:2px;flex-shrink:0;">
              <div
                v-for="t in TECH_FILTERS"
                :key="t.key"
                style="position:relative;"
                @mouseenter="hoveredTech = t.key"
                @mouseleave="hoveredTech = null"
              >
                <div
                  v-if="hoveredTech === t.key"
                  style="position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:10px;padding:8px 12px;font-size:12px;color:#3C3C43;line-height:1.5;z-index:200;box-shadow:0 6px 24px rgba(0,0,0,0.14);pointer-events:none;width:200px;white-space:normal;"
                >
                  {{ TECH_TOOLTIPS[t.key] }}
                  <div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(0,0,0,0.12);" />
                </div>
                <button
                  @click="activeTech = t.key"
                  :style="{
                    display:'flex', alignItems:'center', gap:'4px',
                    padding:'3px 9px', borderRadius:'6px', fontSize:'12px',
                    fontWeight: activeTech === t.key ? '600' : '400',
                    color: activeTech === t.key ? '#1C1C1E' : '#6E6E73',
                    background: activeTech === t.key ? 'rgba(0,0,0,0.06)' : 'transparent',
                    border:'none', cursor:'pointer', transition:'all 0.15s ease',
                    whiteSpace:'nowrap', lineHeight:'1',
                  }"
                >
                  <span v-if="t.key === 'ALL'" style="display:flex;align-items:center;opacity:0.75;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </span>
                  <span v-if="t.key === 'FIBRA'" style="display:flex;align-items:center;opacity:0.75;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                  </span>
                  <span v-if="t.key === 'MOVEL'" style="display:flex;align-items:center;opacity:0.75;">
                    <svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </span>
                  {{ t.label }}
                </button>
              </div>
            </div>

            <div style="flex:1;" />

            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              <span style="font-size:12px;color:#8E8E93;">
                {{ visibleGeohashes.length }}/{{ GEOHASH_DATA.length }} visíveis
              </span>
              <span
                v-if="emRiscoCount > 0"
                style="font-size:12px;font-weight:600;color:#EF4444;display:flex;align-items:center;gap:4px;"
              >
                <span style="width:7px;height:7px;border-radius:50%;background:#EF4444;display:inline-block;" />
                {{ emRiscoCount }} em risco
              </span>
            </div>
          </div>
        </div>

        <!-- Mapa -->
        <div style="flex:1;position:relative;overflow:hidden;">
          <MapView
            :initial-center="GOIANIA_CENTER"
            :initial-zoom="GOIANIA_ZOOM"
            @map-ready="handleMapReady"
            style="width:100%;height:100%;"
          />
          <div
            v-if="!mapLoaded"
            style="position:absolute;inset:0;background:#f5f5f7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10;"
          >
            <div class="spinner" />
            <span style="font-size:12px;color:#8E8E93;font-weight:600;">Carregando mapa...</span>
          </div>
        </div>
      </div>

      <!-- Painel direito -->
      <GeohashPanel
        :geohash="selectedGeohash ?? hoveredGeohash"
        :all-geohashes="GEOHASH_DATA"
        :active-tech="activeTech"
        @select-geohash="handleSelectGeohash"
      />
    </div>
  </div>
</template>

<style scoped>
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102,0,153,0.15);
  border-top: 3px solid #660099;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
