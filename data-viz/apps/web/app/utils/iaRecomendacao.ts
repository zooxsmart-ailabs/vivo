// iaRecomendacao.ts — Lógica de Recomendação IA
// Mesma lógica do repositório zooxsmart-ailabs/vivo, adaptada para React
// Baseada nos campos: scoreOokla, taxaChamados, sharePenetracao, arpuRelativo, quadrant

import type { GeohashEntry } from "./goiania";

export type Decisao = "ATACAR" | "AGUARDAR" | "RETER" | "EXPANDIR";
export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

export interface IAResult {
  movel: { decisao: Decisao; prioridade: Prioridade };
  fibra: { decisao: Decisao; prioridade: Prioridade };
  total: { decisao: Decisao };
  canalRecomendado: string;
  abordagemComercial: string;
  raciocinio: string;
}

function getDecisaoMovel(g: GeohashEntry): { decisao: Decisao; prioridade: Prioridade } {
  const { scoreOoklaMovel, taxaChamados, sharePenetracao, arpuRelativo } = g.diagnostico;
  const q = g.quadrant;
  const prioridade = scoreToPrioridade(scoreOoklaMovel);

  if (q === "RETENCAO" || q === "GROWTH_RETENCAO") {
    if (scoreOoklaMovel < 6.0 || taxaChamados > 4.0) {
      return { decisao: "RETER", prioridade };
    }
    return { decisao: "AGUARDAR", prioridade };
  }

  if (q === "GROWTH") {
    return { decisao: "ATACAR", prioridade };
  }

  if (q === "UPSELL") {
    if (arpuRelativo >= 1.3) {
      return { decisao: "EXPANDIR", prioridade };
    }
    return { decisao: "AGUARDAR", prioridade };
  }

  return { decisao: "AGUARDAR", prioridade };
}

function getDecisaoFibra(g: GeohashEntry): { decisao: Decisao; prioridade: Prioridade } {
  const { scoreOoklaFibra, sharePenetracao, arpuRelativo } = g.diagnostico;
  const { fibra } = g.camada2;
  const q = g.quadrant;
  const prioridade = scoreToPrioridade(scoreOoklaFibra);

  if (g.technology === "MOVEL") {
    if (fibra.classification === "EXPANSAO_NOVA_AREA" && fibra.score >= 50) {
      return { decisao: "EXPANDIR", prioridade };
    }
    return { decisao: "AGUARDAR", prioridade };
  }

  if (fibra.classification === "AUMENTO_CAPACIDADE") {
    return { decisao: "EXPANDIR", prioridade };
  }

  if (q === "GROWTH" && sharePenetracao < 25) {
    return { decisao: "ATACAR", prioridade };
  }

  if (q === "UPSELL" && arpuRelativo >= 1.5) {
    return { decisao: "EXPANDIR", prioridade };
  }

  if (scoreOoklaFibra < 6.5) {
    return { decisao: "RETER", prioridade };
  }

  return { decisao: "ATACAR", prioridade };
}

function getDecisaoTotal(
  movel: { decisao: Decisao },
  fibra: { decisao: Decisao }
): Decisao {
  const priority: Decisao[] = ["RETER", "ATACAR", "EXPANDIR", "AGUARDAR"];
  const movelIdx = priority.indexOf(movel.decisao);
  const fibraIdx = priority.indexOf(fibra.decisao);
  return priority[Math.min(movelIdx, fibraIdx)];
}

function getCanalRecomendado(g: GeohashEntry): string {
  const { canalDominante, canalPct } = g.diagnostico;
  if (canalPct >= 60) return `${canalDominante} (dominante — priorizar ${canalPct}% da verba)`;
  if (canalPct >= 45) return `${canalDominante} (principal — ${canalPct}% da verba) + Digital`;
  return `Mix balanceado: ${canalDominante} (${canalPct}%) + Digital + Televendas`;
}

