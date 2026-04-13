/**
 * Diagnóstico Growth — Avaliação dos 4 Pilares + Recomendação IA
 *
 * v5 (2026-04-10): Port do prototipo/pages/frentes.vue com:
 *  - Pilar Percepção: até 4 métricas (SpeedTest Móvel/Fibra, Score HAC, Chamados)
 *  - Pilar Concorrência: delta competitivo per-tech (fibra + móvel)
 *  - Fibra: novo estado MELHORA_QUALIDADE
 *  - Recomendação: ATIVAR → ATACAR, + decisões e prioridades per-tech
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Sig3 = "ok" | "alerta" | "critico";

export const SIG_STYLES: Record<
  Sig3,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  ok: {
    bg: "#F0FDF4",
    border: "#BBF7D0",
    text: "#15803D",
    dot: "#16A34A",
    label: "OK",
  },
  alerta: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    text: "#B45309",
    dot: "#D97706",
    label: "Alerta",
  },
  critico: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#DC2626",
    dot: "#EF4444",
    label: "Crítico",
  },
};

export interface PilarMetrica {
  label: string;
  value: string;
  formula: string;
  signal: Sig3;
  detail: string;
}

export interface PilarResult {
  id: string;
  title: string;
  signal: Sig3;
  metricas: PilarMetrica[];
}

export type Decisao = "ATACAR" | "AGUARDAR" | "BLOQUEADO";
export type DecisaoTech = "ATACAR" | "AGUARDAR";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

export interface AIRec {
  decisao: Decisao;
  decisaoColor: string;
  decisaoMovel: DecisaoTech;
  decisaoFibra: DecisaoTech;
  prioMovel: Prioridade;
  prioFibra: Prioridade;
  canal: string;
  abordagem: string;
  raciocinio: string;
}

export interface DiagnosticoGrowth {
  scoreOokla: number;
  /** v5: Score QoE Vivo Móvel (fallback: scoreOokla) */
  scoreOoklaMovel?: number | null;
  /** v5: Score QoE Vivo Fibra (0 se não aplicável) */
  scoreOoklaFibra?: number | null;
  /** v5: Score HAC qualidade fibra (0 se não aplicável) */
  scoreHac?: number | null;
  taxaChamados: number;
  sharePenetracao: number;
  deltaVsLider: number;
  /** v5: Delta competitivo Fibra (fallback: deltaVsLider) */
  deltaVsLiderFibra?: number | null;
  /** v5: Delta competitivo Móvel (fallback: deltaVsLider) */
  deltaVsLiderMovel?: number | null;
  arpuRelativo: number;
  canalDominante: string;
  canalPct: number;
}

