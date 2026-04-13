/**
 * Testes de Integração — UC009: Diagnóstico Growth Completo
 *
 * Fluxo end-to-end: dados da API → buildDiagnostico → avaliar 4 pilares
 * → gerarRec → verificação de critérios UC009.
 *
 * Testa TODOS os limiares de RN009-05/06/07/08 com cenários realistas
 * que simulam geohashes em diferentes condições de mercado.
 */

import {
  avaliarPercep,
  avaliarConcorrencia,
  avaliarInfra,
  avaliarComportamento,
  gerarRec,
  buildDiagnostico,
  buildCamada2,
  type DiagnosticoGrowth,
  type Camada2Info,
  type PilarResult,
  type AIRec,
  SIG_STYLES,
} from "../../composables/useDiagnostico";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fullFlow(
  apiDetail: Parameters<typeof buildDiagnostico>[0],
  apiCamada2: Parameters<typeof buildCamada2>[0],
): { pilares: PilarResult[]; rec: AIRec } {
  const diag = buildDiagnostico(apiDetail);
  const c2 = buildCamada2(apiCamada2);
  const pilares = [
    avaliarPercep(diag),
    avaliarConcorrencia(diag),
    avaliarInfra(c2),
    avaliarComportamento(diag),
  ];
  const rec = gerarRec(pilares, diag, c2);
  return { pilares, rec };
}

// ─── RN009-05: Limiares dos 4 Pilares ──────────────────────────────────────

describe("UC009 — RN009-05: Avaliação dos 4 Pilares", () => {
  describe("Pilar 01 — Percepção", () => {
    it("OK: scoreOokla >= 8.0 E taxaChamados < 3%", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.5 },
        { camada2: null },
      );
      expect(pilares[0].signal).toBe("ok");
    });

    it("Crítico: scoreOokla < 6.0", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 5.5, tim_score: 7.0, claro_score: 6.5 },
        { camada2: null },
      );
      expect(pilares[0].signal).toBe("critico");
      expect(pilares[0].metricas[0].signal).toBe("critico");
    });

    it("Alerta: scoreOokla 6.0-7.9", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 7.0, tim_score: 5.0, claro_score: 4.0 },
        { camada2: null },
      );
      expect(pilares[0].metricas[0].signal).toBe("alerta");
    });

    it("boundary: scoreOokla exatamente 8.0 é OK", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.0, tim_score: 5.0, claro_score: 4.0 },
        { camada2: null },
      );
      expect(pilares[0].metricas[0].signal).toBe("ok");
    });

    it("boundary: scoreOokla exatamente 6.0 é alerta (não crítico)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 6.0, tim_score: 5.0, claro_score: 4.0 },
        { camada2: null },
      );
      expect(pilares[0].metricas[0].signal).toBe("alerta");
    });
  });

  describe("Pilar 02 — Concorrência", () => {
    it("OK: sharePenetracao < 20% (alta oportunidade) e deltaVsLider > 0", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
        { camada2: null },
      );
      expect(pilares[1].signal).toBe("ok");
    });

    it("Crítico: sharePenetracao > 40% (mercado saturado)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 45, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
        { camada2: null },
      );
      expect(pilares[1].metricas[0].signal).toBe("critico");
    });

    it("Crítico: deltaVsLider < -1.0 (desvantagem significativa)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 5.0, tim_score: 9.0, claro_score: 6.0 },
        { camada2: null },
      );
      // delta = 5.0 - 9.0 = -4.0
      expect(pilares[1].metricas[1].signal).toBe("critico");
    });

    it("boundary: sharePenetracao exatamente 20 é alerta", () => {
      const { pilares } = fullFlow(
        { share_vivo: 20, vivo_score: 8.0, tim_score: 5.0, claro_score: 4.0 },
        { camada2: null },
      );
      expect(pilares[1].metricas[0].signal).toBe("alerta");
    });
  });

  describe("Pilar 03 — Infraestrutura", () => {
    it("OK: fibra SAUDAVEL + movel SAUDAVEL", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5 },
        {
          camada2: {
            fibra: { classification: "SAUDAVEL" },
            movel: { classification: "SAUDAVEL" },
          },
        },
      );
      expect(pilares[2].signal).toBe("ok");
    });

    it("Crítico: fibra EXPANSAO_NOVA_AREA (sem cobertura)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5 },
        {
          camada2: {
            fibra: { classification: "EXPANSAO_NOVA_AREA" },
            movel: { classification: "SAUDAVEL" },
          },
        },
      );
      expect(pilares[2].metricas[0].signal).toBe("critico");
    });

    it("Alerta: fibra AUMENTO_CAPACIDADE (gargalo)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5 },
        {
          camada2: {
            fibra: { classification: "AUMENTO_CAPACIDADE" },
            movel: { classification: "SAUDAVEL" },
          },
        },
      );
      expect(pilares[2].metricas[0].signal).toBe("alerta");
    });

    it("Crítico: movel MELHORA_QUALIDADE (qualidade comprometida)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5 },
        {
          camada2: {
            fibra: { classification: "SAUDAVEL" },
            movel: { classification: "MELHORA_QUALIDADE" },
          },
        },
      );
      expect(pilares[2].metricas[1].signal).toBe("critico");
    });

    it("Alerta: movel EXPANSAO_5G (cobertura em andamento)", () => {
      const { pilares } = fullFlow(
        { share_vivo: 15, vivo_score: 8.5 },
        {
          camada2: {
            fibra: { classification: "SAUDAVEL" },
            movel: { classification: "EXPANSAO_5G" },
          },
        },
      );
      expect(pilares[2].metricas[1].signal).toBe("alerta");
    });
  });

  describe("Pilar 04 — Comportamento (stubs — dados não disponíveis no banco)", () => {
    it("buildDiagnostico usa defaults seguros para campos ausentes", () => {
      const d = buildDiagnostico({ share_vivo: 15, vivo_score: 8.0 });

      expect(d.arpuRelativo).toBe(1.0); // stub
      expect(d.canalDominante).toBe("Digital"); // stub
      expect(d.canalPct).toBe(50); // stub
      expect(d.taxaChamados).toBe(0); // stub
    });
  });
});

