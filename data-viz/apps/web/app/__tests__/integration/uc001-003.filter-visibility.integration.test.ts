/**
 * Testes de Integração — UC001/UC002/UC003: Visibilidade de Filtros
 *
 * Verifica a regra de visibilidade RN002-02:
 * quadrantFilters.has(gh.quadrant) AND
 * (techFilter === "TODOS" OR gh.technology === techFilter OR gh.technology === "AMBOS")
 *
 * Testa interação entre useFilters e dados de geohash simulados.
 */

import { ref } from "vue";

// Mock Nuxt's auto-imported useState
vi.stubGlobal("useState", (_key: string, init: () => any) => ref(init()));

import {
  useFilters,
  QUADRANT_ORDER,
  QUADRANT_COLORS,
  type Quadrant,
} from "../../composables/useFilters";

function gh(quadrant: string, tech: string) {
  return { quadrant_type: quadrant, tech_category: tech };
}

describe("UC001-003 — Regra de Visibilidade (RN002-02)", () => {
  describe("UC001 — PS02: Legenda mostra 4 quadrantes com cores", () => {
    it("todos os 4 quadrantes possuem configuração de cor definida", () => {
      const quadrants: Quadrant[] = [
        "GROWTH",
        "UPSELL",
        "RETENCAO",
        "GROWTH_RETENCAO",
      ];
      quadrants.forEach((q) => {
        expect(QUADRANT_COLORS[q]).toBeDefined();
        expect(QUADRANT_COLORS[q].hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(QUADRANT_COLORS[q].label).toBeTruthy();
      });
    });

    it("QUADRANT_ORDER define sequência correta para renderização", () => {
      expect(QUADRANT_ORDER).toEqual([
        "GROWTH",
        "UPSELL",
        "RETENCAO",
        "GROWTH_RETENCAO",
      ]);
    });
  });

  describe("UC002 — PS01: Apenas polígonos dos quadrantes ativos visíveis", () => {
    it("com todos ativos, todos quadrantes são visíveis", () => {
      const { isVisible } = useFilters();

      expect(isVisible(gh("GROWTH", "FIBRA"))).toBe(true);
      expect(isVisible(gh("UPSELL", "MOVEL"))).toBe(true);
      expect(isVisible(gh("RETENCAO", "AMBOS"))).toBe(true);
      expect(isVisible(gh("GROWTH_RETENCAO", "FIBRA"))).toBe(true);
    });

    it("desativar RETENCAO oculta apenas geohashes RETENCAO", () => {
      const { isVisible, toggleQuadrant } = useFilters();
      toggleQuadrant("RETENCAO");

      expect(isVisible(gh("GROWTH", "FIBRA"))).toBe(true);
      expect(isVisible(gh("RETENCAO", "FIBRA"))).toBe(false);
      expect(isVisible(gh("UPSELL", "MOVEL"))).toBe(true);
    });

    it("UC002-FA01: todos quadrantes desativados resulta em 0 visíveis", () => {
      const { isVisible, toggleQuadrant } = useFilters();
      QUADRANT_ORDER.forEach((q) => toggleQuadrant(q));

      expect(isVisible(gh("GROWTH", "FIBRA"))).toBe(false);
      expect(isVisible(gh("UPSELL", "MOVEL"))).toBe(false);
      expect(isVisible(gh("RETENCAO", "AMBOS"))).toBe(false);
      expect(isVisible(gh("GROWTH_RETENCAO", "FIBRA"))).toBe(false);
    });

    it("PS02: contadores deriváveis pela contagem de visíveis vs total", () => {
      const { isVisible, toggleQuadrant } = useFilters();

      const geohashes = [
        gh("GROWTH", "FIBRA"),
        gh("GROWTH", "MOVEL"),
        gh("RETENCAO", "FIBRA"),
        gh("UPSELL", "AMBOS"),
      ];

      const totalAntes = geohashes.filter((g) => isVisible(g)).length;
      expect(totalAntes).toBe(4);

      toggleQuadrant("GROWTH");
      const totalDepois = geohashes.filter((g) => isVisible(g)).length;
      expect(totalDepois).toBe(2);

      const emRisco = geohashes.filter(
        (g) => g.quadrant_type === "RETENCAO" && isVisible(g),
      ).length;
      expect(emRisco).toBe(1);
    });
  });

  describe("UC003 — PS01: Filtro de tecnologia respeitando quadrante", () => {
    it("RN003-01: filtro FIBRA mostra apenas FIBRA e AMBOS", () => {
      const { isVisible, setTech } = useFilters();
      setTech("FIBRA");

      expect(isVisible(gh("GROWTH", "FIBRA"))).toBe(true);
      expect(isVisible(gh("GROWTH", "AMBOS"))).toBe(true);
      expect(isVisible(gh("GROWTH", "MOVEL"))).toBe(false);
    });

    it("RN003-01: filtro MOVEL mostra apenas MOVEL e AMBOS", () => {
      const { isVisible, setTech } = useFilters();
      setTech("MOVEL");

      expect(isVisible(gh("UPSELL", "MOVEL"))).toBe(true);
      expect(isVisible(gh("UPSELL", "AMBOS"))).toBe(true);
      expect(isVisible(gh("UPSELL", "FIBRA"))).toBe(false);
    });

    it("filtro TODOS mostra todas as tecnologias", () => {
      const { isVisible, setTech } = useFilters();
      setTech("TODOS");

      expect(isVisible(gh("GROWTH", "FIBRA"))).toBe(true);
      expect(isVisible(gh("GROWTH", "MOVEL"))).toBe(true);
      expect(isVisible(gh("GROWTH", "AMBOS"))).toBe(true);
    });

    it("UC003-FA01: nenhum visível quando tech não match e quadrante inativo", () => {
      const { isVisible, toggleQuadrant, setTech } = useFilters();
      toggleQuadrant("GROWTH");
      setTech("FIBRA");

      // GROWTH desativado + FIBRA filtro → GROWTH/MOVEL invisível (quadrante off)
      expect(isVisible(gh("GROWTH", "MOVEL"))).toBe(false);
      // UPSELL ativo + MOVEL tech → invisível (tech não match e não é AMBOS)
      expect(isVisible(gh("UPSELL", "MOVEL"))).toBe(false);
      // UPSELL ativo + FIBRA tech → visível
      expect(isVisible(gh("UPSELL", "FIBRA"))).toBe(true);
    });
  });

  describe("Interação combinada Quadrante × Tecnologia", () => {
    it("filtro FIBRA + apenas RETENCAO ativo mostra somente RETENCAO/FIBRA e RETENCAO/AMBOS", () => {
      const { isVisible, toggleQuadrant, setTech } = useFilters();
      // Desativa todos exceto RETENCAO
      toggleQuadrant("GROWTH");
      toggleQuadrant("UPSELL");
      toggleQuadrant("GROWTH_RETENCAO");
      setTech("FIBRA");

      expect(isVisible(gh("RETENCAO", "FIBRA"))).toBe(true);
      expect(isVisible(gh("RETENCAO", "AMBOS"))).toBe(true);
      expect(isVisible(gh("RETENCAO", "MOVEL"))).toBe(false);
      expect(isVisible(gh("GROWTH", "FIBRA"))).toBe(false);
    });

    it("cenário realista: analista filtra por GROWTH + MOVEL", () => {
      const { isVisible, toggleQuadrant, setTech } = useFilters();
      toggleQuadrant("UPSELL");
      toggleQuadrant("RETENCAO");
      toggleQuadrant("GROWTH_RETENCAO");
      setTech("MOVEL");

      const geohashes = [
        gh("GROWTH", "MOVEL"),    // visível
        gh("GROWTH", "AMBOS"),    // visível (AMBOS match MOVEL)
        gh("GROWTH", "FIBRA"),    // invisível (tech não match)
        gh("UPSELL", "MOVEL"),    // invisível (quadrante off)
        gh("RETENCAO", "MOVEL"),  // invisível (quadrante off)
      ];

      const visiveis = geohashes.filter((g) => isVisible(g));
      expect(visiveis).toHaveLength(2);
    });
  });
});
