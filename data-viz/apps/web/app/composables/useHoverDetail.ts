import { useTrpc } from "./useTrpc";

const DEBOUNCE_MS = 180;

export function useHoverDetail() {
  const trpc = useTrpc();
  const detailData = ref<any>(null);
  const loading = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  async function loadDetail(geohashId: string, period?: string) {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const { signal } = abortController;

    loading.value = true;
    try {
      detailData.value = await trpc.geohash.getById.query(
        { geohashId, period },
        { signal },
      );
    } catch (err: any) {
      if (err?.name === "AbortError" || signal.aborted) return;
      detailData.value = null;
    } finally {
      if (!signal.aborted) loading.value = false;
    }
  }

  function requestDetail(geohashId: string, period?: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadDetail(geohashId, period), DEBOUNCE_MS);
  }

  function loadDetailImmediate(geohashId: string, period?: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    loadDetail(geohashId, period);
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (abortController) abortController.abort();
    detailData.value = null;
    loading.value = false;
  }

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (abortController) abortController.abort();
  });

  return { detailData, loading, requestDetail, loadDetailImmediate, clear };
}
