import { ref, type Ref } from "vue";

// Mock Nuxt's auto-imported useState as a simple ref factory
vi.stubGlobal("useState", (_key: string, init: () => any) => ref(init()));

import {
  useFilters,
  QUADRANT_ORDER,
  QUADRANT_COLORS,
  QUADRANT_DESCRIPTIONS,
  type Quadrant,
} from "./useFilters";

describe("useFilters", () => {
  describe("initial state", () => {
    it("initializes with all quadrants active", () => {
      const { activeQuadrants } = useFilters();

      for (const q of QUADRANT_ORDER) {
        expect(activeQuadrants.value.has(q)).toBe(true);
      }
      expect(activeQuadrants.value.size).toBe(4);
    });

    it("initializes with TODOS tech filter", () => {
      const { techFilter } = useFilters();
      expect(techFilter.value).toBe("TODOS");
    });

    it("initializes with null period, state, city, neighborhood", () => {
      const { period, state, city, neighborhood } = useFilters();

      expect(period.value).toBeNull();
      expect(state.value).toBeNull();
      expect(city.value).toBeNull();
      expect(neighborhood.value).toBeNull();
    });

    it("initializes with precision 6", () => {
      const { precision } = useFilters();
      expect(precision.value).toBe(6);
    });
  });

  describe("toggleQuadrant", () => {
    it("removes an active quadrant", () => {
      const { activeQuadrants, toggleQuadrant } = useFilters();

      toggleQuadrant("GROWTH");

      expect(activeQuadrants.value.has("GROWTH")).toBe(false);
    });

    it("adds an inactive quadrant", () => {
      const { activeQuadrants, toggleQuadrant } = useFilters();
      toggleQuadrant("UPSELL");

      toggleQuadrant("UPSELL");

      expect(activeQuadrants.value.has("UPSELL")).toBe(true);
    });
  });

  describe("setTech", () => {
    it("updates tech filter", () => {
      const { techFilter, setTech } = useFilters();

      setTech("FIBRA");

      expect(techFilter.value).toBe("FIBRA");
    });
  });

  describe("setPeriod", () => {
    it("updates period", () => {
      const { period, setPeriod } = useFilters();

      setPeriod("2025-01");

      expect(period.value).toBe("2025-01");
    });

    it("accepts null to clear period", () => {
      const { period, setPeriod } = useFilters();
      setPeriod("2025-01");

      setPeriod(null);

      expect(period.value).toBeNull();
    });
  });

  describe("setLocation", () => {
    it("updates all location fields", () => {
      const { state, city, neighborhood, setLocation } = useFilters();

      setLocation({ state: "SP", city: "São Paulo", neighborhood: "Pinheiros" });

      expect(state.value).toBe("SP");
      expect(city.value).toBe("São Paulo");
      expect(neighborhood.value).toBe("Pinheiros");
    });

    it("accepts partial updates", () => {
      const { state, city, setLocation } = useFilters();

      setLocation({ state: "RJ" });

      expect(state.value).toBe("RJ");
      expect(city.value).not.toBe(undefined);
    });

    it("accepts null values to clear fields", () => {
      const { state, setLocation } = useFilters();
      setLocation({ state: "SP" });

      setLocation({ state: null });

      expect(state.value).toBeNull();
    });
  });

  describe("setPrecision", () => {
    it("updates precision to 7", () => {
      const { precision, setPrecision } = useFilters();

      setPrecision(7);

      expect(precision.value).toBe(7);
    });
  });

  describe("isVisible", () => {
    it("returns true for matching quadrant and TODOS tech", () => {
      const { isVisible } = useFilters();

      expect(
        isVisible({ quadrant_type: "GROWTH", tech_category: "FIBRA" }),
      ).toBe(true);
    });

    it("returns false for inactive quadrant", () => {
      const { isVisible, toggleQuadrant } = useFilters();
      toggleQuadrant("GROWTH");

      expect(
        isVisible({ quadrant_type: "GROWTH", tech_category: "FIBRA" }),
      ).toBe(false);
    });

    it("returns true for AMBOS tech when filtered to FIBRA", () => {
      const { isVisible, setTech } = useFilters();
      setTech("FIBRA");

      expect(
        isVisible({ quadrant_type: "GROWTH", tech_category: "AMBOS" }),
      ).toBe(true);
    });

    it("returns true for AMBOS tech when filtered to MOVEL", () => {
      const { isVisible, setTech } = useFilters();
      setTech("MOVEL");

      expect(
        isVisible({ quadrant_type: "UPSELL", tech_category: "AMBOS" }),
      ).toBe(true);
    });

    it("returns false when tech does not match and is not AMBOS", () => {
      const { isVisible, setTech } = useFilters();
      setTech("FIBRA");

      expect(
        isVisible({ quadrant_type: "GROWTH", tech_category: "MOVEL" }),
      ).toBe(false);
    });

    it("returns true for any tech when filter is TODOS", () => {
      const { isVisible } = useFilters();

      expect(
        isVisible({ quadrant_type: "RETENCAO", tech_category: "MOVEL" }),
      ).toBe(true);
      expect(
        isVisible({ quadrant_type: "RETENCAO", tech_category: "FIBRA" }),
      ).toBe(true);
    });
  });
});

describe("constants", () => {
  it("QUADRANT_ORDER has 4 entries", () => {
    expect(QUADRANT_ORDER).toHaveLength(4);
  });

  it("QUADRANT_COLORS has hex, stroke, and label for each quadrant", () => {
    for (const q of QUADRANT_ORDER) {
      expect(QUADRANT_COLORS[q]).toHaveProperty("hex");
      expect(QUADRANT_COLORS[q]).toHaveProperty("stroke");
      expect(QUADRANT_COLORS[q]).toHaveProperty("label");
    }
  });

  it("QUADRANT_DESCRIPTIONS has a description for each quadrant", () => {
    for (const q of QUADRANT_ORDER) {
      expect(typeof QUADRANT_DESCRIPTIONS[q]).toBe("string");
      expect(QUADRANT_DESCRIPTIONS[q].length).toBeGreaterThan(0);
    }
  });
});
