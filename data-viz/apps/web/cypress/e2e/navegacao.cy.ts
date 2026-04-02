/**
 * E2E — Navegação entre páginas
 *
 * Verifica que AppHeader renderiza corretamente, navegação funciona
 * entre as 3 abas, e indicador de aba ativa é exibido.
 */

import { setupTrpcStubs, FIXTURE_GEOHASH_LIST, FIXTURE_RANKING, FIXTURE_LOCATIONS, FIXTURE_BAIRRO_LIST } from "../support/commands";

const allStubs = {
  "geohash.list": FIXTURE_GEOHASH_LIST,
  "session.get": null,
  "frente.ranking": FIXTURE_RANKING,
  "meta.locations": FIXTURE_LOCATIONS,
  "bairro.list": FIXTURE_BAIRRO_LIST,
  "meta.availablePeriods": ["2025-01", "2024-12", "2024-11"],
};

describe("Navegação", () => {
  beforeEach(() => {
    setupTrpcStubs(allStubs);
  });

  it("AppHeader renderiza com branding GeoIntelligence e badge Live Data", () => {
    cy.visit("/frentes");
    cy.contains("Geo").should("be.visible");
    cy.contains("Intelligence").should("be.visible");
    cy.contains("Live Data").should("be.visible");
  });

  it("exibe 3 abas de navegação", () => {
    cy.visit("/frentes");
    cy.get("[data-cy=nav-mapa]").should("exist");
    cy.get("[data-cy=nav-frentes]").should("exist");
    cy.get("[data-cy=nav-bairros]").should("exist");
  });

  it("navega de /frentes para /bairros clicando na aba", () => {
    cy.visit("/frentes");
    cy.get("[data-cy=nav-bairros]").click();
    cy.url().should("include", "/bairros");
    cy.contains("Visão por Bairro").should("be.visible");
  });

  it("navega de /bairros para /frentes clicando na aba", () => {
    cy.visit("/bairros");
    cy.get("[data-cy=nav-frentes]").click();
    cy.url().should("include", "/frentes");
    cy.contains("Estratégias Growth").should("be.visible");
  });

  it("navega para Mapa Estratégico (home)", () => {
    cy.visit("/frentes");
    cy.get("[data-cy=nav-mapa]").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("aba ativa tem indicador visual (barra inferior)", () => {
    cy.visit("/frentes");
    // Active tab should have the gradient bar (span inside the active link)
    cy.get("[data-cy=nav-frentes]").find("span.absolute").should("exist");
    // Inactive tabs should NOT have the indicator
    cy.get("[data-cy=nav-bairros]").find("span.absolute").should("not.exist");
  });
});
