/// <reference types="@types/google.maps" />
/**
 * useReverseGeocode — Resolve o nome do bairro de um geohash via Google Maps.
 *
 * O backend nem sempre tem `neighborhood` populado. Quando faltar, usamos
 * o Geocoder do Google Maps para extrair o `sublocality_level_1` /
 * `neighborhood` a partir do centro do geohash.
 *
 * Cache em escopo de módulo, indexado pelo geohash id, pra não re-chamar a
 * API a cada hover.
 */

import { useGoogleMaps } from "./useGoogleMaps";

const cache = new Map<string, string | null>();
let geocoder: google.maps.Geocoder | null = null;

function pickName(result: google.maps.GeocoderResult): string | null {
  const components = result.address_components ?? [];
  const order = [
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
    "administrative_area_level_4",
    "administrative_area_level_3",
  ];
  for (const type of order) {
    const found = components.find((c) => c.types.includes(type));
    if (found?.long_name) return found.long_name;
  }
  return null;
}

export function useReverseGeocode() {
  const { load } = useGoogleMaps();
  const name = ref<string | null>(null);
  const loading = ref(false);

  async function resolve(geohashId: string, lat: number, lng: number) {
    if (cache.has(geohashId)) {
      name.value = cache.get(geohashId) ?? null;
      return;
    }
    loading.value = true;
    try {
      await load();
      if (!window.google?.maps) {
        name.value = null;
        return;
      }
      if (!geocoder) geocoder = new google.maps.Geocoder();

      const res = await geocoder.geocode({ location: { lat, lng } });
      const found = res.results.length > 0 ? pickName(res.results[0]) : null;
      cache.set(geohashId, found);
      name.value = found;
    } catch (err) {
      console.warn("[useReverseGeocode] falhou:", err);
      cache.set(geohashId, null);
      name.value = null;
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    name.value = null;
  }

  return { name, loading, resolve, clear };
}
