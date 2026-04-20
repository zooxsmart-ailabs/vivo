<script setup lang="ts">
/// <reference types="@types/google.maps" />
// MapView.vue — Google Maps wrapper para Nuxt
// Usa o proxy Manus via composable useGoogleMaps
// Emite evento "mapReady" com a instância do mapa
import { ref, onMounted } from "vue";

interface Props {
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialCenter: () => ({ lat: -16.6869, lng: -49.2648 }),
  initialZoom: 11,
});

const emit = defineEmits<{
  mapReady: [map: google.maps.Map];
}>();

const container = ref<HTMLDivElement | null>(null);
const { loadMapScript } = useGoogleMaps();

onMounted(async () => {
  try {
    await loadMapScript();
  } catch (e) {
    console.error("[MapView] Erro ao carregar Google Maps:", e);
    return;
  }
  if (!container.value || !window.google?.maps) {
    console.error("[MapView] Container ou google.maps indisponível");
    return;
  }
  const map = new window.google.maps.Map(container.value, {
    zoom: props.initialZoom,
    center: props.initialCenter,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    scrollwheel: true,
    gestureHandling: "greedy",
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
    },
    panControl: true,
    panControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
    },
  });
  emit("mapReady", map);
});
</script>

<template>
  <div ref="container" style="width: 100%; height: 100%; min-height: 0;" />
</template>
