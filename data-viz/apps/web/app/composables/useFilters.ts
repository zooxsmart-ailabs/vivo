/**
 * Estado global de filtros do Mapa Estratégico.
 * Compartilhado entre MapCanvas, FilterBar e GeohashCard.
 */

export type Quadrant = "GROWTH" | "UPSELL" | "RETENCAO" | "GROWTH_RETENCAO";
export type TechFilter = "TODOS" | "FIBRA" | "MOVEL" | "AMBOS";

export interface MapFilters {
  activeQuadrants: Set<Quadrant>;
  techFilter: TechFilter;
  period: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  precision: 6 | 7;
}

export const QUADRANT_ORDER: Quadrant[] = [
  "GROWTH",
  "UPSELL",
  "RETENCAO",
  "GROWTH_RETENCAO",
];

export const QUADRANT_COLORS: Record<
  Quadrant,
  { hex: string; stroke: string; label: string }
> = {
  GROWTH: { hex: "#22C55E", stroke: "#16A34ACC", label: "Growth" },
  UPSELL: { hex: "#660099", stroke: "#4C0074CC", label: "Upsell" },
  RETENCAO: { hex: "#EF4444", stroke: "#DC2626CC", label: "Retenção" },
  GROWTH_RETENCAO: {
    hex: "#F97316",
    stroke: "#EA580CCC",
    label: "Growth+Retenção",
  },
};

// Color used for geohash cells where only competitors have QoE data (no Vivo samples).
// These cells bypass the quadrant filter and always render on the map.
export const SEM_VIVO_COLOR = {
  hex: "#94A3B8",
  stroke: "#64748BCC",
  label: "Sem dados Vivo",
};

export const QUADRANT_DESCRIPTIONS: Record<Quadrant, string> = {
  GROWTH: "Share baixo + Satisfação alta — janela de ataque, geração de leads",
  UPSELL:
    "Share alto + Satisfação alta — maximizar receita, upsell premium",
  RETENCAO:
    "Share alto + Satisfação baixa — risco iminente de churn, ação urgente",
  GROWTH_RETENCAO:
    "Share baixo + Satisfação baixa — dupla frente: aquisição + infraestrutura",
};

// Estado global reativo (singleton via useState do Nuxt)
export function useFilters() {
  const activeQuadrants = useState<Set<Quadrant>>("filters.quadrants", () => new Set(QUADRANT_ORDER));
  const techFilter = useState<TechFilter>("filters.tech", () => "TODOS");
  const period = useState<string | null>("filters.period", () => null);
  const state = useState<string | null>("filters.state", () => null);
  const city = useState<string | null>("filters.city", () => null);
  const neighborhood = useState<string | null>("filters.neighborhood", () => null);
  const precision = useState<6 | 7>("filters.precision", () => 6);

  function toggleQuadrant(q: Quadrant) {
    const next = new Set(activeQuadrants.value);
    if (next.has(q)) {
      next.delete(q);
    } else {
      next.add(q);
    }
    activeQuadrants.value = next;
  }

  function setTech(t: TechFilter) {
    techFilter.value = t;
  }

  function setPeriod(p: string | null) {
    period.value = p;
  }

  function setLocation(opts: {
    state?: string | null;
    city?: string | null;
    neighborhood?: string | null;
  }) {
    if (opts.state !== undefined) state.value = opts.state;
    if (opts.city !== undefined) city.value = opts.city;
    if (opts.neighborhood !== undefined) neighborhood.value = opts.neighborhood;
  }

  function setPrecision(p: 6 | 7) {
    precision.value = p;
  }

  function isVisible(geohash: {
    quadrant_type: string;
    tech_category: string;
    has_vivo_data?: boolean;
  }) {
    // Cells where only competitors have data bypass the quadrant filter
    // (their quadrant would be GROWTH_RETENCAO with share=0/score=0, not meaningful).
    const hasVivo = geohash.has_vivo_data !== false;
    if (hasVivo && !activeQuadrants.value.has(geohash.quadrant_type as Quadrant)) return false;
    if (
      techFilter.value !== "TODOS" &&
      geohash.tech_category !== techFilter.value &&
      geohash.tech_category !== "AMBOS"
    ) {
      return false;
    }
    return true;
  }

  return {
    activeQuadrants,
    techFilter,
    period,
    state,
    city,
    neighborhood,
    precision,
    toggleQuadrant,
    setTech,
    setPeriod,
    setLocation,
    setPrecision,
    isVisible,
  };
}
