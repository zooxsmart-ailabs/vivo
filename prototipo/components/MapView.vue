<script setup lang="ts">
/// <reference types="@types/google.maps" />
import { onMounted, ref } from "vue";

interface Props {
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialCenter: () => ({ lat: -23.5505, lng: -46.6333 }),
  initialZoom: 11,
});

const emit = defineEmits<{
  ready: [map: google.maps.Map];
}>();

const container = ref<HTMLDivElement | null>(null);
const { loadMapScript } = useGoogleMaps();

onMounted(async () => {
  await loadMapScript();
  if (!container.value || !window.google?.maps) return;
  const map = new window.google.maps.Map(container.value, {
    zoom: props.initialZoom,
    center: props.initialCenter,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
    streetViewControl: true,
    mapId: "DEMO_MAP_ID",
  });
  emit("ready", map);
});
</script>

<template>
  <div ref="container" class="w-full h-full" style="min-height: 0" />
</template>