// ─── RN009-06: Árvore de Decisão IA ────────────────────────────────────────

describe("UC009 — RN009-06: Árvore Decisão Recomendação IA", () => {
  it("BLOQUEADO: fibra EXPANSAO_NOVA_AREA (independente de outros fatores)", () => {
    const { rec } = fullFlow(
      { share_vivo: 10, vivo_score: 9.0, tim_score: 5.0, claro_score: 4.0 },
      { camada2: { fibra: { classification: "EXPANSAO_NOVA_AREA" }, movel: { classification: "SAUDAVEL" } } },
    );
    expect(rec.decisao).toBe("BLOQUEADO");
    expect(rec.decisaoColor).toBe("#DC2626");
  });

  it("BLOQUEADO: percepção crítica (scoreOokla < 6) E concorrência crítica (delta < -1)", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 4.0, tim_score: 9.0, claro_score: 8.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "SAUDAVEL" } } },
    );
    // percepção: 4.0 < 6 → crítica; delta: 4.0 - 9.0 = -5 < -1 → crítica
    expect(rec.decisao).toBe("BLOQUEADO");
  });

  it("AGUARDAR: infraestrutura gargalo (fibra AUMENTO_CAPACIDADE)", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
      { camada2: { fibra: { classification: "AUMENTO_CAPACIDADE" }, movel: { classification: "SAUDAVEL" } } },
    );
    expect(rec.decisao).toBe("AGUARDAR");
    expect(rec.decisaoColor).toBe("#D97706");
  });

  it("AGUARDAR: infraestrutura gargalo (movel MELHORA_QUALIDADE)", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "MELHORA_QUALIDADE" } } },
    );
    expect(rec.decisao).toBe("AGUARDAR");
  });

  it("AGUARDAR: percepção crítica isolada (scoreOokla < 6, sem concorrência crítica)", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 5.0, tim_score: 5.5, claro_score: 4.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "SAUDAVEL" } } },
    );
    // delta: 5.0 - 5.5 = -0.5 (alerta, não crítico)
    expect(rec.decisao).toBe("AGUARDAR");
  });

  it("AGUARDAR: concorrência crítica isolada (delta < -1)", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 7.0, tim_score: 9.0, claro_score: 8.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "SAUDAVEL" } } },
    );
    // delta: 7.0 - 9.0 = -2.0 < -1 → concorrência crítica
    // percepção: 7.0 >= 6 → alerta (não crítica) → NOT bloqueado
    expect(rec.decisao).toBe("AGUARDAR");
  });

  it("ATACAR: todas condições saudáveis", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.5 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "SAUDAVEL" } } },
    );
    expect(rec.decisao).toBe("ATACAR");
    expect(rec.decisaoColor).toBe("#16A34A");
  });

  it("ATACAR: movel EXPANSAO_5G (alerta, não gargalo) e percepção OK", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.5 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "EXPANSAO_5G" } } },
    );
    // EXPANSAO_5G não é considerado gargalo (não é MELHORA_QUALIDADE)
    expect(rec.decisao).toBe("ATACAR");
  });
});