export interface Camada2Info {
  fibra?: { classification: string };
  movel?: { classification: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function worstSig(...sigs: Sig3[]): Sig3 {
  if (sigs.includes("critico")) return "critico";
  if (sigs.includes("alerta")) return "alerta";
  return "ok";
}

function scoreDetail(s: Sig3): string {
  return s === "ok"
    ? "≥ 8.0 — Excelente"
    : s === "alerta"
      ? "6.0–7.9 — Regular"
      : "< 6.0 — Crítico";
}

function fmtDelta(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}

function deltaDetail(s: Sig3): string {
  return s === "ok"
    ? "Delta > 0 — Vantagem"
    : s === "alerta"
      ? "−1.0 a 0 — Empate Técnico"
      : "Delta < −1.0 — Desvantagem";
}

// ─── Avaliação dos pilares ───────────────────────────────────────────────────

export function avaliarPercep(d: DiagnosticoGrowth): PilarResult {
  // SpeedTest Móvel: fallback para scoreOokla geral quando per-tech ausente
  const movel = d.scoreOoklaMovel ?? d.scoreOokla;
  const fibra = d.scoreOoklaFibra ?? 0;
  const hac = d.scoreHac ?? 0;

  const sm: Sig3 = movel >= 8 ? "ok" : movel >= 6 ? "alerta" : "critico";
  const sf: Sig3 =
    fibra === 0 ? "ok" : fibra >= 8 ? "ok" : fibra >= 6 ? "alerta" : "critico";
  const sh: Sig3 =
    hac === 0 ? "ok" : hac >= 8 ? "ok" : hac >= 6 ? "alerta" : "critico";
  const sChamados: Sig3 =
    d.taxaChamados < 3 ? "ok" : d.taxaChamados <= 5 ? "alerta" : "critico";

  const metricas: PilarMetrica[] = [
    {
      label: "SpeedTest Móvel",
      value: movel.toFixed(1),
      formula: "Score Ookla — SpeedTest Vivo Móvel no Geohash",
      signal: sm,
      detail: scoreDetail(sm),
    },
  ];

  if (fibra > 0) {
    metricas.push({
      label: "SpeedTest Fibra",
      value: fibra.toFixed(1),
      formula: "Score Ookla — SpeedTest Vivo Fibra no Geohash",
      signal: sf,
      detail: scoreDetail(sf),
    });
  }

  if (hac > 0) {
    metricas.push({
      label: "Score HAC",
      value: hac.toFixed(1),
      formula: "Avaliação de qualidade HAC — Fibra",
      signal: sh,
      detail: scoreDetail(sh),
    });
  }

  metricas.push({
    label: "Vol. Chamados",
    value: `${d.taxaChamados.toFixed(1)}%`,
    formula: "(RAC + SAC 30d) / Base Ativa Vivo",
    signal: sChamados,
    detail:
      sChamados === "ok"
        ? "< 3% — Saudável"
        : sChamados === "alerta"
          ? "3–5% — Alerta"
          : "> 5% — Crítico",
  });

  return {
    id: "01",
    title: "Percepção",
    signal: worstSig(sm, sf, sh, sChamados),
    metricas,
  };
}

export function avaliarConcorrencia(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 =
    d.sharePenetracao < 20
      ? "ok"
      : d.sharePenetracao <= 40
        ? "alerta"
        : "critico";

  // v5: Delta competitivo per-tech com fallback para delta geral
  const dvf = d.deltaVsLiderFibra ?? d.deltaVsLider;
  const dvm = d.deltaVsLiderMovel ?? d.deltaVsLider;

  const sf: Sig3 = dvf > 0 ? "ok" : dvf >= -1 ? "alerta" : "critico";
  const sm: Sig3 = dvm > 0 ? "ok" : dvm >= -1 ? "alerta" : "critico";

  return {
    id: "02",
    title: "Concorrência",
    signal: worstSig(s1, sf, sm),
    metricas: [
      {
        label: "Share / Penetração",
        value: `${d.sharePenetracao}%`,
        formula: "Base Vivo / Total Domicílios (Zoox)",
        signal: s1,
        detail:
          s1 === "ok"
            ? "< 20% — Alta Oportunidade"
            : s1 === "alerta"
              ? "20–40% — Média Oportunidade"
              : "> 40% — Saturado",
      },
      {
        label: "Vantagem Satisfação Fibra",
        value: fmtDelta(dvf),
        formula: "Score Vivo Fibra − score líder Fibra (Ookla)",
        signal: sf,
        detail: deltaDetail(sf),
      },
      {
        label: "Vantagem Satisfação Móvel",
        value: fmtDelta(dvm),
        formula: "Score Vivo Móvel − score líder Móvel (Ookla)",
        signal: sm,
        detail: deltaDetail(sm),
      },
    ],
  };
}

export function avaliarInfra(c2: Camada2Info | undefined): PilarResult {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";

  // v5: Fibra — SAUDAVEL=ok | MELHORA_QUALIDADE/AUMENTO_CAPACIDADE=alerta | EXPANSAO_NOVA_AREA=critico
  const s1: Sig3 =
    fc === "SAUDAVEL"
      ? "ok"
      : fc === "EXPANSAO_NOVA_AREA"
        ? "critico"
        : "alerta";

  // Móvel — SAUDAVEL=ok | MELHORA_QUALIDADE=critico | EXPANSAO_COBERTURA=alerta
  const s2: Sig3 =
    mc === "SAUDAVEL"
      ? "ok"
      : mc === "MELHORA_QUALIDADE" ||
          mc === "MELHORA_QUALIDADE_5G" ||
          mc === "MELHORA_QUALIDADE_4G"
        ? "critico"
        : "alerta";

  const FL: Record<string, string> = {
    SAUDAVEL: "Saudável — Growth Liberado",
    MELHORA_QUALIDADE: "Melhora da Qualidade — Intervenção Recomendada",
    AUMENTO_CAPACIDADE: "Aumento de Capacidade — Controlado",
    EXPANSAO_NOVA_AREA: "Expansão Nova Área — Bloqueado",
  };
  const ML: Record<string, string> = {
    SAUDAVEL: "Saudável — Growth Liberado",
    MELHORA_QUALIDADE: "Melhora na Qualidade — Crítico",
    MELHORA_QUALIDADE_5G: "Melhora na Qualidade 5G — Crítico",
    MELHORA_QUALIDADE_4G: "Melhora na Qualidade 4G — Crítico",
    EXPANSAO_5G: "Expansão 5G — Controlado",
    EXPANSAO_4G: "Expansão 4G — Controlado",
    EXPANSAO_COBERTURA_5G: "Expansão Cobertura 5G — Controlado",
    EXPANSAO_COBERTURA_4G: "Expansão Cobertura 4G — Controlado",
  };
  return {
    id: "03",
    title: "Infraestrutura",
    signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Fibra (Status)",
        value: fc,
        formula:
          "Saudável / Melhora da Qualidade / Aumento de Capacidade / Expansão Nova Área",
        signal: s1,
        detail: FL[fc] ?? fc,
      },
      {
        label: "Móvel (Status)",
        value: mc,
        formula: "Saudável / Melhora na Qualidade / Expansão de Cobertura",
        signal: s2,
        detail: ML[mc] ?? mc,
      },
    ],
  };
}

