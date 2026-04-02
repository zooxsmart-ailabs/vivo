/**
 * Testes de Componente — PilarCard
 *
 * Verifica renderização condicional por sinal (OK/Alerta/Crítico),
 * display de métricas e labels de infraestrutura.
 */

import { computed } from "vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import { SIG_STYLES, type PilarResult } from "../../composables/useDiagnostico";

// Stub Nuxt auto-imported `computed` for the SFC
vi.stubGlobal("computed", computed);

import PilarCard from "./PilarCard.vue";

// Stub lucide-vue-next icons
vi.mock("lucide-vue-next", () => ({
  Star: { template: "<span>Star</span>" },
  TrendingUp: { template: "<span>TrendingUp</span>" },
  Layers: { template: "<span>Layers</span>" },
  ShoppingBag: { template: "<span>ShoppingBag</span>" },
}));

function makePilar(overrides: Partial<PilarResult> = {}): PilarResult {
  return {
    id: "01",
    title: "Percepção",
    signal: "ok",
    metricas: [
      {
        label: "Score Ookla",
        value: "8.5",
        formula: "Score SpeedTest Vivo no Geohash",
        signal: "ok",
        detail: "≥ 8.0 — Excelente",
      },
      {
        label: "Vol. Chamados",
        value: "2.0%",
        formula: "(RAC + SAC 30d) / Base Ativa Vivo",
        signal: "ok",
        detail: "< 3% — Saudável",
      },
    ],
    ...overrides,
  };
}

describe("PilarCard", () => {
  it("renderiza título e ID do pilar", () => {
    const wrapper = mount(PilarCard, { props: { pilar: makePilar() } });

    expect(wrapper.text()).toContain("Percepção");
    expect(wrapper.text()).toContain("01");
  });

  it("renderiza label do sinal (OK/Alerta/Crítico)", () => {
    const wrapper = mount(PilarCard, { props: { pilar: makePilar({ signal: "ok" }) } });
    expect(wrapper.text()).toContain("OK");

    const wrapperAlerta = mount(PilarCard, {
      props: { pilar: makePilar({ signal: "alerta" }) },
    });
    expect(wrapperAlerta.text()).toContain("Alerta");

    const wrapperCritico = mount(PilarCard, {
      props: { pilar: makePilar({ signal: "critico" }) },
    });
    expect(wrapperCritico.text()).toContain("Crítico");
  });

  it("renderiza ambas as métricas com label, valor e detalhe", () => {
    const wrapper = mount(PilarCard, { props: { pilar: makePilar() } });

    expect(wrapper.text()).toContain("Score Ookla");
    expect(wrapper.text()).toContain("8.5");
    expect(wrapper.text()).toContain("≥ 8.0 — Excelente");

    expect(wrapper.text()).toContain("Vol. Chamados");
    expect(wrapper.text()).toContain("2.0%");
  });

  it("renderiza fórmula de cada métrica", () => {
    const wrapper = mount(PilarCard, { props: { pilar: makePilar() } });

    expect(wrapper.text()).toContain("Score SpeedTest Vivo no Geohash");
    expect(wrapper.text()).toContain("(RAC + SAC 30d) / Base Ativa Vivo");
  });

  it("traduz classificação de infraestrutura para label legível", () => {
    const infraPilar = makePilar({
      id: "03",
      title: "Infraestrutura",
      metricas: [
        {
          label: "Fibra (Status)",
          value: "AUMENTO_CAPACIDADE",
          formula: "...",
          signal: "alerta",
          detail: "Controlado",
        },
        {
          label: "Móvel (Status)",
          value: "SAUDAVEL",
          formula: "...",
          signal: "ok",
          detail: "Growth Liberado",
        },
      ],
    });

    const wrapper = mount(PilarCard, { props: { pilar: infraPilar } });

    expect(wrapper.text()).toContain("Aumento de Capacidade");
    expect(wrapper.text()).toContain("Saudável");
  });

  it("aplica cores de fundo por sinal nas métricas", () => {
    const pilar = makePilar({
      metricas: [
        {
          label: "M1",
          value: "V1",
          formula: "F1",
          signal: "critico",
          detail: "D1",
        },
        {
          label: "M2",
          value: "V2",
          formula: "F2",
          signal: "ok",
          detail: "D2",
        },
      ],
    });

    const wrapper = mount(PilarCard, { props: { pilar } });
    const metricDivs = wrapper.findAll(".rounded-lg.border");

    expect(metricDivs[0].attributes("style")).toContain(
      SIG_STYLES.critico.bg,
    );
    expect(metricDivs[1].attributes("style")).toContain(SIG_STYLES.ok.bg);
  });
});