// ─── RN009-07: Lógica Abordagem Comercial ──────────────────────────────────

describe("UC009 — RN009-07: Abordagem Comercial", () => {
  it("fibra bloqueada: foco exclusivo em móvel", () => {
    const { rec } = fullFlow(
      { share_vivo: 10, vivo_score: 9.0, tim_score: 5.0, claro_score: 4.0 },
      { camada2: { fibra: { classification: "EXPANSAO_NOVA_AREA" }, movel: { classification: "SAUDAVEL" } } },
    );
    expect(rec.abordagem).toContain("Não ativar growth de fibra");
    expect(rec.abordagem).toContain("móvel");
  });

  it("fibra gargalo + movel saudável: priorizar aquisição via móvel", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
      { camada2: { fibra: { classification: "AUMENTO_CAPACIDADE" }, movel: { classification: "SAUDAVEL" } } },
    );
    expect(rec.abordagem).toContain("móvel");
  });

  it("movel problema + fibra saudável: priorizar oferta de fibra", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "MELHORA_QUALIDADE" } } },
    );
    expect(rec.abordagem).toContain("fibra");
  });

  it("ambos com restrição: aguardar resolução infraestrutura", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
      { camada2: { fibra: { classification: "AUMENTO_CAPACIDADE" }, movel: { classification: "MELHORA_QUALIDADE" } } },
    );
    expect(rec.abordagem).toContain("Ambas as redes");
  });

  it("expansão 5G em andamento: abordar com fibra como principal", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "EXPANSAO_5G" } } },
    );
    expect(rec.abordagem).toContain("fibra como produto principal");
  });

  it("infra saudável + ARPU premium (> 1.1): oferta de totalização", () => {
    // buildDiagnostico returns arpuRelativo=1.0 (stub), so direct DiagnosticoGrowth
    const d: DiagnosticoGrowth = {
      scoreOokla: 8.5, taxaChamados: 1, sharePenetracao: 15,
      deltaVsLider: 1.5, arpuRelativo: 1.3, canalDominante: "Digital", canalPct: 55,
    };
    const c2: Camada2Info = {
      fibra: { classification: "SAUDAVEL" },
      movel: { classification: "SAUDAVEL" },
    };
    const pilares = [avaliarPercep(d), avaliarConcorrencia(d), avaliarInfra(c2), avaliarComportamento(d)];
    const rec = gerarRec(pilares, d, c2);

    expect(rec.abordagem).toContain("totalização");
  });

  it("infra saudável + ARPU sensível (< 0.9): oferta de entrada", () => {
    const d: DiagnosticoGrowth = {
      scoreOokla: 8.5, taxaChamados: 1, sharePenetracao: 15,
      deltaVsLider: 1.5, arpuRelativo: 0.7, canalDominante: "Digital", canalPct: 55,
    };
    const c2: Camada2Info = {
      fibra: { classification: "SAUDAVEL" },
      movel: { classification: "SAUDAVEL" },
    };
    const pilares = [avaliarPercep(d), avaliarConcorrencia(d), avaliarInfra(c2), avaliarComportamento(d)];
    const rec = gerarRec(pilares, d, c2);

    expect(rec.abordagem).toContain("entrada");
    expect(rec.abordagem).toContain("sensível");
  });
});

// ─── RN009-08: Worst-Signal Aggregation ────────────────────────────────────

