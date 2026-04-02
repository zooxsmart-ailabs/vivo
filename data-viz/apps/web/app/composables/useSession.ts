/**
 * UC011 — Persistência de estado de sessão.
 * Debounce de 2s antes de salvar para reduzir writes redundantes.
 * Carrega da API na montagem e persiste automaticamente quando os filtros mudam.
 */
import { useFilters } from "./useFilters";
import { useTrpc } from "./useTrpc";

// ID de sessão anônimo (sem auth real neste momento)
const SESSION_USER_ID = "anon";
const DEBOUNCE_MS = 2000;

export function useSession() {
  const trpc = useTrpc();
  const filters = useFilters();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function load() {
    try {
      const saved = await trpc.session.get.query({ userId: SESSION_USER_ID });
      if (!saved) return;

      if (saved.activeQuadrants) {
        filters.activeQuadrants.value = new Set(saved.activeQuadrants as any);
      }
      if (saved.techFilter) {
        filters.techFilter.value = saved.techFilter as any;
      }
      if (saved.period) {
        filters.period.value = saved.period;
      }
      if (saved.location) {
        filters.setLocation({
          state: saved.location.state ?? null,
          city: saved.location.city ?? null,
          neighborhood: saved.location.neighborhood ?? null,
        });
      }
    } catch {
      // Sessão não crítica — falha silenciosa
    }
  }

  function scheduleFlush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => flush(), DEBOUNCE_MS);
  }

  async function flush() {
    try {
      await trpc.session.save.mutate({
        userId: SESSION_USER_ID,
        state: {
          activeQuadrants: [...filters.activeQuadrants.value],
          techFilter: filters.techFilter.value,
          period: filters.period.value ?? undefined,
          location: {
            state: filters.state.value ?? undefined,
            city: filters.city.value ?? undefined,
            neighborhood: filters.neighborhood.value ?? undefined,
          },
        },
      });
    } catch {
      // Persiste no melhor esforço
    }
  }

  return { load, scheduleFlush, flush };
}
