import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock useTrpc
const mockQuery = vi.fn();
vi.mock("./useTrpc", () => ({
  useTrpc: () => ({
    geohash: {
      getById: { query: mockQuery },
    },
  }),
}));

// Stub Vue auto-imports
vi.stubGlobal("ref", (v: any) => ({ value: v }));
vi.stubGlobal("onUnmounted", vi.fn());

import { useHoverDetail } from "./useHoverDetail";

describe("useHoverDetail", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid requestDetail calls into a single query", async () => {
    mockQuery.mockResolvedValue({ id: "gh3" });
    const { requestDetail } = useHoverDetail();

    requestDetail("gh1");
    requestDetail("gh2");
    requestDetail("gh3");

    expect(mockQuery).not.toHaveBeenCalled();

    vi.advanceTimersByTime(180);
    await vi.runAllTimersAsync();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      { geohashId: "gh3", period: undefined },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("aborts previous in-flight request when a new one fires", async () => {
    // Simulate real tRPC behavior: abort rejects with AbortError
    mockQuery.mockImplementation((_input: any, opts: any) => {
      return new Promise((resolve, reject) => {
        const onAbort = () =>
          reject(new DOMException("The operation was aborted.", "AbortError"));
        if (opts?.signal?.aborted) return onAbort();
        opts?.signal?.addEventListener("abort", onAbort);
        setTimeout(() => resolve({ id: _input.geohashId }), 50);
      });
    });

    const { requestDetail, detailData } = useHoverDetail();

    // Fire first request
    requestDetail("gh1");
    vi.advanceTimersByTime(180);

    // First request is in-flight; fire second (aborts first)
    requestDetail("gh2");
    vi.advanceTimersByTime(180);

    // Verify the signal passed to the first call was aborted
    const firstSignal = mockQuery.mock.calls[0][1].signal;
    expect(firstSignal.aborted).toBe(true);

    // Let the second request resolve
    await vi.advanceTimersByTimeAsync(50);
    await vi.runAllTimersAsync();

    expect(detailData.value).toEqual({ id: "gh2" });
  });

  it("loadDetailImmediate fires without debounce", async () => {
    mockQuery.mockResolvedValue({ id: "gh1" });
    const { loadDetailImmediate } = useHoverDetail();

    loadDetailImmediate("gh1", "2025-01");

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      { geohashId: "gh1", period: "2025-01" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("clear cancels pending timer and resets state", () => {
    const { requestDetail, clear, detailData, loading } = useHoverDetail();

    requestDetail("gh1");
    clear();

    vi.advanceTimersByTime(200);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(detailData.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  it("swallows AbortError silently", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    mockQuery.mockRejectedValueOnce(abortError);
    mockQuery.mockResolvedValueOnce({ id: "gh2" });

    const { loadDetailImmediate, detailData } = useHoverDetail();

    // First call will be aborted when second fires
    loadDetailImmediate("gh1");
    loadDetailImmediate("gh2");
    await vi.runAllTimersAsync();

    expect(detailData.value).toEqual({ id: "gh2" });
  });
});
