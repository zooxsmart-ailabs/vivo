<script setup lang="ts">
/// <reference types="@types/google.maps" />
// pages/index.vue — Mapa Estratégico (Vivo × Zoox GeoIntelligence)
// UI migrada do protótipo, conectada ao backend via tRPC:
//   - useViewportLoader → polígonos do mapa (vw_geohash_summary)
//   - useHoverDetail   → detalhe do geohash em foco (geohash.getById)
//   - useFilters       → estado global de quadrante/tech/período
//   - useSession       → persistência dos filtros
import { ref, computed, watch } from "vue";
import ngeohash from "ngeohash";
import {
  QUADRANT_CONFIG,
  DIAGNOSTICO_BIVARIADO,
  type Quadrant,
} from "../utils/goiania";
import { adaptForMap, adaptForPanel, type MapGeohash } from "../utils/geohashAdapter";

definePageMeta({ layout: "default" });

const GOIANIA_CENTER = { lat: -16.6869, lng: -49.2648 };
const GOIANIA_ZOOM = 11;

const filters = useFilters();
const session = useSession();
const { allGeohashes: rawGeohashes, loading, onBoundsChanged } = useViewportLoader();
const { detailData, requestDetail, loadDetailImmediate, clear: clearDetail } =
  useHoverDetail();

const geohashes = computed<MapGeohash[]>(() => adaptForMap(rawGeohashes.value as any));

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
  { key: "TODOS", label: "Todos" },
  { key: "FIBRA", label: "Fibra" },
  { key: "MOVEL", label: "Móvel" },
] as const;

const TECH_TOOLTIPS: Record<string, string> = {
  TODOS: "Exibe todos os geohashes independente da tecnologia disponível.",
  FIBRA: "Fibra óptica — cobertura de banda larga fixa de alta velocidade.",
  MOVEL: "Móvel — cobertura de rede celular 4G/5G.",
  AMBOS:
    "Fibra + Móvel — geohashes com cobertura combinada de fibra óptica e rede celular 4G/5G.",
};

const QUADRANT_PILLS: { key: Quadrant; label: string; activeBg: string; activeText: string }[] = [
  { key: "GROWTH", label: "Growth", activeBg: "#22C55E", activeText: "#fff" },
  { key: "UPSELL", label: "Upsell", activeBg: "#8B5CF6", activeText: "#fff" },
  { key: "RETENCAO", label: "Retenção", activeBg: "#EF4444", activeText: "#fff" },
  { key: "GROWTH_RETENCAO", label: "Growth+Retenção", activeBg: "#F97316", activeText: "#fff" },
];

const selectedGeohashId = ref<string | null>(null);
const hoveredGeohashId = ref<string | null>(null);
const hoveredQuadrant = ref<Quadrant | null>(null);
const hoveredTech = ref<string | null>(null);
const mapLoaded = ref(false);

let mapRef: google.maps.Map | null = null;
const polygonsMap = new Map<string, google.maps.Polygon>();

// Geohash atualmente exibido no painel — vem do detail (getById) já adaptado.
const panelGeohash = computed(() => {
  const d = detailData.value;
  if (!d) return null;
  try {
    return adaptForPanel(d as any);
  } catch (err) {
    console.error("[index] adaptForPanel falhou:", err);
    return null;
  }
});

const visibleGeohashes = computed(() =>
  geohashes.value
    .filter((g) => {
      const quadrantOk = filters.activeQuadrants.value.has(g.quadrant);
      const techOk =
        filters.techFilter.value === "TODOS" ||
        g.technology === filters.techFilter.value ||
        g.technology === "AMBOS";
      return quadrantOk && techOk;
    })
    .sort((a, b) => b.priorityScore - a.priorityScore),
);

const emRiscoCount = computed(
  () =>
    visibleGeohashes.value.filter(
      (g) => g.quadrant === "RETENCAO" || g.quadrant === "GROWTH_RETENCAO",
    ).length,
);

const currentPeriod = computed(() => {
  const list = rawGeohashes.value as any[];
  return list.length > 0 ? (list[0].period as string | null) : null;
});

function highlightPolygon(id: string | null) {
  polygonsMap.forEach((poly, pid) => {
    if (id && pid === id) {
      poly.setOptions({ fillOpacity: 0.55, strokeWeight: 2.5, zIndex: 10 });
    } else {
      poly.setOptions({ fillOpacity: 0.25, strokeWeight: 1.5, zIndex: 1 });
    }
  });
}

function applyVisibility() {
  const ids = new Set(visibleGeohashes.value.map((g) => g.id));
  polygonsMap.forEach((poly, id) => poly.setVisible(ids.has(id)));
}