export function avaliarComportamento(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 =
    d.arpuRelativo > 1.1 ? "ok" : d.arpuRelativo >= 0.9 ? "alerta" : "critico";
  const s2: Sig3 =
    d.canalPct >= 50 ? "ok" : d.canalPct >= 20 ? "alerta" : "critico";
  return {
    id: "04",
    title: "Comportamento",
    signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Sensibilidade a Preço",
        value: d.arpuRelativo.toFixed(2),
        formula: "ARPU Geohash / ARPU Médio da Cidade",
        signal: s1,
        detail:
          s1 === "ok"
            ? "Índice > 1.1 — Foco em Totalização"
            : s1 === "alerta"
              ? "0.9–1.1 — Mix de Ofertas"
              : "Índice < 0.9 — Sensível a Preço",
      },
      {
        label: "Afinidade de Canal",
        value: `${d.canalDominante} (${d.canalPct}%)`,
        formula: "Vendas Canal X / Total Vendas no Geohash",
        signal: s2,
        detail:
          s2 === "ok"
            ? "> 50% — Canal Dominante (80% verba)"
            : s2 === "alerta"
              ? "20–50% — Canal Complementar"
              : "< 20% — Canal Ineficiente",
      },
    ],
  };
}

// ─── Recomendação IA ─────────────────────────────────────────────────────────

/** v5: Prioridade per-tech baseada no score Ookla */
export function calcPrio(score: number): Prioridade {
  if (score >= 7.5) return "ALTA";
  if (score >= 5.5) return "MEDIA";
  return "BAIXA";
}

