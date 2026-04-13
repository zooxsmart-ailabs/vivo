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
} from "./useDiagnostico";

// ─── Helper ─────────────────────────────────────────────────────────────────

function baseDiag(overrides: Partial<DiagnosticoGrowth> = {}): DiagnosticoGrowth {
  return {
    scoreOokla: 8.5,
    scoreOoklaMovel: null,
    scoreOoklaFibra: null,
    scoreHac: null,
    taxaChamados: 2,
    sharePenetracao: 15,
    deltaVsLider: 1.5,
    deltaVsLiderFibra: null,
    deltaVsLiderMovel: null,
    arpuRelativo: 1.2,
    canalDominante: "Digital",
    canalPct: 55,
    ...overrides,
  };
}

function healthyCamada2(): Camada2Info {
  return {
    fibra: { classification: "SAUDAVEL" },
    movel: { classification: "SAUDAVEL" },
  };
}

// ─── avaliarPercep ──────────────────────────────────────────────────────────

describe("avaliarPercep", () => {
  it("returns OK when scoreOokla >= 8 and taxaChamados < 3", () => {
    const r = avaliarPercep(baseDiag({ scoreOokla: 8.5, taxaChamados: 1 }));

    expect(r.id).toBe("01");
    expect(r.title).toBe("Percepção");
    expect(r.signal).toBe("ok");
    expect(r.metricas[0].signal).toBe("ok");
    expect(r.metricas[1].signal).toBe("ok");
  });

  it("returns alerta when scoreOokla is between 6 and 8", () => {
    const r = avaliarPercep(baseDiag({ scoreOokla: 7.0 }));

    expect(r.metricas[0].signal).toBe("alerta");
  });

  it("returns critico when scoreOokla < 6", () => {
    const r = avaliarPercep(baseDiag({ scoreOokla: 5.5 }));

    expect(r.signal).toBe("critico");
    expect(r.metricas[0].signal).toBe("critico");
  });

  it("returns alerta when taxaChamados is between 3 and 5", () => {
    const r = avaliarPercep(baseDiag({ taxaChamados: 4 }));

    expect(r.metricas[1].signal).toBe("alerta");
  });

  it("returns critico when taxaChamados > 5", () => {
    const r = avaliarPercep(baseDiag({ taxaChamados: 6 }));

    expect(r.metricas[1].signal).toBe("critico");
  });

  it("worst signal wins: critico overrides ok", () => {
    const r = avaliarPercep(baseDiag({ scoreOokla: 9, taxaChamados: 8 }));

    expect(r.metricas[0].signal).toBe("ok");
    expect(r.metricas[1].signal).toBe("critico");
    expect(r.signal).toBe("critico");
  });

  it("formats scoreOokla value with one decimal", () => {
    const r = avaliarPercep(baseDiag({ scoreOokla: 7.456 }));
    expect(r.metricas[0].value).toBe("7.5");
  });

  it("formats taxaChamados value as percentage", () => {
    const r = avaliarPercep(baseDiag({ taxaChamados: 3.2 }));
    expect(r.metricas[1].value).toBe("3.2%");
  });
});

// ─── avaliarConcorrencia ────────────────────────────────────────────────────

describe("avaliarConcorrencia", () => {
  it("returns OK when sharePenetracao < 20 and deltaVsLider > 0", () => {
    const r = avaliarConcorrencia(baseDiag({ sharePenetracao: 15, deltaVsLider: 2 }));

    expect(r.id).toBe("02");
    expect(r.title).toBe("Concorrência");
    expect(r.signal).toBe("ok");
  });

  it("returns alerta when sharePenetracao 20-40", () => {
    const r = avaliarConcorrencia(baseDiag({ sharePenetracao: 30 }));

    expect(r.metricas[0].signal).toBe("alerta");
  });

  it("returns critico when sharePenetracao > 40", () => {
    const r = avaliarConcorrencia(baseDiag({ sharePenetracao: 45 }));

    expect(r.metricas[0].signal).toBe("critico");
  });

  it("returns alerta when deltaVsLider is between -1 and 0", () => {
    const r = avaliarConcorrencia(baseDiag({ deltaVsLider: -0.5 }));

    expect(r.metricas[1].signal).toBe("alerta");
  });

  it("returns critico when deltaVsLider < -1", () => {
    const r = avaliarConcorrencia(baseDiag({ deltaVsLider: -2 }));

    expect(r.metricas[1].signal).toBe("critico");
  });

  it("formats positive deltaVsLider with + prefix", () => {
    const r = avaliarConcorrencia(baseDiag({ deltaVsLider: 1.5 }));
    expect(r.metricas[1].value).toBe("+1.5");
  });

  it("formats negative deltaVsLider without extra prefix", () => {
    const r = avaliarConcorrencia(baseDiag({ deltaVsLider: -0.8 }));
    expect(r.metricas[1].value).toBe("-0.8");
  });
});