function getAbordagemComercial(g: GeohashEntry): string {
  const { arpuRelativo, deltaVsLider } = g.diagnostico;
  const q = g.quadrant;

  if (q === "UPSELL") {
    if (arpuRelativo >= 1.5) return "Upsell para planos 1Gbps e serviços premium. Oferta de totalização Fibra + Móvel com desconto fidelidade.";
    return "Upsell para planos superiores. Apresentar benefícios exclusivos e serviços adicionais.";
  }
  if (q === "GROWTH") {
    if (deltaVsLider >= 0) return "Oferta de entrada competitiva com destaque para qualidade Vivo. Comparativo de satisfação vs concorrência.";
    return "Mix de ofertas com ancoragem de preço. Apresentar comparativo de custo-benefício vs concorrência.";
  }
  if (q === "RETENCAO") {
    return "Programa de retenção proativa: contato preventivo, upgrade de plano e créditos de fidelidade.";
  }
  return "Abordagem dupla: retenção da base existente + captação de não-clientes com oferta de entrada.";
}

function getRaciocinio(g: GeohashEntry): string {
  const d = g.diagnostico;
  const parts: string[] = [];

  parts.push(`percepção ${d.scoreOokla >= 7.5 ? "positiva" : d.scoreOokla >= 6.5 ? "neutra" : "crítica"} (Ookla ${d.scoreOokla.toFixed(1)})`);

  if (d.taxaChamados < 2.5) {
    parts.push(`baixo volume de chamados (<${d.taxaChamados.toFixed(0)}%) — base satisfeita`);
  } else if (d.taxaChamados >= 4.0) {
    parts.push(`alto volume de chamados (${d.taxaChamados.toFixed(0)}%) — base insatisfeita`);
  } else {
    parts.push(`volume moderado de chamados (${d.taxaChamados.toFixed(0)}%)`);
  }

  if (d.sharePenetracao >= 35) {
    parts.push(`mercado saturado (share >${d.sharePenetracao}%)`);
  } else {
    parts.push(`mercado com oportunidade (share ${d.sharePenetracao}%)`);
  }

  if (d.deltaVsLider >= 0) {
    parts.push(`Vivo com vantagem técnica vs líder`);
  } else {
    parts.push(`Vivo abaixo do líder em ${Math.abs(d.deltaVsLider).toFixed(1)} pts`);
  }

  return `Decisão baseada em: ${parts.join("; ")}.`;
}

export function calcIARecomendacao(g: GeohashEntry): IAResult {
  const movel = getDecisaoMovel(g);
  const fibra = getDecisaoFibra(g);
  const total = { decisao: getDecisaoTotal(movel, fibra) };

  return {
    movel,
    fibra,
    total,
    canalRecomendado: getCanalRecomendado(g),
    abordagemComercial: getAbordagemComercial(g),
    raciocinio: getRaciocinio(g),
  };
}

// Tema claro — cores legíveis em fundo branco/cinza claro
export const DECISAO_CONFIG: Record<Decisao, { label: string; color: string; bg: string; border: string; icon: string }> = {
  ATACAR: {
    label: "ATACAR",
    color: "#15803D",
    bg: "#DCFCE7",
    border: "#86EFAC",
    icon: "✓",
  },
  AGUARDAR: {
    label: "AGUARDAR",
    color: "#B45309",
    bg: "#FEF3C7",
    border: "#FCD34D",
    icon: "⚠",
  },
  RETER: {
    label: "RETER",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#FCA5A5",
    icon: "!",
  },
  EXPANDIR: {
    label: "EXPANDIR",
    color: "#1D4ED8",
    bg: "#DBEAFE",
    border: "#93C5FD",
    icon: "↑",
  },
};

export const PRIORIDADE_CONFIG: Record<Prioridade, { label: string; color: string; bg: string }> = {
  ALTA:  { label: "ALTA",  color: "#16A34A", bg: "#DCFCE7" },
  MEDIA: { label: "MÉDIA", color: "#D97706", bg: "#FEF3C7" },
  BAIXA: { label: "BAIXA", color: "#DC2626", bg: "#FEE2E2" },
};

/** Converte um score 0–10 em Prioridade */
export function scoreToPrioridade(score: number): Prioridade {
  if (score >= 8) return "ALTA";
  if (score >= 6) return "MEDIA";
  return "BAIXA";
}
