/**
 * Testes de Componente — RecIA
 *
 * Verifica renderização de recomendação IA para cada decisão:
 * ATIVAR, AGUARDAR, BLOQUEADO.
 */

import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import RecIA from "./RecIA.vue";
import type { AIRec } from "../../composables/useDiagnostico";

// Stub lucide-vue-next icons
vi.mock("lucide-vue-next", () => ({
  Brain: { template: "<span>Brain</span>" },
  CheckCircle2: { template: "<span>CheckCircle2</span>" },
  AlertTriangle: { template: "<span>AlertTriangle</span>" },
  TrendingDown: { template: "<span>TrendingDown</span>" },
  ShoppingBag: { template: "<span>ShoppingBag</span>" },
  Zap: { template: "<span>Zap</span>" },
}));

function makeRec(overrides: Partial<AIRec> = {}): AIRec {
  return {
    decisao: "ATIVAR",
    decisaoColor: "#16A34A",
    canal: "Digital (dominante — priorizar 80% da verba)",
    abordagem:
      "Oferta de totalização (Fibra + Móvel + Streaming). Perfil premium.",
    raciocinio:
      "Decisão baseada em: percepção excelente; alta oportunidade de mercado.",
    ...overrides,
  };
}

describe("RecIA", () => {
  it("renderiza header 'Recomendação IA'", () => {
    const wrapper = mount(RecIA, { props: { rec: makeRec() } });
    expect(wrapper.text()).toContain("Recomendação IA");
  });

  it("renderiza label 'Gerado automaticamente'", () => {
    const wrapper = mount(RecIA, { props: { rec: makeRec() } });
    expect(wrapper.text()).toContain("Gerado automaticamente");
  });

  it("exibe decisão ATIVAR", () => {
    const wrapper = mount(RecIA, {
      props: { rec: makeRec({ decisao: "ATIVAR" }) },
    });
    expect(wrapper.text()).toContain("ATIVAR");
  });

  it("exibe decisão AGUARDAR", () => {
    const wrapper = mount(RecIA, {
      props: { rec: makeRec({ decisao: "AGUARDAR", decisaoColor: "#D97706" }) },
    });
    expect(wrapper.text()).toContain("AGUARDAR");
  });

  it("exibe decisão BLOQUEADO", () => {
    const wrapper = mount(RecIA, {
      props: {
        rec: makeRec({ decisao: "BLOQUEADO", decisaoColor: "#DC2626" }),
      },
    });
    expect(wrapper.text()).toContain("BLOQUEADO");
  });

  it("exibe canal recomendado", () => {
    const wrapper = mount(RecIA, {
      props: {
        rec: makeRec({ canal: "Loja + canal complementar" }),
      },
    });
    expect(wrapper.text()).toContain("Loja + canal complementar");
  });

  it("exibe abordagem comercial", () => {
    const wrapper = mount(RecIA, {
      props: {
        rec: makeRec({ abordagem: "Oferta de entrada com preço competitivo." }),
      },
    });
    expect(wrapper.text()).toContain("Oferta de entrada com preço competitivo.");
  });

  it("exibe raciocínio completo", () => {
    const wrapper = mount(RecIA, {
      props: {
        rec: makeRec({
          raciocinio:
            "Decisão baseada em: fibra bloqueada; percepção crítica.",
        }),
      },
    });
    expect(wrapper.text()).toContain("fibra bloqueada");
    expect(wrapper.text()).toContain("percepção crítica");
  });

  it("aplica cor da decisão no texto da decisão", () => {
    const wrapper = mount(RecIA, {
      props: {
        rec: makeRec({ decisao: "BLOQUEADO", decisaoColor: "#DC2626" }),
      },
    });
    const html = wrapper.html();
    expect(html).toContain("#DC2626");
    expect(html).toContain("BLOQUEADO");
  });

  it("renderiza as 4 seções: Decisão, Canal, Abordagem, Raciocínio", () => {
    const wrapper = mount(RecIA, { props: { rec: makeRec() } });
    const text = wrapper.text();

    expect(text).toContain("Decisão");
    expect(text).toContain("Canal Recomendado");
    expect(text).toContain("Abordagem Comercial");
    expect(text).toContain("Raciocínio");
  });
});