function disposePolygons() {
  polygonsMap.forEach((p) => p.setMap(null));
  polygonsMap.clear();
}

function attachPolygon(g: MapGeohash) {
  if (!mapRef) return;
  if (polygonsMap.has(g.id)) return;
  const cfg = QUADRANT_CONFIG[g.quadrant];
  const paths = geohashToPolygon(g.id);
  if (!paths) return;

  const polygon = new google.maps.Polygon({
    paths,
    strokeColor: g.hasVivoData ? cfg.mapColor : "#94A3B8",
    strokeOpacity: 0.9,
    strokeWeight: 1.5,
    fillColor: g.hasVivoData ? cfg.mapColor : "#94A3B8",
    fillOpacity: g.hasVivoData ? 0.25 : 0.15,
    map: mapRef,
    zIndex: g.hasVivoData ? 1 : 0,
  });

  polygon.addListener("click", () => {
    if (selectedGeohashId.value === g.id) {
      selectedGeohashId.value = null;
      clearDetail();
      highlightPolygon(null);
      return;
    }
    selectedGeohashId.value = g.id;
    loadDetailImmediate(g.id, filters.period.value ?? undefined);
    highlightPolygon(g.id);
    session.scheduleFlush();
  });

  polygon.addListener("mouseover", () => {
    hoveredGeohashId.value = g.id;
    if (!selectedGeohashId.value) {
      requestDetail(g.id, filters.period.value ?? undefined);
      polygon.setOptions({ fillOpacity: 0.45, strokeWeight: 2, zIndex: 5 });
    }
  });

  polygon.addListener("mouseout", () => {
    if (hoveredGeohashId.value === g.id) hoveredGeohashId.value = null;
    if (selectedGeohashId.value) {
      highlightPolygon(selectedGeohashId.value);
    } else {
      polygon.setOptions({ fillOpacity: 0.25, strokeWeight: 1.5, zIndex: 1 });
      clearDetail();
    }
  });

  polygonsMap.set(g.id, polygon);
}

function syncPolygons() {
  if (!mapRef) return;
  const incoming = new Set(geohashes.value.map((g) => g.id));
  // Remove polígonos que sumiram
  for (const [id, poly] of polygonsMap) {
    if (!incoming.has(id)) {
      poly.setMap(null);
      polygonsMap.delete(id);
    }
  }
  // Adiciona novos
  for (const g of geohashes.value) attachPolygon(g);
  applyVisibility();
}

function emitBoundsFromMap() {
  if (!mapRef) return;
  const b = mapRef.getBounds();
  if (!b) return;
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  onBoundsChanged({
    swLat: sw.lat(),
    swLng: sw.lng(),
    neLat: ne.lat(),
    neLng: ne.lng(),
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
  });

  map.addListener("idle", emitBoundsFromMap);

  // Click no mapa (fora dos polígonos): tenta resolver geohash pela posição.
  map.addListener("click", (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const hash = ngeohash.encode(lat, lng, filters.precision.value);
    const found = geohashes.value.find((g) => g.id === hash);
    if (found) {
      selectedGeohashId.value = found.id;
      loadDetailImmediate(found.id, filters.period.value ?? undefined);
      highlightPolygon(found.id);
    }
  });

  // Já cria polígonos para o que estiver carregado
  syncPolygons();
  emitBoundsFromMap();
}

watch(geohashes, () => syncPolygons());
watch([filters.activeQuadrants, filters.techFilter], () => {
  applyVisibility();
  session.scheduleFlush();
});
watch([filters.precision, filters.period, filters.state, filters.city, filters.neighborhood], () => {
  // useViewportLoader já dá reset; basta limpar polígonos para refletir.
  disposePolygons();
});

watch(selectedGeohashId, (id) => highlightPolygon(id));

function toggleQuadrant(q: Quadrant) {
  filters.toggleQuadrant(q);
}

onMounted(async () => {
  await session.load();
});