describe("UC009 — RN009-08: Worst-Signal Aggregation", () => {
  it("pilar com critico + ok resulta em critico", () => {
    const { pilares } = fullFlow(
      { share_vivo: 15, vivo_score: 5.0, tim_score: 3.0, claro_score: 2.0 },
      { camada2: null },
    );
    // scoreOokla 5.0 < 6 → critico; taxaChamados 0 < 3 → ok
    expect(pilares[0].metricas[0].signal).toBe("critico");
    expect(pilares[0].metricas[1].signal).toBe("ok");
    expect(pilares[0].signal).toBe("critico"); // worst wins
  });

  it("pilar com alerta + ok resulta em alerta", () => {
    const { pilares } = fullFlow(
      { share_vivo: 15, vivo_score: 7.0, tim_score: 3.0, claro_score: 2.0 },
      { camada2: null },
    );
    // scoreOokla 7.0 → alerta; taxaChamados 0 → ok
    expect(pilares[0].signal).toBe("alerta");
  });

  it("pilar com ok + ok resulta em ok", () => {
    const { pilares } = fullFlow(
      { share_vivo: 15, vivo_score: 9.0, tim_score: 3.0, claro_score: 2.0 },
      { camada2: null },
    );
    expect(pilares[0].signal).toBe("ok");
  });

  it("estilos SIG_STYLES definidos para ok, alerta e critico", () => {
    expect(SIG_STYLES.ok.label).toBe("OK");
    expect(SIG_STYLES.alerta.label).toBe("Alerta");
    expect(SIG_STYLES.critico.label).toBe("Crítico");

    // Cores conforme RN009-08
    expect(SIG_STYLES.ok.bg).toBe("#F0FDF4");
    expect(SIG_STYLES.alerta.bg).toBe("#FFFBEB");
    expect(SIG_STYLES.critico.bg).toBe("#FEF2F2");
  });
});

// ─── Cenários Realistas End-to-End ─────────────────────────────────────────

describe("UC009 — Cenários Realistas E2E", () => {
  it("Geohash Growth saudável em Goiânia → ATACAR com oferta totalização", () => {
    const { pilares, rec } = fullFlow(
      { share_vivo: 18, vivo_score: 8.5, tim_score: 7.0, claro_score: 6.5 },
      {
        camada2: {
          fibra: { classification: "SAUDAVEL" },
          movel: { classification: "SAUDAVEL" },
        },
      },
    );

    expect(pilares[0].signal).toBe("ok"); // percepção
    expect(pilares[1].signal).toBe("ok"); // concorrência
    expect(pilares[2].signal).toBe("ok"); // infra
    expect(rec.decisao).toBe("ATACAR");
    expect(rec.raciocinio).toContain("percepção excelente");
  });

  it("Geohash com fibra bloqueada e Vivo líder → BLOQUEADO, foco móvel", () => {
    const { pilares, rec } = fullFlow(
      { share_vivo: 12, vivo_score: 9.0, tim_score: 6.0, claro_score: 5.0 },
      {
        camada2: {
          fibra: { classification: "EXPANSAO_NOVA_AREA" },
          movel: { classification: "SAUDAVEL" },
        },
      },
    );

    expect(pilares[2].metricas[0].signal).toBe("critico"); // fibra
    expect(rec.decisao).toBe("BLOQUEADO");
    expect(rec.abordagem).toContain("Não ativar growth de fibra");
    expect(rec.raciocinio).toContain("fibra bloqueada");
  });

  it("Geohash com Vivo desvantagem técnica severa → AGUARDAR", () => {
    const { rec } = fullFlow(
      { share_vivo: 15, vivo_score: 6.5, tim_score: 9.5, claro_score: 8.0 },
      { camada2: { fibra: { classification: "SAUDAVEL" }, movel: { classification: "SAUDAVEL" } } },
    );
    // delta: 6.5 - 9.5 = -3.0 → concorrência crítica
    expect(rec.decisao).toBe("AGUARDAR");
    expect(rec.raciocinio).toContain("desvantagem técnica");
  });

  it("Geohash degradado em tudo → BLOQUEADO", () => {
    const { rec } = fullFlow(
      { share_vivo: 50, vivo_score: 3.0, tim_score: 8.0, claro_score: 7.5 },
      {
        camada2: {
          fibra: { classification: "AUMENTO_CAPACIDADE" },
          movel: { classification: "MELHORA_QUALIDADE" },
        },
      },
    );
    // percCritica (3.0 < 6) + concCritica (3.0 - 8.0 = -5.0 < -1)
    expect(rec.decisao).toBe("BLOQUEADO");
  });
});
