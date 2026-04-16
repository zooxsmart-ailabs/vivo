/**
 * Accumulative viewport-based geohash loader.
 *
 * Instead of fetching all geohashes at once, this composable loads data for
 * the current map viewport and accumulates results across pans/zooms.
 * Previously loaded areas are never discarded, so scrolling back to a region
 * does not trigger a new network request.
 *
 * Reset happens automatically when structural filters change (precision,
 * period, state, city, neighborhood).
 */

import { useTrpc } from "./useTrpc";
import { useFilters } from "./useFilters";

const DEBOUNCE_MS = 600;

interface Viewport {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export type GeohashListItem = {
  geohash_id: string;
  precision: number;
  center_lat: number;
  center_lng: number;
  neighborhood: string | null;
  city: string;
  state: string;
  quadrant_type: string;
  share_vivo: number;
  avg_satisfaction_vivo: number;
  priority_score: number;
  priority_label: string;
  tech_category: string;
  trend_direction: string;
  trend_delta: number;
  competitive_position: string;
  period: string;
  has_vivo_data: boolean;
  is_top10: boolean;
};

export function useViewportLoader() {
  const trpc = useTrpc();
  const filters = useFilters();

  // Keyed by geohash_id for O(1) dedup on merge
  const store = new Map<string, GeohashListItem>();

  // Track which viewports have already been fetched to avoid redundant requests
  const loadedBounds: Viewport[] = [];

  const allGeohashes = shallowRef<GeohashListItem[]>([]);
  const loading = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Returns true if `bounds` is entirely contained within an already-fetched viewport.
   */
  function isFullyCovered(bounds: Viewport): boolean {
    return loadedBounds.some(
      (b) =>
        b.swLat <= bounds.swLat &&
        b.swLng <= bounds.swLng &&
        b.neLat >= bounds.neLat &&
        b.neLng >= bounds.neLng,
    );
  }

  async function fetchViewport(bounds: Viewport) {
    if (isFullyCovered(bounds)) return;

    loading.value = true;
    try {
      const rows = await trpc.geohash.list.query({
        precision: filters.precision.value,
        period: filters.period.value ?? undefined,
        state: filters.state.value ?? undefined,
        city: filters.city.value ?? undefined,
        neighborhood: filters.neighborhood.value ?? undefined,
        viewport: bounds,
      });

      for (const row of rows) {
        store.set(row.geohash_id, row as GeohashListItem);
      }
      loadedBounds.push(bounds);
      allGeohashes.value = [...store.values()];
    } catch (err) {
      console.error("[useViewportLoader] Failed to load viewport:", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Called by MapCanvas when the map's `idle` event fires.
   * Debounced to avoid bursts during animated pan/zoom.
   */
  function onBoundsChanged(bounds: Viewport) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchViewport(bounds), DEBOUNCE_MS);
  }

  /**
   * Clears the accumulator and loaded-bounds list.
   * Called automatically when structural filters change.
   */
  function reset() {
    if (debounceTimer) clearTimeout(debounceTimer);
    store.clear();
    loadedBounds.length = 0;
    allGeohashes.value = [];
  }

  // Reset accumulator whenever a filter that affects the query result changes.
  // Quadrant and tech filters are visual-only — no reset needed for those.
  watch(
    [
      filters.precision,
      filters.period,
      filters.state,
      filters.city,
      filters.neighborhood,
    ],
    () => reset(),
  );

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return { allGeohashes, loading, onBoundsChanged, reset };
}