export function gerarRec(
  _pilares: PilarResult[],
  d: DiagnosticoGrowth,
  c2: Camada2Info | undefined,
): AIRec {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";

  const fibraBloqueada = fc === "EXPANSAO_NOVA_AREA";
  const fibraGargalo =
    fc === "AUMENTO_CAPACIDADE" || fc === "MELHORA_QUALIDADE";
  const movelProblema =
    mc === "MELHORA_QUALIDADE" ||
    mc === "MELHORA_QUALIDADE_5G" ||
    mc === "MELHORA_QUALIDADE_4G";
  const movelExpansao =
    mc === "EXPANSAO_5G" ||
    mc === "EXPANSAO_4G" ||
    mc === "EXPANSAO_COBERTURA_5G" ||
    mc === "EXPANSAO_COBERTURA_4G";
  const percCritica = d.scoreOokla < 6 || d.taxaChamados > 5;
  const concCritica = d.deltaVsLider < -1;
  const infraControle = fibraGargalo || movelProblema;

  // 1. Decisão geral — BLOQUEADO mantido como estado do banco
  let decisao: Decisao;
  let decisaoColor: string;
  if (fibraBloqueada || (percCritica && concCritica)) {
    decisao = "BLOQUEADO";
    decisaoColor = "#DC2626";
  } else if (infraControle || percCritica || concCritica) {
    decisao = "AGUARDAR";
    decisaoColor = "#D97706";
  } else {
    decisao = "ATACAR";
    decisaoColor = "#16A34A";
  }

  // v5: Decisão por tecnologia
  const decisaoMovel: DecisaoTech =
    movelProblema || movelExpansao || percCritica ? "AGUARDAR" : "ATACAR";
  const decisaoFibra: DecisaoTech =
    fibraBloqueada || fibraGargalo ? "AGUARDAR" : "ATACAR";

  // v5: Prioridade por tecnologia
  const scoreMovel = d.scoreOoklaMovel ?? d.scoreOokla;
  const scoreFibra = d.scoreOoklaFibra ?? 0;
  const prioMovel = calcPrio(scoreMovel);
  const prioFibra: Prioridade = scoreFibra > 0 ? calcPrio(scoreFibra) : "BAIXA";

  // 2. Canal
  let canal: string;
  if (d.canalPct >= 50)
    canal = `${d.canalDominante} (dominante — priorizar 80% da verba)`;
  else if (d.canalPct >= 20)
    canal = `${d.canalDominante} + canal complementar`;
  else canal = `Redefinir canal — ${d.canalDominante} ineficiente (<20%)`;

  // 3. Abordagem
  let abordagem: string;
  if (fibraBloqueada) {
    abordagem =
      "Não ativar growth de fibra. Aguardar expansão de cobertura na área. Focar exclusivamente em móvel enquanto infraestrutura não está disponível.";
  } else if (fibraGargalo && !movelProblema) {
    abordagem =
      d.arpuRelativo >= 0.9
        ? "Rede móvel saudável — priorizar aquisição via móvel enquanto capacidade de fibra é ampliada. Retomar oferta de fibra após expansão de capacidade."
        : "Fibra com gargalo de capacidade. Abordar com planos móvel de entrada. Upsell gradual após adesão.";
  } else if (!fibraGargalo && movelProblema) {
    abordagem =
      d.arpuRelativo > 1.1
        ? "Rede móvel com qualidade comprometida — priorizar oferta de fibra. Perfil premium: apresentar planos de fibra com benefícios de streaming."
        : "Focar em fibra como produto principal. Rede móvel com qualidade comprometida — não incluir no pitch até resolução técnica.";
  } else if (fibraGargalo && movelProblema) {
    abordagem =
      "Ambas as redes com restrições técnicas. Aguardar resolução de infraestrutura antes de ativar growth.";
  } else if (movelExpansao) {
    const is5g = mc === "EXPANSAO_5G" || mc === "EXPANSAO_COBERTURA_5G";
    abordagem = `Expansão de cobertura ${is5g ? "5G" : "4G"} em andamento. Abordar com oferta de fibra como produto principal.`;
  } else {
    // Infraestrutura saudável
    if (d.arpuRelativo > 1.1)
      abordagem =
        "Oferta de totalização (Fibra + Móvel + Streaming). Perfil premium — apresentar bundle completo com benefícios exclusivos.";
    else if (d.arpuRelativo >= 0.9)
      abordagem =
        "Mix de ofertas com ancoragem de preço. Apresentar comparativo de custo-benefício vs concorrência.";
    else
      abordagem =
        "Oferta de entrada com preço competitivo. Cliente sensível a preço — evitar planos premium no primeiro contato. Upsell gradual após adesão.";
  }

  // 4. Raciocínio
  const reasons: string[] = [];
  if (fibraBloqueada)
    reasons.push("fibra bloqueada — área sem cobertura (Expansão Nova Área)");
  if (fibraGargalo)
    reasons.push("fibra com gargalo de capacidade — growth controlado");
  if (movelProblema)
    reasons.push(
      "qualidade móvel comprometida — intervenção técnica necessária",
    );
  if (movelExpansao) {
    const is5g = mc === "EXPANSAO_5G" || mc === "EXPANSAO_COBERTURA_5G";
    reasons.push(`expansão de cobertura ${is5g ? "5G" : "4G"} em andamento`);
  }
  if (d.scoreOokla >= 8) reasons.push("percepção excelente (Ookla ≥ 8.0)");
  else if (d.scoreOokla < 6) reasons.push("percepção crítica (Ookla < 6.0)");
  if (d.taxaChamados > 5) reasons.push("volume crítico de chamados (>5%)");
  else if (d.taxaChamados < 3)
    reasons.push("baixo volume de chamados (<3%) — base satisfeita");
  if (d.sharePenetracao < 20)
    reasons.push("alta oportunidade de mercado (share < 20%)");
  else if (d.sharePenetracao > 40)
    reasons.push("mercado saturado (share > 40%)");
  if (d.deltaVsLider > 0) reasons.push("Vivo com vantagem técnica vs líder");
  else if (d.deltaVsLider < -1)
    reasons.push("desvantagem técnica significativa vs líder");
  if (d.canalPct < 20)
    reasons.push(
      `canal ${d.canalDominante} ineficiente (<20%) — redefinir estratégia de canal`,
    );

  const raciocinio =
    reasons.length > 0
      ? `Decisão baseada em: ${reasons.join("; ")}.`
      : "Geohash com perfil equilibrado. Infraestrutura saudável, percepção positiva e canal definido. Ativar growth com oferta adequada ao perfil de preço.";

  return {
    decisao,
    decisaoColor,
    decisaoMovel,
    decisaoFibra,
    prioMovel,
    prioFibra,
    canal,
    abordagem,
    raciocinio,
  };
}

