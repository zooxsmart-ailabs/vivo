/**
 * E2E — UC009: Consultar Frente Estratégica (Estratégias Growth)
 *
 * Critérios verificados:
 * - PS01: Sidebar com ranking de geohashes GROWTH
 * - PS02: Painel diagnóstico com 4 PilarCards + RecIA
 * - PS03: Recomendação IA (ATACAR/AGUARDAR/BLOQUEADO)
 * - PF01: Frente sem geohashes → mensagem vazia
 * - Busca na sidebar
 * - Seleção de geohash → carrega detalhes
 */

import {
  setupTrpcStubs,
  FIXTURE_RANKING,
  FIXTURE_GEOHASH_DETAIL,
} from "../support/commands";

describe("UC009 — Estratégias Growth", () => {
  describe("Success Criteria", () => {
    beforeEach(() => {
      setupTrpcStubs({
        "frente.ranking": FIXTURE_RANKING,
        "geohash.getById": FIXTURE_GEOHASH_DETAIL,
        "session.get": null,
      });
      cy.visit("/frentes");
    });

    it("PS01: renderiza header com título e contagem de geohashes", () => {
      cy.contains("Estratégias Growth").should("be.visible");
      cy.contains("2 geohashes").should("be.visible");
    });

    it("PS01: sidebar lista geohashes GROWTH rankados por prioridade", () => {
      // First geohash (rank 1)
      cy.contains("6gkzm9").should("be.visible");
      cy.contains("Setor Bueno").should("be.visible");

      // Second geohash (rank 2)
      cy.contains("6gkzmd").should("be.visible");
    });

    it("PS01: cada item mostra priority badge (P1/P2)", () => {
      cy.contains("P1").should("be.visible");
      cy.contains("P2").should("be.visible");
    });

    it("PS02: clicar num geohash exibe painel de diagnóstico", () => {
      // Click first geohash in sidebar
      cy.contains("button", "6gkzm9").click();

      // Wait for detail to load and render
      cy.contains("Setor Bueno").should("be.visible");
      cy.contains("GROWTH").should("be.visible");
    });

    it("PS02: painel exibe 4 cards de pilar", () => {
      cy.contains("button", "6gkzm9").click();

      cy.contains("Percepção").should("be.visible");
      cy.contains("Concorrência").should("be.visible");
      cy.contains("Infraestrutura").should("be.visible");
      cy.contains("Comportamento").should("be.visible");
    });

    it("PS03: painel exibe recomendação IA", () => {
      cy.contains("button", "6gkzm9").click();

      cy.contains("Recomendação IA").should("be.visible");
      // With healthy fixtures, recommendation should be ATACAR (v5)
      cy.contains("ATACAR").should("be.visible");
    });

    it("busca filtra geohashes na sidebar", () => {
      cy.get("input[placeholder*='Buscar']").type("Centro");

      // Only geohash in Centro should remain
      cy.contains("6gkzmd").should("be.visible");
      cy.contains("6gkzm9").should("not.exist");
    });

    it("limpar busca restaura lista completa", () => {
      cy.get("input[placeholder*='Buscar']").type("Centro");
      cy.get("input[placeholder*='Buscar']").clear();

      cy.contains("6gkzm9").should("be.visible");
      cy.contains("6gkzmd").should("be.visible");
    });
  });

  describe("Failure Criteria", () => {
    it("PF01: exibe mensagem quando não há geohashes no quadrante", () => {
      setupTrpcStubs({
        "frente.ranking": {
          GROWTH: [],
          UPSELL: [],
          RETENCAO: [],
          GROWTH_RETENCAO: [],
        },
        "session.get": null,
      });
      cy.visit("/frentes");

      cy.contains("0 geohashes").should("be.visible");
    });
  });
});
