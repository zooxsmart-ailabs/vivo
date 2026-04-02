import { ref } from "vue";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Singleton store simulating Nuxt's useState (same key → same ref)
const nuxtState = new Map<string, any>();
vi.stubGlobal("useState", (key: string, init: () => any) => {
  if (!nuxtState.has(key)) nuxtState.set(key, ref(init()));
  return nuxtState.get(key)!;
});

const mockQuery = vi.fn();
const mockMutate = vi.fn();

vi.mock("./useTrpc", () => ({
  useTrpc: () => ({
    session: {
      get: { query: mockQuery },
      save: { mutate: mockMutate },
    },
  }),
}));

// Must import AFTER mocks are set up
import { useSession } from "./useSession";
import { useFilters } from "./useFilters";

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    nuxtState.clear(); // reset shared state between tests
    mockQuery.mockResolvedValue(null);
    mockMutate.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("load", () => {
    it("chama session.get.query com userId 'anon'", async () => {
      const { load } = useSession();
      await load();
      expect(mockQuery).toHaveBeenCalledWith({ userId: "anon" });
    });

    it("restaura activeQuadrants e techFilter da sessão salva", async () => {
      mockQuery.mockResolvedValue({
        activeQuadrants: ["GROWTH", "RETENCAO"],
        techFilter: "FIBRA",
        period: "2025-01",
      });
      const filters = useFilters();
      const { load } = useSession();

      await load();

      expect(filters.activeQuadrants.value).toEqual(
        new Set(["GROWTH", "RETENCAO"]),
      );
      expect(filters.techFilter.value).toBe("FIBRA");
      expect(filters.period.value).toBe("2025-01");
    });

    it("restaura location da sessão salva", async () => {
      mockQuery.mockResolvedValue({
        location: { state: "GO", city: "Goiânia", neighborhood: "Centro" },
      });
      const filters = useFilters();
      const { load } = useSession();

      await load();

      expect(filters.state.value).toBe("GO");
      expect(filters.city.value).toBe("Goiânia");
      expect(filters.neighborhood.value).toBe("Centro");
    });

    it("não modifica filtros quando sessão é null (primeira visita)", async () => {
      mockQuery.mockResolvedValue(null);
      const filters = useFilters();
      const techBefore = filters.techFilter.value;

      const { load } = useSession();
      await load();

      expect(filters.techFilter.value).toBe(techBefore);
    });

    it("falha silenciosamente quando API retorna erro", async () => {
      mockQuery.mockRejectedValue(new Error("network error"));

      const { load } = useSession();
      await expect(load()).resolves.toBeUndefined();
    });
  });

  describe("flush", () => {
    it("envia estado atual dos filtros via session.save.mutate", async () => {
      const filters = useFilters();
      filters.setTech("MOVEL");
      filters.setPeriod("2025-03");

      const { flush } = useSession();
      await flush();

      expect(mockMutate).toHaveBeenCalledWith({
        userId: "anon",
        state: expect.objectContaining({
          techFilter: "MOVEL",
          period: "2025-03",
        }),
      });
    });

    it("converte activeQuadrants de Set para array", async () => {
      useFilters(); // initialize shared state
      const { flush } = useSession();
      await flush();

      const call = mockMutate.mock.calls[0][0];
      expect(Array.isArray(call.state.activeQuadrants)).toBe(true);
    });

    it("falha silenciosamente quando API retorna erro", async () => {
      mockMutate.mockRejectedValue(new Error("save failed"));

      useFilters(); // initialize shared state
      const { flush } = useSession();
      await expect(flush()).resolves.toBeUndefined();
    });
  });

  describe("scheduleFlush", () => {
    it("agenda flush com debounce de 2 segundos", async () => {
      useFilters(); // initialize shared state
      const { scheduleFlush } = useSession();
      scheduleFlush();

      expect(mockMutate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();

      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    it("cancela flush anterior quando chamado novamente antes de 2s", async () => {
      useFilters(); // initialize shared state
      const { scheduleFlush } = useSession();
      scheduleFlush();
      vi.advanceTimersByTime(1500);

      scheduleFlush(); // reset the timer
      vi.advanceTimersByTime(1500);

      expect(mockMutate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      await vi.runOnlyPendingTimersAsync();

      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });
});