onUnmounted(() => {
  disposePolygons();
});
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
    <div style="display:flex;flex:1;overflow:hidden;">
      <!-- Coluna esquerda: toolbar + mapa -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">
        <!-- Toolbar -->
        <div
          style="background:#fff;border-bottom:1px solid #E5E5EA;padding:0;display:flex;align-items:center;height:40px;flex-shrink:0;width:100%;user-select:none;position:relative;z-index:100;overflow:visible;"
        >
          <div
            style="width:100%;display:flex;align-items:center;gap:0;padding:0 16px;flex-shrink:0;"
          >
            <span
              style="font-size:12px;font-weight:500;color:#8E8E93;margin-right:10px;flex-shrink:0;display:flex;align-items:center;gap:5px;"
            >
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="0" y="0" width="14" height="1.5" rx="0.75" fill="#8E8E93" />
                <rect x="2" y="4" width="10" height="1.5" rx="0.75" fill="#8E8E93" />
                <rect x="4" y="8" width="6" height="1.5" rx="0.75" fill="#8E8E93" />
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
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#fff',
                    border: `1px solid ${QUADRANT_CONFIG[q.key].color}55`,
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#3C3C43',
                    lineHeight: '1.5',
                    zIndex: 200,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
                    pointerEvents: 'none',
                    width: '240px',
                    whiteSpace: 'normal',
                  }"
                >
                  <span
                    :style="{
                      fontWeight: 700,
                      color: QUADRANT_CONFIG[q.key].color,
                      display: 'block',
                      fontSize: '12px',
                    }"
                  >
                    {{ DIAGNOSTICO_BIVARIADO[q.key].title }}
                  </span>
                  <span style="display:block;color:#6E6E73;font-size:11.5px;margin-top:6px;">
                    {{ DIAGNOSTICO_BIVARIADO[q.key].subtitle }}
                  </span>
                  <div
                    :style="{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderBottom: `5px solid ${QUADRANT_CONFIG[q.key].color}55`,
                    }"
                  />
                </div>
                <button
                  :data-cy="`quadrant-${q.key}`"
                  :style="{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px 3px 8px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: filters.activeQuadrants.value.has(q.key) ? '600' : '400',
                    color: filters.activeQuadrants.value.has(q.key) ? q.activeText : '#3C3C43',
                    background: filters.activeQuadrants.value.has(q.key) ? q.activeBg : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    lineHeight: '1',
                  }"
                  @click="toggleQuadrant(q.key)"
                >
                  <span
                    :style="{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: filters.activeQuadrants.value.has(q.key)
                        ? 'rgba(255,255,255,0.8)'
                        : QUADRANT_CONFIG[q.key].color,
                      display: 'inline-block',
                      flexShrink: 0,
                    }"
                  />
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
                  <div
                    style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(0,0,0,0.12);"
                  />
                </div>
                <button
                  :data-cy="`tech-${t.key}`"
                  :style="{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: filters.techFilter.value === t.key ? '600' : '400',
                    color: filters.techFilter.value === t.key ? '#1C1C1E' : '#6E6E73',
                    background:
                      filters.techFilter.value === t.key ? 'rgba(0,0,0,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    lineHeight: '1',
                  }"
                  @click="filters.setTech(t.key)"
                >
                  <span
                    v-if="t.key === 'TODOS'"
                    style="display:flex;align-items:center;opacity:0.75;"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <span
                    v-if="t.key === 'FIBRA'"
                    style="display:flex;align-items:center;opacity:0.75;"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                  </span>
                  <span
                    v-if="t.key === 'MOVEL'"
                    style="display:flex;align-items:center;opacity:0.75;"
                  >
                    <svg
                      width="11"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </span>
                  {{ t.label }}
                </button>
              </div>
            </div>

            <div style="flex:1;" />

            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              <span style="font-size:12px;color:#8E8E93;" data-cy="counter-visible">
                {{ visibleGeohashes.length }}/{{ geohashes.length }} visíveis
              </span>
              <span
                v-if="emRiscoCount > 0"
                style="font-size:12px;font-weight:600;color:#EF4444;display:flex;align-items:center;gap:4px;"
                data-cy="counter-risco"
              >
                <span
                  style="width:7px;height:7px;border-radius:50%;background:#EF4444;display:inline-block;"
                />
                {{ emRiscoCount }} em risco
              </span>
              <span v-if="currentPeriod" style="font-size:11px;color:#8E8E93;">
                Período: <strong style="color:#1C1C1E;">{{ currentPeriod }}</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- Mapa -->
        <div style="flex:1;position:relative;overflow:hidden;">
          <MapView
            :initial-center="GOIANIA_CENTER"
            :initial-zoom="GOIANIA_ZOOM"
            style="width:100%;height:100%;"
            @map-ready="handleMapReady"
          />
          <div
            v-if="!mapLoaded || loading"
            style="position:absolute;inset:0;background:rgba(245,245,247,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10;pointer-events:none;"
          >
            <div class="spinner" />
            <span style="font-size:12px;color:#8E8E93;font-weight:600;">
              {{ !mapLoaded ? "Carregando mapa..." : "Carregando geohashes..." }}
            </span>
          </div>
        </div>
      </div>

      <!-- Painel direito -->
      <GeohashPanel
        :geohash="panelGeohash"
        :active-tech="filters.techFilter.value"
      />
    </div>
  </div>
</template>

<style scoped>
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 0, 153, 0.15);
  border-top: 3px solid #660099;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
