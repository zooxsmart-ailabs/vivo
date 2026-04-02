/**
 * E2E — UC001/UC002/UC003: Mapa Estratégico + FilterBar
 *
 * Testa interações do FilterBar na página do mapa:
 * - Toggle de quadrantes (UC002)
 * - Filtro de tecnologia (UC003)
 * - Contadores visíveis/em risco (UC001-PS03)
 *
 * Nota: Google Maps não é testado (requer API key).
 * Foco no FilterBar e contadores deriváveis.
 */

import { setupTrpcStubs, FIXTURE_GEOHASH_LIST } from "../support/commands";

describe("UC001-003 — FilterBar no Mapa", () => {
  beforeEach(() => {
    setupTrpcStubs({
      "geohash.list": FIXTURE_GEOHASH_LIST,
      "session.get": null,
      "meta.availablePeriods": ["2025-01"],
    });
    cy.visit("/");
  });

  describe("UC001 — Contadores", () => {
    it("PS03: exibe contadores 'X/Y visíveis'", () => {
      cy.get("[data-cy=counter-visible]").should("contain", "visíveis");
    });

    it("PS03: exibe contador 'em risco' quando há geohashes RETENCAO", () => {
      cy.get("[data-cy=counter-risco]").should("contain", "em risco");
    });
  });

  describe("UC002 — Filtro de Quadrante", () => {
    it("PS01: renderiza 4 botões de quadrante", () => {
      cy.get("[data-cy=quadrant-GROWTH]").should("be.visible");
      cy.get("[data-cy=quadrant-UPSELL]").should("be.visible");
      cy.get("[data-cy=quadrant-RETENCAO]").should("be.visible");
      cy.get("[data-cy=quadrant-GROWTH_RETENCAO]").should("be.visible");
    });

    it("PS01: toggle de quadrante altera estilo do botão", () => {
      // Initially all active (have white text)
      cy.get("[data-cy=quadrant-GROWTH]").should("have.class", "text-white");

      // Click to deactivate
      cy.get("[data-cy=quadrant-GROWTH]").click();
      cy.get("[data-cy=quadrant-GROWTH]").should(
        "have.class",
        "text-slate-400",
      );

      // Click again to reactivate
      cy.get("[data-cy=quadrant-GROWTH]").click();
      cy.get("[data-cy=quadrant-GROWTH]").should("have.class", "text-white");
    });

    it("botões exibem labels corretos", () => {
      cy.get("[data-cy=quadrant-GROWTH]").should("contain", "Growth");
      cy.get("[data-cy=quadrant-UPSELL]").should("contain", "Upsell");
      cy.get("[data-cy=quadrant-RETENCAO]").should("contain", "Retenção");
      cy.get("[data-cy=quadrant-GROWTH_RETENCAO]").should(
        "contain",
        "Growth+Retenção",
      );
    });
  });

  describe("UC003 — Filtro de Tecnologia", () => {
    it("PS01: renderiza 4 abas de tecnologia", () => {
      cy.get("[data-cy=tech-TODOS]").should("be.visible");
      cy.get("[data-cy=tech-FIBRA]").should("be.visible");
      cy.get("[data-cy=tech-MOVEL]").should("be.visible");
      cy.get("[data-cy=tech-AMBOS]").should("be.visible");
    });

    it("PS01: aba TODOS está ativa por default", () => {
      cy.get("[data-cy=tech-TODOS]").should("have.class", "bg-white");
    });

    it("PS01: clicar em FIBRA ativa a aba e desativa TODOS", () => {
      cy.get("[data-cy=tech-FIBRA]").click();
      cy.get("[data-cy=tech-FIBRA]").should("have.class", "bg-white");
      cy.get("[data-cy=tech-TODOS]").should("not.have.class", "bg-white");
    });

    it("abas exibem labels corretos", () => {
      cy.get("[data-cy=tech-TODOS]").should("contain", "Todos");
      cy.get("[data-cy=tech-FIBRA]").should("contain", "Fibra");
      cy.get("[data-cy=tech-MOVEL]").should("contain", "Móvel");
      cy.get("[data-cy=tech-AMBOS]").should("contain", "F+M");
    });
  });
});