// ─── avaliarInfra ───────────────────────────────────────────────────────────

describe("avaliarInfra", () => {
  it("returns OK for SAUDAVEL fibra and movel", () => {
    const r = avaliarInfra(healthyCamada2());

    expect(r.id).toBe("03");
    expect(r.title).toBe("Infraestrutura");
    expect(r.signal).toBe("ok");
  });

  it("returns alerta for AUMENTO_CAPACIDADE fibra", () => {
    const r = avaliarInfra({
      fibra: { classification: "AUMENTO_CAPACIDADE" },
      movel: { classification: "SAUDAVEL" },
    });

    expect(r.metricas[0].signal).toBe("alerta");
    expect(r.signal).toBe("alerta");
  });

  it("returns critico for EXPANSAO_NOVA_AREA fibra", () => {
    const r = avaliarInfra({
      fibra: { classification: "EXPANSAO_NOVA_AREA" },
      movel: { classification: "SAUDAVEL" },
    });

    expect(r.metricas[0].signal).toBe("critico");
  });

  it("returns critico for MELHORA_QUALIDADE movel", () => {
    const r = avaliarInfra({
      fibra: { classification: "SAUDAVEL" },
      movel: { classification: "MELHORA_QUALIDADE" },
    });

    expect(r.metricas[1].signal).toBe("critico");
  });

  it("returns alerta for EXPANSAO_5G movel", () => {
    const r = avaliarInfra({
      fibra: { classification: "SAUDAVEL" },
      movel: { classification: "EXPANSAO_5G" },
    });

    expect(r.metricas[1].signal).toBe("alerta");
  });

  it("defaults to SAUDAVEL when c2 is undefined", () => {
    const r = avaliarInfra(undefined);

    expect(r.signal).toBe("ok");
    expect(r.metricas[0].value).toBe("SAUDAVEL");
    expect(r.metricas[1].value).toBe("SAUDAVEL");
  });
});

// ─── avaliarComportamento ───────────────────────────────────────────────────

describe("avaliarComportamento", () => {
  it("returns OK when arpuRelativo > 1.1 and canalPct >= 50", () => {
    const r = avaliarComportamento(baseDiag({ arpuRelativo: 1.3, canalPct: 60 }));

    expect(r.id).toBe("04");
    expect(r.title).toBe("Comportamento");
    expect(r.signal).toBe("ok");
  });

  it("returns alerta when arpuRelativo 0.9-1.1", () => {
    const r = avaliarComportamento(baseDiag({ arpuRelativo: 1.0 }));

    expect(r.metricas[0].signal).toBe("alerta");
  });

  it("returns critico when arpuRelativo < 0.9", () => {
    const r = avaliarComportamento(baseDiag({ arpuRelativo: 0.7 }));

    expect(r.metricas[0].signal).toBe("critico");
  });

  it("returns alerta when canalPct 20-50", () => {
    const r = avaliarComportamento(baseDiag({ canalPct: 35 }));

    expect(r.metricas[1].signal).toBe("alerta");
  });

  it("returns critico when canalPct < 20", () => {
    const r = avaliarComportamento(baseDiag({ canalPct: 10 }));

    expect(r.metricas[1].signal).toBe("critico");
  });

  it("formats canal value as 'nome (pct%)'", () => {
    const r = avaliarComportamento(baseDiag({ canalDominante: "Loja", canalPct: 40 }));

    expect(r.metricas[1].value).toBe("Loja (40%)");
  });
});

// ─── gerarRec ───────────────────────────────────────────────────────────────

