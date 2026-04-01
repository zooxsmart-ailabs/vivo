/**
 * Diagnóstico Growth — Avaliação dos 4 Pilares + Recomendação IA
 * Transposto de prototipo/client/src/pages/Frentes.tsx
 *
 * Funções puras que recebem dados da API e retornam resultado do diagnóstico.
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

export interface AIRec {
  decisao: "ATIVAR" | "AGUARDAR" | "BLOQUEADO";
  decisaoColor: string;
  canal: string;
  abordagem: string;
  raciocinio: string;
}

export interface DiagnosticoGrowth {
  scoreOokla: number;
  taxaChamados: number;
  sharePenetracao: number;
  deltaVsLider: number;
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

// ─── Avaliação dos pilares ───────────────────────────────────────────────────

export function avaliarPercep(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 =
    d.scoreOokla >= 8 ? "ok" : d.scoreOokla >= 6 ? "alerta" : "critico";
  const s2: Sig3 =
    d.taxaChamados < 3 ? "ok" : d.taxaChamados <= 5 ? "alerta" : "critico";
  return {
    id: "01",
    title: "Percepção",
    signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Score Ookla",
        value: d.scoreOokla.toFixed(1),
        formula: "Score SpeedTest Vivo no Geohash",
        signal: s1,
        detail:
          s1 === "ok"
            ? "≥ 8.0 — Excelente"
            : s1 === "alerta"
              ? "6.0–7.9 — Regular"
              : "< 6.0 — Crítico",
      },
      {
        label: "Vol. Chamados",
        value: `${d.taxaChamados.toFixed(1)}%`,
        formula: "(RAC + SAC 30d) / Base Ativa Vivo",
        signal: s2,
        detail:
          s2 === "ok"
            ? "< 3% — Saudável"
            : s2 === "alerta"
              ? "3–5% — Alerta"
              : "> 5% — Crítico",
      },
    ],
  };
}

export function avaliarConcorrencia(d: DiagnosticoGrowth): PilarResult {
  const s1: Sig3 =
    d.sharePenetracao < 20
      ? "ok"
      : d.sharePenetracao <= 40
        ? "alerta"
        : "critico";
  const s2: Sig3 =
    d.deltaVsLider > 0 ? "ok" : d.deltaVsLider >= -1 ? "alerta" : "critico";
  return {
    id: "02",
    title: "Concorrência",
    signal: worstSig(s1, s2),
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
        label: "Vantagem vs Líder",
        value: `${d.deltaVsLider > 0 ? "+" : ""}${d.deltaVsLider.toFixed(1)}`,
        formula: "Delta score Vivo − score líder (Ookla)",
        signal: s2,
        detail:
          s2 === "ok"
            ? "Delta > 0 — Vantagem"
            : s2 === "alerta"
              ? "−1.0 a 0 — Empate Técnico"
              : "Delta < −1.0 — Desvantagem",
      },
    ],
  };
}

export function avaliarInfra(c2: Camada2Info | undefined): PilarResult {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";
  const s1: Sig3 =
    fc === "SAUDAVEL"
      ? "ok"
      : fc === "AUMENTO_CAPACIDADE"
        ? "alerta"
        : "critico";
  const s2: Sig3 =
    mc === "SAUDAVEL"
      ? "ok"
      : mc === "MELHORA_QUALIDADE"
        ? "critico"
        : "alerta";
  const FL: Record<string, string> = {
    SAUDAVEL: "Saudável — Growth Liberado",
    AUMENTO_CAPACIDADE: "Aumento de Capacidade — Controlado",
    EXPANSAO_NOVA_AREA: "Expansão Nova Área — Bloqueado",
  };
  const ML: Record<string, string> = {
    SAUDAVEL: "Saudável — Growth Liberado",
    MELHORA_QUALIDADE: "Melhora na Qualidade — Controlado",
    EXPANSAO_5G: "Expansão 5G — Controlado",
    EXPANSAO_4G: "Expansão 4G — Controlado",
  };
  return {
    id: "03",
    title: "Infraestrutura",
    signal: worstSig(s1, s2),
    metricas: [
      {
        label: "Fibra (Status)",
        value: fc,
        formula: "Saudável / Aumento de Capacidade / Expansão Nova Área",
        signal: s1,
        detail: FL[fc] ?? fc,
      },
      {
        label: "Móvel (Status)",
        value: mc,
        formula:
          "Saudável / Melhora na Qualidade / Expansão de Cobertura",
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

export function gerarRec(
  pilares: PilarResult[],
  d: DiagnosticoGrowth,
  c2: Camada2Info | undefined,
): AIRec {
  const fc = c2?.fibra?.classification ?? "SAUDAVEL";
  const mc = c2?.movel?.classification ?? "SAUDAVEL";

  const fibraBloqueada = fc === "EXPANSAO_NOVA_AREA";
  const fibraGargalo = fc === "AUMENTO_CAPACIDADE";
  const movelProblema = mc === "MELHORA_QUALIDADE";
  const movelExpansao = mc === "EXPANSAO_5G" || mc === "EXPANSAO_4G";
  const percCritica = d.scoreOokla < 6 || d.taxaChamados > 5;
  const concCritica = d.deltaVsLider < -1;
  const infraControle = fibraGargalo || movelProblema;

  // 1. Decisão
  let decisao: AIRec["decisao"];
  let decisaoColor: string;
  if (fibraBloqueada || (percCritica && concCritica)) {
    decisao = "BLOQUEADO";
    decisaoColor = "#DC2626";
  } else if (infraControle || percCritica || concCritica) {
    decisao = "AGUARDAR";
    decisaoColor = "#D97706";
  } else {
    decisao = "ATIVAR";
    decisaoColor = "#16A34A";
  }

  // 2. Canal
  let canal: string;
  if (d.canalPct >= 50)
    canal = `${d.canalDominante} (dominante — priorizar 80% da verba)`;
  else if (d.canalPct >= 20)
    canal = `${d.canalDominante} + canal complementar`;
  else
    canal = `Redefinir canal — ${d.canalDominante} ineficiente (<20%)`;

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
    abordagem = `Expansão de cobertura ${mc === "EXPANSAO_5G" ? "5G" : "4G"} em andamento. Abordar com oferta de fibra como produto principal.`;
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
  if (movelExpansao)
    reasons.push(
      `expansão de cobertura ${mc === "EXPANSAO_5G" ? "5G" : "4G"} em andamento`,
    );
  if (d.scoreOokla >= 8) reasons.push("percepção excelente (Ookla ≥ 8.0)");
  else if (d.scoreOokla < 6) reasons.push("percepção crítica (Ookla < 6.0)");
  if (d.taxaChamados > 5)
    reasons.push("volume crítico de chamados (>5%)");
  else if (d.taxaChamados < 3)
    reasons.push("baixo volume de chamados (<3%) — base satisfeita");
  if (d.sharePenetracao < 20)
    reasons.push("alta oportunidade de mercado (share < 20%)");
  else if (d.sharePenetracao > 40)
    reasons.push("mercado saturado (share > 40%)");
  if (d.deltaVsLider > 0)
    reasons.push("Vivo com vantagem técnica vs líder");
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

  return { decisao, decisaoColor, canal, abordagem, raciocinio };
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
}): DiagnosticoGrowth {
  const vivoScore = detail.vivo_score ?? 0;
  const bestCompetitor = Math.max(
    detail.tim_score ?? 0,
    detail.claro_score ?? 0,
  );
  return {
    scoreOokla: vivoScore,
    taxaChamados: 0, // stub — não existe no banco ainda
    sharePenetracao: detail.share_vivo ?? 0,
    deltaVsLider: vivoScore - bestCompetitor,
    arpuRelativo: 1.0, // stub — não existe no banco ainda
    canalDominante: "Digital", // stub
    canalPct: 50, // stub
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
