// goiania.ts — Tipos e constantes de domínio para o Mapa Estratégico.
// Os dados reais vêm via tRPC; este arquivo concentra os enums, interfaces
// e configs visuais (cores, labels) compartilhados pelos componentes
// migrados do protótipo.

export type Quadrant = "GROWTH" | "UPSELL" | "RETENCAO" | "GROWTH_RETENCAO";
export type Technology = "FIBRA" | "MOVEL" | "AMBOS";
export type Priority = "ALTA" | "MEDIA" | "BAIXA";
export type Camada2Class =
  | "SAUDAVEL"
  | "MELHORA_QUALIDADE"
  | "AUMENTO_CAPACIDADE"
  | "EXPANSAO_NOVA_AREA"
  | "EXPANSAO_COBERTURA";

export interface Concorrente {
  nome: string;
  coberturaFibra: boolean;
  planoFibra: string;
  precoFibra: number;
  coberturaMovel: boolean;
  planoMovel: string;
  precoMovel: number;
}

export interface GeohashEntry {
  id: string;
  neighborhood: string;
  city: string;
  quadrant: Quadrant;
  isTop10: boolean;
  technology: Technology;
  lat: number;
  lng: number;
  satisfactionScores: { name: string; score: number; color: string }[];
  marketShare: {
    percentage: number;
    activeClients: number;
    totalPopulation: number;
    label: string;
  };
  shareTrend: {
    direction: "UP" | "DOWN" | "STABLE";
    delta: number;
    deltaMovel: number;
    deltaFibra: number;
    shareMovel: number;
    shareFibra: number;
  };
  crm: {
    arpu: number;
    deviceTier: string;
    planType: string;
    arpuMovel: number;
    arpuFibra: number;
    planoMovel: string;
  };
  speedtest: { downloadMbps: number; latencyMs: number; qualityLabel: string };
  demographics: {
    avgIncome: number;
    incomeLabel: string;
    populationDensity: number;
    populationGrowth: number;
    growthLabel: string;
    technology: string;
    severity: string;
  };
  diagnostico: {
    scoreOokla: number;
    scoreOoklaMovel: number;
    scoreOoklaFibra: number;
    scoreHAC: number;
    taxaChamados: number;
    sharePenetracao: number;
    deltaVsLider: number;
    deltaVsLiderFibra: number;
    deltaVsLiderMovel: number;
    scoreLiderFibra: number;
    scoreLiderMovel: number;
    arpuRelativo: number;
    canalDominante: string;
    canalPct: number;
    concorrentes: Concorrente[];
  };
  camada2: {
    fibra: {
      classification: Camada2Class;
      score: number;
      scoreLabel: string;
      taxaOcupacao?: number;
      portasDisponiveis?: number;
      potencialMercado?: number;
      sinergiaMovel?: number;
    };
    movel: { classification: Camada2Class; score: number; scoreLabel: string };
    decisaoIntegrada: string;
  };
  strategy: {
    title: string;
    motive: string;
    color: string;
    bgColor: string;
  };
  priorityScore: number;
  priority: Priority;
}

export const DIAGNOSTICO_BIVARIADO: Record<
  Quadrant,
  { title: string; subtitle: string }
> = {
  GROWTH: {
    title: "Share Baixo + Satisfação Alta",
    subtitle: "Janela de ataque, Geração de leads",
  },
  UPSELL: {
    title: "Share Alto + Satisfação Alta",
    subtitle: "Maximizar receita, Upsell Premium",
  },
  RETENCAO: {
    title: "Share Alto + Satisfação Baixa",
    subtitle: "Risco iminente de churn, Ação urgente",
  },
  GROWTH_RETENCAO: {
    title: "Share Baixo + Satisfação Baixa",
    subtitle: "Dupla frente: Aquisição + Infraestrutura",
  },
};

export const QUADRANT_CONFIG: Record<
  Quadrant,
  { label: string; color: string; bg: string; dot: string; mapColor: string }
> = {
  GROWTH: {
    label: "Growth",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    dot: "#22C55E",
    mapColor: "#22C55E",
  },
  UPSELL: {
    label: "Upsell",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    dot: "#8B5CF6",
    mapColor: "#8B5CF6",
  },
  RETENCAO: {
    label: "Retenção",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    dot: "#EF4444",
    mapColor: "#EF4444",
  },
  GROWTH_RETENCAO: {
    label: "Growth + Retenção",
    color: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    dot: "#F97316",
    mapColor: "#F97316",
  },
};

export const TECH_CONFIG: Record<
  Technology,
  { label: string; color: string; bg: string }
> = {
  FIBRA: { label: "Fibra", color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  MOVEL: { label: "Móvel", color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  AMBOS: { label: "Fibra + Móvel", color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bg: string }
> = {
  ALTA: { label: "Alta Prioridade", color: "#f87171", bg: "rgba(239,68,68,0.15)" },
  MEDIA: { label: "Média Prioridade", color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  BAIXA: { label: "Baixa Prioridade", color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
};

export const CAMADA2_CONFIG: Record<
  Camada2Class,
  { label: string; color: string; bg: string; short: string }
> = {
  SAUDAVEL: {
    label: "Saudável",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.15)",
    short: "Saudável",
  },
  MELHORA_QUALIDADE: {
    label: "Melhora da Qualidade",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.15)",
    short: "Melhora Qualidade",
  },
  AUMENTO_CAPACIDADE: {
    label: "Aumento de Capacidade",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.15)",
    short: "Aumento Capacidade",
  },
  EXPANSAO_NOVA_AREA: {
    label: "Expansão Nova Área",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.15)",
    short: "Expansão Nova Área",
  },
  EXPANSAO_COBERTURA: {
    label: "Expansão de Cobertura",
    color: "#1D4ED8",
    bg: "rgba(29,78,216,0.15)",
    short: "Expansão Cobertura",
  },
};

export function priorityFromScore(score: number): Priority {
  if (score >= 7.5) return "ALTA";
  if (score >= 6.0) return "MEDIA";
  return "BAIXA";
}