describe("gerarRec", () => {
  function allPilares(d: DiagnosticoGrowth, c2?: Camada2Info): PilarResult[] {
    return [
      avaliarPercep(d),
      avaliarConcorrencia(d),
      avaliarInfra(c2),
      avaliarComportamento(d),
    ];
  }

  it("returns BLOQUEADO when fibra is EXPANSAO_NOVA_AREA", () => {
    const d = baseDiag();
    const c2: Camada2Info = {
      fibra: { classification: "EXPANSAO_NOVA_AREA" },
      movel: { classification: "SAUDAVEL" },
    };

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisao).toBe("BLOQUEADO");
    expect(rec.decisaoColor).toBe("#DC2626");
  });

  it("returns BLOQUEADO when percepção and concorrência are both critical", () => {
    const d = baseDiag({
      scoreOokla: 4,
      taxaChamados: 7,
      deltaVsLider: -2,
    });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisao).toBe("BLOQUEADO");
  });

  it("returns AGUARDAR when infrastructure is constrained (fibra gargalo)", () => {
    const d = baseDiag();
    const c2: Camada2Info = {
      fibra: { classification: "AUMENTO_CAPACIDADE" },
      movel: { classification: "SAUDAVEL" },
    };

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisao).toBe("AGUARDAR");
    expect(rec.decisaoColor).toBe("#D97706");
  });

  it("returns AGUARDAR when only percepção is critical", () => {
    const d = baseDiag({ scoreOokla: 4 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisao).toBe("AGUARDAR");
  });

  it("returns AGUARDAR when only concorrência is critical", () => {
    const d = baseDiag({ deltaVsLider: -2 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisao).toBe("AGUARDAR");
  });

  it("returns ATACAR when everything is healthy", () => {
    const d = baseDiag();
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisao).toBe("ATACAR");
    expect(rec.decisaoColor).toBe("#16A34A");
    // v5: per-tech decisions and priorities
    expect(rec.decisaoMovel).toBe("ATACAR");
    expect(rec.decisaoFibra).toBe("ATACAR");
    expect(rec.prioMovel).toBe("ALTA"); // scoreOokla 8.5 → ALTA
    expect(rec.prioFibra).toBe("BAIXA"); // no scoreOoklaFibra → BAIXA
  });

  it("v5: falls back to AGUARDAR per-tech when mobile has quality issue", () => {
    const d = baseDiag();
    const c2: Camada2Info = {
      fibra: { classification: "SAUDAVEL" },
      movel: { classification: "MELHORA_QUALIDADE" },
    };

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisaoMovel).toBe("AGUARDAR");
    expect(rec.decisaoFibra).toBe("ATACAR");
  });

  it("v5: fibra AGUARDAR when MELHORA_QUALIDADE (new v5 state)", () => {
    const d = baseDiag();
    const c2: Camada2Info = {
      fibra: { classification: "MELHORA_QUALIDADE" },
      movel: { classification: "SAUDAVEL" },
    };

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.decisaoFibra).toBe("AGUARDAR");
    expect(rec.decisao).toBe("AGUARDAR"); // fibra gargalo
  });

  it("v5: prioridade per-tech usa scores per-tech quando disponíveis", () => {
    const d = baseDiag({
      scoreOoklaMovel: 6.5, // MEDIA
      scoreOoklaFibra: 8.0, // ALTA
    });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.prioMovel).toBe("MEDIA");
    expect(rec.prioFibra).toBe("ALTA");
  });

  it("recommends dominant channel when canalPct >= 50", () => {
    const d = baseDiag({ canalDominante: "Digital", canalPct: 60 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.canal).toContain("Digital");
    expect(rec.canal).toContain("dominante");
  });

  it("recommends complementary channel when canalPct 20-50", () => {
    const d = baseDiag({ canalDominante: "Loja", canalPct: 35 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.canal).toContain("complementar");
  });

  it("recommends redefining channel when canalPct < 20", () => {
    const d = baseDiag({ canalDominante: "PAP", canalPct: 10 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.canal).toContain("Redefinir");
    expect(rec.canal).toContain("ineficiente");
  });

  it("abordagem mentions fibra blocked when EXPANSAO_NOVA_AREA", () => {
    const d = baseDiag();
    const c2: Camada2Info = {
      fibra: { classification: "EXPANSAO_NOVA_AREA" },
      movel: { classification: "SAUDAVEL" },
    };

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.abordagem).toContain("Não ativar growth de fibra");
  });

  it("abordagem mentions totalização for premium ARPU with healthy infra", () => {
    const d = baseDiag({ arpuRelativo: 1.3 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.abordagem).toContain("totalização");
  });

  it("raciocinio concatenates all relevant reasons", () => {
    const d = baseDiag({ scoreOokla: 9, taxaChamados: 1, sharePenetracao: 10, deltaVsLider: 2, canalPct: 60 });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.raciocinio).toContain("percepção excelente");
    expect(rec.raciocinio).toContain("alta oportunidade de mercado");
    expect(rec.raciocinio).toContain("vantagem técnica");
  });

  it("raciocinio returns balanced profile message when no special conditions", () => {
    const d = baseDiag({
      scoreOokla: 7,
      taxaChamados: 3.5,
      sharePenetracao: 25,
      deltaVsLider: -0.5,
      canalPct: 35,
    });
    const c2 = healthyCamada2();

    const rec = gerarRec(allPilares(d, c2), d, c2);

    expect(rec.raciocinio).toContain("Geohash com perfil equilibrado");
  });
});

