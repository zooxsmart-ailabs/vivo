<template>
  <div ref="mapEl" class="w-full h-full" style="min-height: 0" />
</template>

<script setup lang="ts">
import { useGoogleMaps } from "../composables/useGoogleMaps";
import { QUADRANT_COLORS, type Quadrant } from "../composables/useFilters";

/**
 * Converte um geohash para os 4 vértices de um polígono retangular.
 * Implementação baseada no algoritmo Ngeohash (decodificação de bits).
 */
function geohashToPolygon(hash: string): google.maps.LatLngLiteral[] {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let isLng = true;

  for (const char of hash) {
    const bits = BASE32.indexOf(char);
    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (isLng) {
        const mid = (minLng + maxLng) / 2;
        if (bits & mask) minLng = mid; else maxLng = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bits & mask) minLat = mid; else maxLat = mid;
      }
      isLng = !isLng;
    }
  }

  return [
    { lat: minLat, lng: minLng },
    { lat: minLat, lng: maxLng },
    { lat: maxLat, lng: maxLng },
    { lat: maxLat, lng: minLng },
  ];
}

interface GeohashSummary {
  geohash_id: string;
  quadrant_type: string;
  tech_category: string;
  share_vivo: number;
  avg_satisfaction_vivo: number;
  priority_score: number;
  priority_label: string;
  trend_direction: string;
  trend_delta: number;
  competitive_position: string;
  neighborhood: string | null;
  city: string;
  state: string;
  vivo_score?: number | null;
  tim_score?: number | null;
  claro_score?: number | null;
  is_top10?: boolean;
}

const props = defineProps<{
  geohashes: GeohashSummary[];
  visibleGeohashIds: Set<string>;
  center?: { lat: number; lng: number };
  zoom?: number;
}>();

const emit = defineEmits<{
  hover: [geohash: GeohashSummary | null];
  click: [geohash: GeohashSummary];
  zoomChange: [zoom: number];
  viewportChange: [viewport: { swLat: number; swLng: number; neLat: number; neLng: number }];
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const { load } = useGoogleMaps();

let map: google.maps.Map | null = null;
const polygonsMap = new Map<string, google.maps.Polygon>();
let pinnedId: string | null = null;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
];

function getColor(gh: GeohashSummary) {
  return QUADRANT_COLORS[gh.quadrant_type as Quadrant]?.hex ?? "#94A3B8";
}

function createPolygon(gh: GeohashSummary): google.maps.Polygon {
  const color = getColor(gh);
  const polygon = new google.maps.Polygon({
    paths: geohashToPolygon(gh.geohash_id),
    strokeColor: color + "CC",
    strokeOpacity: 0.9,
    strokeWeight: 1.5,
    fillColor: color,
    fillOpacity: 0.4,
    map: props.visibleGeohashIds.has(gh.geohash_id) ? map! : null,
    zIndex: 1,
  });

  polygon.addListener("mouseover", () => {
    if (pinnedId !== gh.geohash_id) {
      polygon.setOptions({ fillOpacity: 0.72, strokeWeight: 2.5, strokeColor: "#ffffff", zIndex: 10 });
    }
    emit("hover", gh);
  });

  polygon.addListener("mouseout", () => {
    if (pinnedId !== gh.geohash_id) {
      polygon.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: getColor(gh) + "CC", zIndex: 1 });
      if (!pinnedId) emit("hover", null);
    }
  });

  polygon.addListener("click", () => {
    if (pinnedId === gh.geohash_id) {
      // Desafixar
      pinnedId = null;
      polygon.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: getColor(gh) + "CC", zIndex: 1 });
    } else {
      // Restaura o pin anterior
      if (pinnedId) {
        const prev = polygonsMap.get(pinnedId);
        if (prev) {
          const prevGh = props.geohashes.find((g) => g.geohash_id === pinnedId);
          if (prevGh) {
            prev.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: getColor(prevGh) + "CC", zIndex: 1 });
          }
        }
      }
      pinnedId = gh.geohash_id;
      polygon.setOptions({ fillOpacity: 0.8, strokeWeight: 3, strokeColor: "#ffffff", zIndex: 20 });
      emit("click", gh);
    }
  });

  return polygon;
}

async function initMap() {
  if (!mapEl.value) return;
  await load();

  map = new google.maps.Map(mapEl.value, {
    center: props.center ?? { lat: -16.6869, lng: -49.2648 },
    zoom: props.zoom ?? 11,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    styles: MAP_STYLES,
    mapId: "VIVO_GEOINTELLIGENCE",
  });

  // Debounce de zoom para calcular precisão
  let zoomTimer: ReturnType<typeof setTimeout> | null = null;
  map.addListener("zoom_changed", () => {
    if (zoomTimer) clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => {
      emit("zoomChange", map!.getZoom() ?? 11);
    }, 300);
  });

  // Debounce de bounds para drill-down
  let boundsTimer: ReturnType<typeof setTimeout> | null = null;
  map.addListener("bounds_changed", () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      const bounds = map!.getBounds();
      if (!bounds) return;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      emit("viewportChange", {
        swLat: sw.lat(),
        swLng: sw.lng(),
        neLat: ne.lat(),
        neLng: ne.lng(),
      });
    }, 500);
  });

  // Renderiza os polígonos iniciais
  for (const gh of props.geohashes) {
    const polygon = createPolygon(gh);
    polygonsMap.set(gh.geohash_id, polygon);
  }
}

// Atualiza visibilidade dos polígonos quando os filtros mudam
watch(
  () => props.visibleGeohashIds,
  (newIds) => {
    for (const [id, polygon] of polygonsMap) {
      polygon.setOptions({ map: newIds.has(id) ? map : null });
    }
  },
);

// Adiciona/remove polígonos conforme os dados mudam (drill-down)
watch(
  () => props.geohashes,
  (newList) => {
    const newIds = new Set(newList.map((g) => g.geohash_id));

    // Remove polígonos que não existem mais
    for (const [id, polygon] of polygonsMap) {
      if (!newIds.has(id)) {
        polygon.setMap(null);
        polygonsMap.delete(id);
      }
    }

    // Adiciona novos polígonos
    for (const gh of newList) {
      if (!polygonsMap.has(gh.geohash_id)) {
        const polygon = createPolygon(gh);
        polygonsMap.set(gh.geohash_id, polygon);
      }
    }
  },
);

onMounted(() => initMap());
onUnmounted(() => {
  for (const polygon of polygonsMap.values()) {
    polygon.setMap(null);
  }
  polygonsMap.clear();
});
</script>
