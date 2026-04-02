/**
 * E2E — UC010: Consultar Visão por Bairro
 *
 * Critérios verificados:
 * - PS01: Lista bairros rankada com KPIs
 * - PS02: Modal detalhe ao clicar em um bairro
 * - PF01: Mensagem vazia quando sem bairros
 * - Filtros de localização (estado/cidade) e quadrante
 * - Tabela com colunas corretas
 */

import {
  setupTrpcStubs,
  FIXTURE_LOCATIONS,
  FIXTURE_BAIRRO_LIST,
} from "../support/commands";

describe("UC010 — Visão por Bairro", () => {
  describe("Success Criteria", () => {
    beforeEach(() => {
      setupTrpcStubs({
        "meta.locations": FIXTURE_LOCATIONS,
        "bairro.list": FIXTURE_BAIRRO_LIST,
        "session.get": null,
      });
      cy.visit("/bairros");
    });

    it("PS01: renderiza título da página", () => {
      cy.contains("Visão por Bairro").should("be.visible");
    });

    it("PS01: tabela exibe bairros com KPIs", () => {
      cy.contains("Setor Bueno").should("be.visible");
      cy.contains("Centro").should("be.visible");
    });

    it("PS01: tabela mostra colunas de share e satisfação", () => {
      // Share values from fixtures
      cy.contains("22.5").should("be.visible"); // Setor Bueno avg_share
      // Satisfaction values
      cy.contains("7.8").should("be.visible"); // Setor Bueno avg_satisfaction
    });

    it("PS01: exibe quadrante dominante de cada bairro", () => {
      cy.contains("GROWTH").should("be.visible");
      cy.contains("RETENCAO").should("be.visible");
    });

    it("PS01: primeiro bairro tem rank #1 destacado", () => {
      // First row should show rank 1
      cy.get("table tbody tr").first().should("contain", "1");
    });

    it("PS02: clicar num bairro abre modal de detalhe", () => {
      cy.contains("tr", "Setor Bueno").click();

      // Modal should show KPIs
      cy.contains("15").should("be.visible"); // total_geohashes
    });

    it("PS02: modal exibe distribuição de quadrantes", () => {
      cy.contains("tr", "Setor Bueno").click();

      // Quadrant counts from fixture
      cy.contains("GROWTH").should("be.visible");
    });

    it("fechar modal clicando no X", () => {
      cy.contains("tr", "Setor Bueno").click();

      // Close button (×)
      cy.get("button").contains("×").click();

      // Modal should be gone — no overlay visible
      // Check that the modal overlay is no longer in the DOM
      cy.get(".fixed.inset-0").should("not.exist");
    });
  });

  describe("Filtros de Localização (UC008)", () => {
    beforeEach(() => {
      setupTrpcStubs({
        "meta.locations": FIXTURE_LOCATIONS,
        "bairro.list": FIXTURE_BAIRRO_LIST,
        "session.get": null,
      });
      cy.visit("/bairros");
    });

    it("renderiza dropdown de estado com opções", () => {
      cy.get("select").first().should("exist");
      cy.get("select").first().find("option").should("have.length.greaterThan", 1);
    });

    it("selecionar estado popula dropdown de cidade", () => {
      cy.get("select").first().select("GO");
      cy.get("select").eq(1).find("option").should("contain", "Goiânia");
    });
  });

  describe("Failure Criteria", () => {
    it("PF01: exibe estado vazio quando não há bairros", () => {
      setupTrpcStubs({
        "meta.locations": FIXTURE_LOCATIONS,
        "bairro.list": { items: [], total: 0 },
        "session.get": null,
      });
      cy.visit("/bairros");

      // Table should be empty or show "no data" message
      cy.get("table tbody tr").should("have.length", 0);
    });
  });
});