// ─── buildDiagnostico ───────────────────────────────────────────────────────

describe("buildDiagnostico", () => {
  it("builds from detail with available scores", () => {
    const d = buildDiagnostico({
      share_vivo: 25,
      vivo_score: 8.0,
      tim_score: 7.0,
      claro_score: 6.5,
    });

    expect(d.scoreOokla).toBe(8.0);
    expect(d.sharePenetracao).toBe(25);
    expect(d.deltaVsLider).toBe(1.0); // 8.0 - max(7.0, 6.5)
  });

  it("handles null scores with defaults", () => {
    const d = buildDiagnostico({});

    expect(d.scoreOokla).toBe(0);
    expect(d.sharePenetracao).toBe(0);
    expect(d.deltaVsLider).toBe(0);
    expect(d.taxaChamados).toBe(0);
    expect(d.arpuRelativo).toBe(1.0);
    expect(d.canalDominante).toBe("Digital");
    expect(d.canalPct).toBe(50);
  });

  it("computes deltaVsLider as vivo minus best competitor", () => {
    const d = buildDiagnostico({
      vivo_score: 5,
      tim_score: 9,
      claro_score: 3,
    });

    expect(d.deltaVsLider).toBe(-4); // 5 - 9
  });

  it("v5: extracts per-tech fields from diagnosticoGrowth payload", () => {
    const d = buildDiagnostico({
      share_vivo: 25,
      vivo_score: 7.0,
      diagnosticoGrowth: {
        score_ookla_movel: 6.8,
        score_ookla_fibra: 7.5,
        score_hac: 7.2,
        delta_vs_lider_fibra: 0.5,
        delta_vs_lider_movel: -0.3,
        taxa_chamados: 4,
        arpu_relativo: 1.2,
        canal_dominante: "Loja",
        canal_pct: 70,
      },
    });

    expect(d.scoreOoklaMovel).toBe(6.8);
    expect(d.scoreOoklaFibra).toBe(7.5);
    expect(d.scoreHac).toBe(7.2);
    expect(d.deltaVsLiderFibra).toBe(0.5);
    expect(d.deltaVsLiderMovel).toBe(-0.3);
    expect(d.taxaChamados).toBe(4);
    expect(d.canalDominante).toBe("Loja");
    expect(d.canalPct).toBe(70);
  });
});

// ─── buildCamada2 ───────────────────────────────────────────────────────────

describe("buildCamada2", () => {
  it("extracts classification from camada2 data", () => {
    const c2 = buildCamada2({
      camada2: {
        fibra: { classification: "AUMENTO_CAPACIDADE" },
        movel: { classification: "EXPANSAO_5G" },
      },
    });

    expect(c2.fibra?.classification).toBe("AUMENTO_CAPACIDADE");
    expect(c2.movel?.classification).toBe("EXPANSAO_5G");
  });

  it("defaults to SAUDAVEL when camada2 is null", () => {
    const c2 = buildCamada2({ camada2: null });

    expect(c2.fibra?.classification).toBe("SAUDAVEL");
    expect(c2.movel?.classification).toBe("SAUDAVEL");
  });

  it("defaults to SAUDAVEL when camada2 is undefined", () => {
    const c2 = buildCamada2({});

    expect(c2.fibra?.classification).toBe("SAUDAVEL");
    expect(c2.movel?.classification).toBe("SAUDAVEL");
  });

  it("defaults fibra to SAUDAVEL when only movel exists", () => {
    const c2 = buildCamada2({
      camada2: {
        fibra: null,
        movel: { classification: "MELHORA_QUALIDADE" },
      },
    });

    expect(c2.fibra?.classification).toBe("SAUDAVEL");
    expect(c2.movel?.classification).toBe("MELHORA_QUALIDADE");
  });
});