// ─── Build diagnóstico from API data ─────────────────────────────────────────

/**
 * Constrói DiagnosticoGrowth a partir dos dados retornados por geohash.getById.
 * Campos indisponíveis usam stubs seguros até os dados reais existirem no banco.
 */
export function buildDiagnostico(detail: {
  share_vivo?: number;
  vivo_score?: number | null;
  tim_score?: number | null;
  claro_score?: number | null;
  diagnosticoGrowth?: {
    score_ookla_movel?: number | null;
    score_ookla_fibra?: number | null;
    score_hac?: number | null;
    delta_vs_lider_fibra?: number | null;
    delta_vs_lider_movel?: number | null;
    arpu_relativo?: number | null;
    canal_dominante?: string | null;
    canal_pct?: number | null;
    taxa_chamados?: number | null;
  } | null;
}): DiagnosticoGrowth {
  const vivoScore = detail.vivo_score ?? 0;
  const bestCompetitor = Math.max(
    detail.tim_score ?? 0,
    detail.claro_score ?? 0,
  );
  const dg = detail.diagnosticoGrowth ?? null;
  return {
    scoreOokla: vivoScore,
    scoreOoklaMovel: dg?.score_ookla_movel ?? null,
    scoreOoklaFibra: dg?.score_ookla_fibra ?? null,
    scoreHac: dg?.score_hac ?? null,
    taxaChamados: dg?.taxa_chamados ?? 0,
    sharePenetracao: detail.share_vivo ?? 0,
    deltaVsLider: vivoScore - bestCompetitor,
    deltaVsLiderFibra: dg?.delta_vs_lider_fibra ?? null,
    deltaVsLiderMovel: dg?.delta_vs_lider_movel ?? null,
    arpuRelativo: dg?.arpu_relativo ?? 1.0,
    canalDominante: dg?.canal_dominante ?? "Digital",
    canalPct: dg?.canal_pct ?? 50,
  };
}

export function buildCamada2(detail: {
  camada2?: {
    fibra?: { classification: string } | null;
    movel?: { classification: string } | null;
  } | null;
}): Camada2Info {
  return {
    fibra: detail.camada2?.fibra ?? { classification: "SAUDAVEL" },
    movel: detail.camada2?.movel ?? { classification: "SAUDAVEL" },
  };
}
