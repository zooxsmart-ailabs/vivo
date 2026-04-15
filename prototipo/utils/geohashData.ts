// geohashData.ts — Dados e tipos do mapa estratégico Zoox × Vivo
// Design: Clean Analytics — Zoox × Vivo
// Camada 1 (Comercial): GROWTH (verde), UPSELL (roxo), EXPANSAO (cinza), RETENCAO (vermelho)
// Camada 2 (Infraestrutura): Score 0-100 para Fibra e Móvel

// Camada 1 — Quadrantes comerciais (Share × Satisfação)
// GROWTH_RETENCAO = Share Baixo + Satisfação Baixa (dupla frente: aquisição + infraestrutura)
export type Quadrant = "GROWTH" | "UPSELL" | "GROWTH_RETENCAO" | "RETENCAO";
export type TechCategory = "FIBRA" | "MOVEL" | "AMBOS";
export type ShareTrend = "UP" | "DOWN" | "STABLE";

// Camada 2 — Infraestrutura (6 classificações da apresentação)
// Fibra: AUMENTO_CAPACIDADE (tem fibra, saturada >85%) | EXPANSAO_NOVA_AREA (sem fibra, greenfield) | SAUDAVEL (tem fibra, OK)
// Móvel: MELHORA_QUALIDADE (tem cobertura, SpeedTest ruim) | SAUDAVEL (tem cobertura, OK) | EXPANSAO_5G | EXPANSAO_4G (sem cobertura)
export type FibraClassification = "AUMENTO_CAPACIDADE" | "EXPANSAO_NOVA_AREA" | "SAUDAVEL" | "MELHORA_QUALIDADE";
export type MovelClassification = "MELHORA_QUALIDADE" | "SAUDAVEL" | "EXPANSAO_5G" | "EXPANSAO_4G";

// Concorrente no geohash (para tabela comparativa)
export interface ConcorrenteGeohash {
  nome: string;              // Ex: "TIM", "Claro", "NET"
  // Fibra
  coberturaFibra: boolean;   // Tem cobertura fibra na área
  planoFibra: string;        // Plano fibra prioritário (ex: "Fibra 500Mbps") — vazio se sem cobertura
  precoFibra: number;        // Preço fibra (R$) — 0 se sem cobertura
  // Móvel
  coberturaMovel: boolean;   // Tem cobertura móvel na área
  planoMovel: string;        // Plano móvel prioritário (ex: "Pós-pago 5G") — vazio se sem cobertura
  precoMovel: number;        // Preço móvel (R$) — 0 se sem cobertura
}

// ─── Diagnóstico Growth — 4 Pilares ─────────────────────────────────────────
export interface DiagnosticoGrowth {
  // Pilar 01 — Percepção
  scoreOoklaMovel?: number;      // Score SpeedTest Vivo Móvel (0-10)
  scoreOoklaFibra?: number;      // Score SpeedTest Vivo Fibra (0-10)
  scoreHAC?: number;             // Score HAC — avaliação de qualidade fibra (0-10)
  scoreOokla: number;            // Score SpeedTest Vivo geral (0-10) — mantido para compatibilidade
  taxaChamados: number;          // (RAC + SAC 30d) / Base Ativa (%) ex: 2.1 — mantido para compatibilidade
  // Pilar 02 — Concorrência
  sharePenetracao: number;       // % share Vivo (Base / Total Domicílios)
  deltaVsLider: number;          // Score Vivo - Score líder geral (mantido para compatibilidade)
  deltaVsLiderFibra?: number;    // Score Vivo Fibra - Score líder Fibra (ex: -1.5)
  deltaVsLiderMovel?: number;    // Score Vivo Móvel - Score líder Móvel (ex: -2.1)
  scoreLiderFibra?: number;      // Score Ookla do concorrente líder em Fibra (0-10)
  scoreLiderMovel?: number;      // Score Ookla do concorrente líder em Móvel (0-10)
  concorrentes?: ConcorrenteGeohash[]; // Tabela comparativa de concorrentes
  // Pilar 04 — Comportamento
  arpuRelativo: number;          // ARPU geohash / ARPU médio cidade (ex: 1.15)
  canalDominante: string;        // Ex: "Digital", "Loja Física", "Televendas"
  canalPct: number;              // % do canal dominante nas vendas
}

export interface Camada2 {
  fibra: {
    classification: FibraClassification;
    score: number;          // 0-100
    scoreLabel: "Crítico" | "Alto" | "Médio" | "Baixo";
    // Para AUMENTO_CAPACIDADE: taxa de ocupação (%) + valor da área
    taxaOcupacao?: number;  // % (gatilho: >85%)
    portasDisponiveis?: number;
    // Para EXPANSAO_NOVA_AREA: potencial de mercado + sinergia móvel
    potencialMercado?: number; // 0-100
    sinergiaMovel?: number;    // % share móvel Vivo no geohash
  };
  movel: {
    classification: MovelClassification;
    score: number;          // 0-100
    scoreLabel: "Crítico" | "Alto" | "Médio" | "Baixo";
    // Para MELHORA_QUALIDADE: SpeedTest ruim (< benchmark)
    speedtestScore?: number; // 0-100 (intensidade do problema)
    // Para EXPANSAO_5G / EXPANSAO_4G: áreas sem cobertura
    concentracaoRenda?: number; // 0-100
  };
  decisaoIntegrada: string; // texto da decisão combinada
}

export interface OperatorScore {
  name: string;
  score: number;
  color: string;
}

export interface GeohashData {
  id: string;
  label: string;
  neighborhood: string;
  city: string;
  quadrant: Quadrant;
  isTop10: boolean;
  satisfactionScores: OperatorScore[];
  marketShare: {
    percentage: number;
    activeClients: number;
    totalPopulation: number;
    label: string;
  };
  strategy: {
    quadrantLabel: string;
    title: string;
    motive: string;
    color: string;
    bgColor: string;
  };
  // Categorização tecnológica
  technology: TechCategory;
  // Tendência de share (últimos 3 meses)
  shareTrend: {
    direction: ShareTrend;  // UP | DOWN | STABLE
    delta: number;          // variação em pp geral (ex: +2.3 ou -1.8)
    deltaMovel?: number;    // variação de share móvel em pp
    deltaFibra?: number;    // variação de share fibra em pp
    shareMovel?: number;    // % share Vivo móvel no geohash
    shareFibra?: number;    // % share Vivo fibra no geohash
    // Dados para tooltip de cálculo do share
    fibra?: {
      domiciliosComFibra: number;
      totalDomicilios: number;
    };
    movel?: {
      pessoasComErb: number;
      populacaoResidente: number;
    };
  };
  // Dados CRM (Vivo)
  crm?: {
    arpu: number;           // ARPU médio mensal (R$)
    deviceTier: "Premium" | "Mid" | "Basic"; // Tier do dispositivo
    planType: string;       // Ex: "Fibra 500Mbps", "Pós-pago 5G"
    arpuMovel?: number;     // ARPU móvel (R$)
    arpuFibra?: number;     // ARPU fibra (R$)
    planoMovel?: string;    // Plano móvel mais relevante: "Pré", "Pós", "Controle"
  };
  // Dados SpeedTest
  speedtest?: {
    downloadMbps: number;   // Download médio (Mbps)
    latencyMs: number;      // Latência média (ms)
    qualityLabel: "Excelente" | "Bom" | "Razoável" | "Ruim";
  };
  // Dados demográficos Zoox
  demographics?: {
    avgIncome: number;        // Renda média mensal (R$)
    incomeLabel: string;      // Ex: "Alto", "Médio-Alto"
    populationDensity: number; // hab/km²
    populationGrowth: number;  // % crescimento anual
    growthLabel: string;       // Ex: "Alto", "Moderado"
    technology: string;        // Ex: "Fibra + 5G"
    severity: "Alta" | "Média" | "Baixa";
  };
  // Diagnóstico Growth — 4 pilares
  diagnostico?: DiagnosticoGrowth;
  // Camada 2 — Infraestrutura
  camada2?: Camada2;
  lat: number;
  lng: number;
}

// Cores alinhadas com a apresentação: GROWTH=verde, UPSELL=roxo, GROWTH_RETENCAO=laranja, RETENCAO=vermelho
export const QUADRANT_COLORS: Record<Quadrant, { fill: string; stroke: string; label: string; hex: string }> = {
  GROWTH:          { fill: "rgba(34, 197, 94, 0.45)",  stroke: "rgba(34, 197, 94, 0.8)",  label: "GROWTH",          hex: "#22C55E" },
  UPSELL:          { fill: "rgba(124, 58, 237, 0.45)", stroke: "rgba(124, 58, 237, 0.8)", label: "UPSELL",          hex: "#7C3AED" },
  GROWTH_RETENCAO: { fill: "rgba(249, 115, 22, 0.45)", stroke: "rgba(249, 115, 22, 0.8)", label: "GROWTH+RETENÇÃO", hex: "#F97316" },
  RETENCAO:        { fill: "rgba(239, 68, 68, 0.45)",  stroke: "rgba(239, 68, 68, 0.8)",  label: "RETENÇÃO",        hex: "#EF4444" },
};

// Labels de exibição (Camada 1 Comercial)
export const QUADRANT_LABELS: Record<Quadrant, string> = {
  GROWTH:          "Growth",
  UPSELL:          "Upsell",
  GROWTH_RETENCAO: "Growth + Retenção",
  RETENCAO:        "Retenção",
};

// Subtítulos estratégicos conforme apresentação
export const QUADRANT_SUBTITLES: Record<Quadrant, string> = {
  GROWTH:          "Share Baixo + Satisfação Alta — Janela de Ataque",
  UPSELL:          "Share Alto + Satisfação Alta — Maximizar Receita",
  GROWTH_RETENCAO: "Share Baixo + Satisfação Baixa — Dupla Frente: Aquisição + Infraestrutura",
  RETENCAO:        "Share Alto + Satisfação Baixa — Risco Iminente de Churn",
};

export const QUADRANT_ORDER: Quadrant[] = ["GROWTH", "UPSELL", "GROWTH_RETENCAO", "RETENCAO"];

// ─── Benchmarks de referência ──────────────────────────────────────────────
export const BENCHMARKS = {
  // Satisfação média Vivo
  satisfacaoMediaEstadoSP: 6.8,   // Média estadual SP (SpeedTest)
  satisfacaoMediaNacional: 6.5,   // Média nacional
  satisfacaoMediaMercado: 7.2,    // Média do mercado (todas operadoras SP)
  // Share de mercado Vivo
  shareMediaNacional: 32,         // Share médio nacional Vivo (%)
  shareMediaEstadoSP: 35,         // Share médio estadual SP (%)
  shareMediaCidadeSP: 38,         // Share médio cidade SP (%)
  // Densidade de clientes
  densidadeMediaSP: 420,          // Clientes ativos por km² (média SP)
  // Churn
  churnMedioNacional: 2.8,        // % churn mensal médio nacional
  churnMedioSP: 2.4,              // % churn mensal médio SP
};

// Geohashes reais de São Paulo (precisão 6 — ~1.2km x 0.6km)
export const GEOHASH_DATA: GeohashData[] = [
  // ─── ZONA NORTE — OPORTUNIDADE ───────────────────────────────────────────
  {
    id: "6gyf4b",
    label: "6gyf4b",
    neighborhood: "Santana",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 6.1, color: "#EAB308" },
      { name: "TIM",   score: 8.2, color: "#22C55E" },
      { name: "CLARO", score: 7.4, color: "#EF4444" },
    ],
    marketShare: { percentage: 28, activeClients: 3100, totalPopulation: 11000, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Share baixo com satisfação competitiva. Alto potencial de crescimento com ações de aquisição.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },

    shareTrend: { direction: "UP", delta: 2.1, deltaMovel: 2.1, deltaFibra: 0.0, shareMovel: 25, shareFibra: 0,
      movel: { pessoasComErb: 3100, populacaoResidente: 11000 },
    },
    crm: { arpu: 89, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 89, arpuFibra: 0, planoMovel: "Pós" },
    speedtest: { downloadMbps: 42, latencyMs: 38, qualityLabel: "Razoável" },
    demographics: { avgIncome: 5200, incomeLabel: "Médio", populationDensity: 9200, populationGrowth: 2.8, growthLabel: "Moderado", technology: "4G", severity: "Média" },
    diagnostico: {
      scoreOokla: 6.1, scoreOoklaMovel: 5.8, scoreOoklaFibra: 5.2, scoreHAC: 5.5,
      taxaChamados: 4.2, sharePenetracao: 25, deltaVsLider: -2.1,
      deltaVsLiderFibra: -2.2, deltaVsLiderMovel: -2.4,
      scoreLiderFibra: 7.4, scoreLiderMovel: 8.2,
      arpuRelativo: 0.92, canalDominante: "Televendas", canalPct: 48,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 79.99 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 72, scoreLabel: "Alto", potencialMercado: 68, sinergiaMovel: 28 },
      movel: { classification: "MELHORA_QUALIDADE", score: 65, scoreLabel: "Alto"},
      decisaoIntegrada: "Expandir fibra aproveitando base móvel existente. Melhorar qualidade 4G para reduzir gap de satisfação vs TIM.",
    },
    technology: "MOVEL",
    lat: -23.5015, lng: -46.6280,
  },
  {
    id: "6gyf4c",
    label: "6gyf4c",
    neighborhood: "Tucuruvi",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.8, color: "#EAB308" },
      { name: "TIM",   score: 7.9, color: "#22C55E" },
      { name: "CLARO", score: 7.1, color: "#EF4444" },
    ],
    marketShare: { percentage: 31, activeClients: 2800, totalPopulation: 9000, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Região com crescimento demográfico e baixo share Vivo. Potencial para campanhas de aquisição.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },

    shareTrend: { direction: "UP", delta: 1.4, deltaMovel: 1.4, deltaFibra: 0.8, shareMovel: 31, shareFibra: 18,
      movel: { pessoasComErb: 2800, populacaoResidente: 9000 },
    },
    crm: { arpu: 76, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 76, arpuFibra: 95, planoMovel: "Pós" },
    speedtest: { downloadMbps: 55, latencyMs: 32, qualityLabel: "Bom" },
    demographics: { avgIncome: 4800, incomeLabel: "Médio", populationDensity: 7800, populationGrowth: 3.1, growthLabel: "Alto", technology: "4G + Fibra", severity: "Média" },
    diagnostico: {
      scoreOokla: 8.1, scoreOoklaMovel: 7.8, scoreOoklaFibra: 8.3, scoreHAC: 8.1,
      taxaChamados: 2.4, sharePenetracao: 31, deltaVsLider: 0.6,
      deltaVsLiderFibra: +0.5, deltaVsLiderMovel: +0.8,
      scoreLiderFibra: 7.8, scoreLiderMovel: 7.0,
      arpuRelativo: 0.85, canalDominante: "Digital", canalPct: 55,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 300Mbps", precoFibra: 89.90,  coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 200Mbps", precoFibra: 84.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 68, scoreLabel: "Alto", potencialMercado: 62, sinergiaMovel: 31 },
      movel: { classification: "SAUDAVEL", score: 30, scoreLabel: "Baixo"},
      decisaoIntegrada: "Priorizar expansão de fibra. Rede móvel estável, sem intervenção urgente.",
    },
    technology: "AMBOS",
    lat: -23.4780, lng: -46.6050,
  },
  {
    id: "6gyf4f",
    label: "6gyf4f",
    neighborhood: "Vila Guilherme",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.0, color: "#EAB308" },
      { name: "TIM",   score: 8.0, color: "#22C55E" },
      { name: "CLARO", score: 6.9, color: "#EF4444" },
    ],
    marketShare: { percentage: 29, activeClients: 2400, totalPopulation: 8300, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Share abaixo da média regional. Satisfação Vivo competitiva — momento ideal para expansão.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },

    shareTrend: { direction: "STABLE", delta: 0.3, deltaMovel: 0.3, deltaFibra: 0.0, shareMovel: 29, shareFibra: 0,
      movel: { pessoasComErb: 2400, populacaoResidente: 8300 },
    },
    crm: { arpu: 82, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 82, arpuFibra: 0, planoMovel: "Pós" },
    speedtest: { downloadMbps: 61, latencyMs: 29, qualityLabel: "Bom" },
    demographics: { avgIncome: 5500, incomeLabel: "Médio", populationDensity: 6900, populationGrowth: 1.9, growthLabel: "Moderado", technology: "4G", severity: "Média" },
    diagnostico: {
      scoreOokla: 7.9, scoreOoklaMovel: 7.6, scoreOoklaFibra: 7.8, scoreHAC: 7.5,
      taxaChamados: 2.2, sharePenetracao: 29, deltaVsLider: 0.3,
      deltaVsLiderFibra: +0.4, deltaVsLiderMovel: +0.3,
      scoreLiderFibra: 7.4, scoreLiderMovel: 7.3,
      arpuRelativo: 0.95, canalDominante: "Loja Física", canalPct: 42,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: false, planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 61, scoreLabel: "Médio", potencialMercado: 55, sinergiaMovel: 29 },
      movel: { classification: "SAUDAVEL", score: 25, scoreLabel: "Baixo"},
      decisaoIntegrada: "Avaliar viabilidade de expansão de fibra. Rede móvel sem necessidade de intervenção.",
    },
    technology: "MOVEL",
    lat: -23.5100, lng: -46.5980,
  },
  {
    id: "6gyf4g",
    label: "6gyf4g",
    neighborhood: "Mandaqui",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.5, color: "#EAB308" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 7.2, color: "#EF4444" },
    ],
    marketShare: { percentage: 25, activeClients: 1900, totalPopulation: 7600, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Mercado pouco explorado. Infraestrutura de rede adequada para suportar crescimento.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },

    shareTrend: { direction: "DOWN", delta: -1.2, deltaMovel: -1.2, deltaFibra: 0.0, shareMovel: 26, shareFibra: 0,
      movel: { pessoasComErb: 1900, populacaoResidente: 7600 },
    },
    crm: { arpu: 71, deviceTier: "Basic", planType: "Pós-pago 4G", arpuMovel: 71, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 38, latencyMs: 44, qualityLabel: "Razoável" },
    demographics: { avgIncome: 4100, incomeLabel: "Médio", populationDensity: 6300, populationGrowth: 1.4, growthLabel: "Moderado", technology: "4G", severity: "Baixa" },
    diagnostico: {
      scoreOokla: 6.4, scoreOoklaMovel: 6.2, scoreOoklaFibra: 5.8, scoreHAC: 5.6,
      taxaChamados: 3.9, sharePenetracao: 26, deltaVsLider: -1.6,
      deltaVsLiderFibra: -1.4, deltaVsLiderMovel: -1.6,
      scoreLiderFibra: 7.2, scoreLiderMovel: 7.8,
      arpuRelativo: 0.88, canalDominante: "Televendas", canalPct: 38,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 45, scoreLabel: "Médio", potencialMercado: 42 },
      movel: { classification: "MELHORA_QUALIDADE", score: 58, scoreLabel: "Médio"},
      decisaoIntegrada: "Melhorar qualidade 4G como prioridade. Fibra com potencial moderado para fase posterior.",
    },
    technology: "MOVEL",
    lat: -23.4900, lng: -46.6150,
  },

  // ─── CENTRO / OESTE — FORTALEZA ──────────────────────────────────────────
  {
    id: "6gyf48",
    label: "6gyf48",
    neighborhood: "Pinheiros",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 8.1, color: "#22C55E" },
      { name: "TIM",   score: 7.6, color: "#EAB308" },
      { name: "CLARO", score: 7.0, color: "#EF4444" },
    ],
    marketShare: { percentage: 48, activeClients: 5100, totalPopulation: 10600, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Share alto e satisfação superior à concorrência. Manter qualidade e fidelizar base.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "UP", delta: 3.2,
      fibra: { domiciliosComFibra: 5100, totalDomicilios: 10600 },
    },
    crm: { arpu: 198, deviceTier: "Premium", planType: "Fibra 1Gbps" },
    speedtest: { downloadMbps: 920, latencyMs: 8, qualityLabel: "Excelente" },
    demographics: { avgIncome: 14200, incomeLabel: "Alto", populationDensity: 16800, populationGrowth: 1.2, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 78, scoreLabel: "Alto", taxaOcupacao: 88, portasDisponiveis: 12 },
      movel: { classification: "MELHORA_QUALIDADE", score: 82, scoreLabel: "Crítico"},
      decisaoIntegrada: "Ampliar capacidade de fibra (ocupação crítica). Upgrade urgente para 5G para atender perfil premium insatisfeito com latência.",
    },
    technology: "FIBRA",
    lat: -23.5650, lng: -46.6830,
  },
  {
    id: "6gyf49",
    label: "6gyf49",
    neighborhood: "Vila Madalena",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 8.4, color: "#22C55E" },
      { name: "TIM",   score: 7.8, color: "#EAB308" },
      { name: "CLARO", score: 7.3, color: "#EF4444" },
    ],
    marketShare: { percentage: 45, activeClients: 3800, totalPopulation: 8400, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Posição dominante consolidada. Foco em upsell e programas de fidelidade.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "UP", delta: 1.8,
      fibra: { domiciliosComFibra: 3800, totalDomicilios: 8400 },
    },
    crm: { arpu: 215, deviceTier: "Premium", planType: "Fibra 1Gbps" },
    speedtest: { downloadMbps: 880, latencyMs: 9, qualityLabel: "Excelente" },
    demographics: { avgIncome: 12800, incomeLabel: "Alto", populationDensity: 14200, populationGrowth: 0.8, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 88, scoreLabel: "Crítico", taxaOcupacao: 92, portasDisponiveis: 8 },
      movel: { classification: "MELHORA_QUALIDADE", score: 92, scoreLabel: "Crítico"},
      decisaoIntegrada: "Priorizar expansão de fibra aproveitando base móvel existente. Upgrade urgente para 5G para atender público de alta renda insatisfeito com a latência atual.",
    },
    technology: "FIBRA",
    lat: -23.5500, lng: -46.6900,
  },
  {
    id: "6gyf4d",
    label: "6gyf4d",
    neighborhood: "Consolação",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.9, color: "#22C55E" },
      { name: "TIM",   score: 7.5, color: "#EAB308" },
      { name: "CLARO", score: 6.5, color: "#EF4444" },
    ],
    marketShare: { percentage: 44, activeClients: 4400, totalPopulation: 10000, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Liderança em satisfação. Investir em experiência premium para manter diferencial.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "STABLE", delta: 0.5,
      fibra: { domiciliosComFibra: 4400, totalDomicilios: 10000 },
    },
    crm: { arpu: 176, deviceTier: "Premium", planType: "Fibra 600Mbps" },
    speedtest: { downloadMbps: 580, latencyMs: 11, qualityLabel: "Excelente" },
    demographics: { avgIncome: 11500, incomeLabel: "Alto", populationDensity: 13400, populationGrowth: 0.5, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 42, scoreLabel: "Baixo", taxaOcupacao: 74 },
      movel: { classification: "MELHORA_QUALIDADE", score: 68, scoreLabel: "Alto"},
      decisaoIntegrada: "Fibra estável, sem intervenção urgente. Priorizar upgrade 5G para manter satisfação da base premium.",
    },
    technology: "FIBRA",
    lat: -23.5480, lng: -46.6590,
  },
  {
    id: "6gyf4e",
    label: "6gyf4e",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.6, color: "#22C55E" },
      { name: "TIM",   score: 7.4, color: "#EAB308" },
      { name: "CLARO", score: 6.8, color: "#EF4444" },
    ],
    marketShare: { percentage: 41, activeClients: 3600, totalPopulation: 8800, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Região central com alta densidade. Manter investimento em qualidade de rede.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "DOWN", delta: -0.9,
      fibra: { domiciliosComFibra: 3600, totalDomicilios: 8800 },
    },
    crm: { arpu: 154, deviceTier: "Premium", planType: "Fibra 500Mbps" },
    speedtest: { downloadMbps: 490, latencyMs: 13, qualityLabel: "Excelente" },
    demographics: { avgIncome: 9800, incomeLabel: "Alto", populationDensity: 18200, populationGrowth: -0.2, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 38, scoreLabel: "Baixo", taxaOcupacao: 71 },
      movel: { classification: "EXPANSAO_4G", score: 55, scoreLabel: "Médio"},
      decisaoIntegrada: "Fibra estável. Expandir cobertura 5G para manter liderança em região de alta densidade.",
    },
    technology: "AMBOS",
    lat: -23.5560, lng: -46.6440,
  },
  {
    id: "6gyf46",
    label: "6gyf46",
    neighborhood: "Lapa",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.8, color: "#22C55E" },
      { name: "TIM",   score: 7.2, color: "#EAB308" },
      { name: "CLARO", score: 6.6, color: "#EF4444" },
    ],
    marketShare: { percentage: 39, activeClients: 3200, totalPopulation: 8200, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Boa posição competitiva. Oportunidade de crescimento incremental com ações de aquisição.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "UP", delta: 2.4,
      fibra: { domiciliosComFibra: 3200, totalDomicilios: 8200 },
    },
    crm: { arpu: 142, deviceTier: "Premium", planType: "Fibra 500Mbps" },
    speedtest: { downloadMbps: 510, latencyMs: 12, qualityLabel: "Excelente" },
    demographics: { avgIncome: 8900, incomeLabel: "Alto", populationDensity: 11200, populationGrowth: 1.5, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 35, scoreLabel: "Baixo", taxaOcupacao: 68 },
      movel: { classification: "MELHORA_QUALIDADE", score: 58, scoreLabel: "Médio"},
      decisaoIntegrada: "Manter fibra. Melhorar qualidade 5G para reter base premium e evitar migração para concorrência.",
    },
    technology: "FIBRA",
    lat: -23.5260, lng: -46.7050,
  },
  {
    id: "6gyf47",
    label: "6gyf47",
    neighborhood: "Perdizes",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 8.0, color: "#22C55E" },
      { name: "TIM",   score: 7.3, color: "#EAB308" },
      { name: "CLARO", score: 6.9, color: "#EF4444" },
    ],
    marketShare: { percentage: 43, activeClients: 3900, totalPopulation: 9100, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Satisfação Vivo líder. Região residencial premium — foco em planos de alto valor.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "UP", delta: 1.1,
      fibra: { domiciliosComFibra: 3900, totalDomicilios: 9100 },
    },
    crm: { arpu: 168, deviceTier: "Premium", planType: "Fibra 600Mbps" },
    speedtest: { downloadMbps: 620, latencyMs: 10, qualityLabel: "Excelente" },
    demographics: { avgIncome: 10200, incomeLabel: "Alto", populationDensity: 12800, populationGrowth: 0.9, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 40, scoreLabel: "Baixo", taxaOcupacao: 72 },
      movel: { classification: "MELHORA_QUALIDADE", score: 62, scoreLabel: "Médio"},
      decisaoIntegrada: "Fibra estável. Upgrade 5G para manter experiência premium e maximizar ARPU.",
    },
    technology: "AMBOS",
    lat: -23.5350, lng: -46.6750,
  },
  {
    id: "6gyf4bf",
    label: "6gyf4bf",
    neighborhood: "Jardins",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 8.6, color: "#22C55E" },
      { name: "TIM",   score: 7.9, color: "#EAB308" },
      { name: "CLARO", score: 7.4, color: "#EF4444" },
    ],
    marketShare: { percentage: 52, activeClients: 5800, totalPopulation: 11200, label: "Muito Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Posição dominante com satisfação líder. Proteger base e investir em upsell premium.",
      color: "#5B21B6",
      bgColor: "#EDE9FE",
    },

    shareTrend: { direction: "UP", delta: 4.1,
      fibra: { domiciliosComFibra: 5800, totalDomicilios: 11200 },
    },
    technology: "FIBRA",
    lat: -23.5614, lng: -46.6563,
  },

  // ─── SUL — EXPANSÃO ──────────────────────────────────────────────────────
  {
    id: "6gyf1u",
    label: "6gyf1u",
    neighborhood: "Santo André",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.9, color: "#EAB308" },
      { name: "TIM",   score: 7.1, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EF4444" },
    ],
    marketShare: { percentage: 35, activeClients: 2900, totalPopulation: 8300, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "EXPANSÃO",
      motive: "Mercado equilibrado. Investimento gradual em cobertura e qualidade para crescimento sustentável.",
      color: "#475569",
      bgColor: "#F1F5F9",
    },
    demographics: {
      avgIncome: 4200, incomeLabel: "Médio",
      populationDensity: 6800, populationGrowth: 2.1, growthLabel: "Moderado",
      technology: "4G + Fibra", severity: "Média",
    },
    shareTrend: { direction: "STABLE", delta: 0.2,
      movel: { pessoasComErb: 2900, populacaoResidente: 8300 },
    },
    crm: { arpu: 94, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 48, latencyMs: 36, qualityLabel: "Razoável" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 58, scoreLabel: "Médio", potencialMercado: 52, sinergiaMovel: 35 },
      movel: { classification: "EXPANSAO_4G", score: 62, scoreLabel: "Médio"},
      decisaoIntegrada: "Expandir cobertura 4G para reduzir white spots. Avaliar fibra após consolidação móvel.",
    },
    technology: "AMBOS",
    lat: -23.6640, lng: -46.5380,
  },
  {
    id: "6gyf1v",
    label: "6gyf1v",
    neighborhood: "São Bernardo do Campo",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.1, color: "#EAB308" },
      { name: "TIM",   score: 7.3, color: "#22C55E" },
      { name: "CLARO", score: 6.8, color: "#EF4444" },
    ],
    marketShare: { percentage: 33, activeClients: 3100, totalPopulation: 9400, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "EXPANSÃO",
      motive: "Região industrial em crescimento. Oportunidade com segmento corporativo.",
      color: "#475569",
      bgColor: "#F1F5F9",
    },
    demographics: {
      avgIncome: 5800, incomeLabel: "Médio-Alto",
      populationDensity: 7200, populationGrowth: 3.4, growthLabel: "Alto",
      technology: "Fibra + 5G", severity: "Alta",
    },
    shareTrend: { direction: "UP", delta: 2.7,
      fibra: { domiciliosComFibra: 3100, totalDomicilios: 9400 },
    },
    crm: { arpu: 112, deviceTier: "Mid", planType: "Fibra 300Mbps" },
    speedtest: { downloadMbps: 280, latencyMs: 18, qualityLabel: "Bom" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 74, scoreLabel: "Alto", potencialMercado: 68, sinergiaMovel: 33 },
      movel: { classification: "EXPANSAO_4G", score: 55, scoreLabel: "Médio"},
      decisaoIntegrada: "Expandir fibra em região industrial de alto crescimento. Ampliar cobertura 4G para segmento corporativo.",
    },
    technology: "FIBRA",
    lat: -23.6940, lng: -46.5650,
  },
  {
    id: "6gyf1y",
    label: "6gyf1y",
    neighborhood: "Ipiranga",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.7, color: "#EAB308" },
      { name: "TIM",   score: 7.0, color: "#22C55E" },
      { name: "CLARO", score: 6.9, color: "#EF4444" },
    ],
    marketShare: { percentage: 30, activeClients: 2600, totalPopulation: 8700, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "EXPANSÃO",
      motive: "Potencial de crescimento moderado. Melhorar qualidade de rede para aumentar satisfação.",
      color: "#475569",
      bgColor: "#F1F5F9",
    },
    demographics: {
      avgIncome: 3900, incomeLabel: "Médio",
      populationDensity: 9100, populationGrowth: 1.8, growthLabel: "Moderado",
      technology: "4G + Fibra", severity: "Média",
    },
    shareTrend: { direction: "DOWN", delta: -1.5,
      movel: { pessoasComErb: 2600, populacaoResidente: 8700 },
    },
    crm: { arpu: 78, deviceTier: "Basic", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 35, latencyMs: 48, qualityLabel: "Razoável" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 48, scoreLabel: "Médio", potencialMercado: 44 },
      movel: { classification: "MELHORA_QUALIDADE", score: 70, scoreLabel: "Alto"},
      decisaoIntegrada: "Melhorar qualidade 4G como prioridade. Avaliar viabilidade de fibra em fase posterior.",
    },
    technology: "MOVEL",
    lat: -23.5900, lng: -46.6050,
  },
  {
    id: "6gyf1z",
    label: "6gyf1z",
    neighborhood: "Saúde",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.2, color: "#EAB308" },
      { name: "TIM",   score: 7.4, color: "#22C55E" },
      { name: "CLARO", score: 7.1, color: "#EF4444" },
    ],
    marketShare: { percentage: 34, activeClients: 2800, totalPopulation: 8200, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "EXPANSÃO",
      motive: "Mercado competitivo equilibrado. Foco em diferenciação por serviço e atendimento.",
      color: "#475569",
      bgColor: "#F1F5F9",
    },
    demographics: {
      avgIncome: 6200, incomeLabel: "Alto",
      populationDensity: 11400, populationGrowth: 2.6, growthLabel: "Moderado",
      technology: "Fibra + 5G", severity: "Alta",
    },
    crm: { arpu: 108, deviceTier: "Mid", planType: "Fibra 300Mbps" },
    speedtest: { downloadMbps: 310, latencyMs: 16, qualityLabel: "Bom" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 65, scoreLabel: "Alto", taxaOcupacao: 86, portasDisponiveis: 18 },
      movel: { classification: "EXPANSAO_4G", score: 48, scoreLabel: "Médio"},
      decisaoIntegrada: "Ampliar capacidade de fibra (ocupação elevada). Expandir cobertura 5G em região de alta renda.",
    },
    shareTrend: { direction: "UP", delta: 1.3,
      fibra: { domiciliosComFibra: 2800, totalDomicilios: 8200 },
    },
    technology: "FIBRA",
    lat: -23.6100, lng: -46.6280,
  },
  {
    id: "6gyf4n",
    label: "6gyf4n",
    neighborhood: "Itaim Bibi",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.3, color: "#EAB308" },
      { name: "TIM",   score: 7.5, color: "#22C55E" },
      { name: "CLARO", score: 7.2, color: "#EF4444" },
    ],
    marketShare: { percentage: 36, activeClients: 3400, totalPopulation: 9400, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "EXPANSÃO",
      motive: "Região de alto poder aquisitivo com share ainda crescendo. Foco em planos premium.",
      color: "#475569",
      bgColor: "#F1F5F9",
    },
    demographics: {
      avgIncome: 12500, incomeLabel: "Alto",
      populationDensity: 14200, populationGrowth: 4.1, growthLabel: "Alto",
      technology: "Fibra + 5G", severity: "Alta",
    },
    shareTrend: { direction: "UP", delta: 3.8,
      fibra: { domiciliosComFibra: 3400, totalDomicilios: 9400 },
    },
    crm: { arpu: 168, deviceTier: "Premium", planType: "Fibra 600Mbps" },
    speedtest: { downloadMbps: 580, latencyMs: 11, qualityLabel: "Excelente" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 82, scoreLabel: "Crítico", taxaOcupacao: 91, portasDisponiveis: 9 },
      movel: { classification: "MELHORA_QUALIDADE", score: 78, scoreLabel: "Alto"},
      decisaoIntegrada: "Ampliar capacidade de fibra urgente (ocupação crítica). Upgrade 5G para atender demanda de alta renda.",
    },
    technology: "FIBRA",
    lat: -23.5850, lng: -46.6780,
  },

  // ─── LESTE — RISCO ───────────────────────────────────────────────────────
  {
    id: "6gyf5b",
    label: "6gyf5b",
    neighborhood: "Penha",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 5.8, color: "#EF4444" },
      { name: "TIM",   score: 7.9, color: "#22C55E" },
      { name: "CLARO", score: 7.2, color: "#EAB308" },
    ],
    marketShare: { percentage: 38, activeClients: 3400, totalPopulation: 8900, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Share médio mas satisfação crítica. Prioridade para ações de retenção imediata.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },

    shareTrend: { direction: "DOWN", delta: -2.8,
      movel: { pessoasComErb: 3400, populacaoResidente: 8900 },
    },
    crm: { arpu: 88, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 28, latencyMs: 62, qualityLabel: "Ruim" },
    demographics: { avgIncome: 3800, incomeLabel: "Médio", populationDensity: 8400, populationGrowth: 1.1, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    diagnostico: { scoreOokla: 6.5, taxaChamados: 3.8, sharePenetracao: 27, deltaVsLider: -1.8, arpuRelativo: 1.22, canalDominante: "Digital", canalPct: 67 },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 35, scoreLabel: "Baixo", potencialMercado: 32 },
      movel: { classification: "MELHORA_QUALIDADE", score: 88, scoreLabel: "Crítico"},
      decisaoIntegrada: "Intervenção urgente na rede 4G. Qualidade crítica gerando churn acelerado. Prioridade máxima.",
    },
    technology: "MOVEL",
    lat: -23.5250, lng: -46.5350,
  },
  {
    id: "6gyf5c",
    label: "6gyf5c",
    neighborhood: "Ermelino Matarazzo",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.5, color: "#EF4444" },
      { name: "TIM",   score: 8.1, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EAB308" },
    ],
    marketShare: { percentage: 36, activeClients: 2900, totalPopulation: 8000, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Satisfação muito abaixo da concorrência. Risco alto de churn. Ação urgente necessária.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },

    shareTrend: { direction: "DOWN", delta: -3.1,
      movel: { pessoasComErb: 2900, populacaoResidente: 8000 },
    },
    crm: { arpu: 72, deviceTier: "Basic", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 22, latencyMs: 74, qualityLabel: "Ruim" },
    demographics: { avgIncome: 2900, incomeLabel: "Baixo", populationDensity: 7200, populationGrowth: 0.8, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    diagnostico: { scoreOokla: 6.2, taxaChamados: 4.5, sharePenetracao: 24, deltaVsLider: -2.3, arpuRelativo: 1.35, canalDominante: "Digital", canalPct: 72 },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 28, scoreLabel: "Baixo", potencialMercado: 25 },
      movel: { classification: "MELHORA_QUALIDADE", score: 92, scoreLabel: "Crítico"},
      decisaoIntegrada: "Situação crítica. Qualidade 4G muito abaixo do aceitável. Ação imediata para evitar churn em massa.",
    },
    technology: "MOVEL",
    lat: -23.4950, lng: -46.5050,
  },
  {
    id: "6gyf58",
    label: "6gyf58",
    neighborhood: "Itaquera",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.2, color: "#EF4444" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 6.9, color: "#EAB308" },
    ],
    marketShare: { percentage: 40, activeClients: 3800, totalPopulation: 9500, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Cluster Leste com alto volume e satisfação crítica. Prioridade máxima para ações de retenção.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },

    shareTrend: { direction: "DOWN", delta: -2.2,
      movel: { pessoasComErb: 3800, populacaoResidente: 9500 },
    },
    crm: { arpu: 95, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 31, latencyMs: 58, qualityLabel: "Ruim" },
    demographics: { avgIncome: 3200, incomeLabel: "Médio", populationDensity: 9100, populationGrowth: 0.6, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 32, scoreLabel: "Baixo", potencialMercado: 30 },
      movel: { classification: "MELHORA_QUALIDADE", score: 95, scoreLabel: "Crítico"},
      decisaoIntegrada: "Prioridade máxima. Alto volume de clientes em risco. Intervenção imediata na qualidade 4G.",
    },
    technology: "AMBOS",
    lat: -23.5350, lng: -46.4580,
  },
  {
    id: "6gyf59",
    label: "6gyf59",
    neighborhood: "Guaianases",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.6, color: "#EF4444" },
      { name: "TIM",   score: 7.6, color: "#22C55E" },
      { name: "CLARO", score: 7.1, color: "#EAB308" },
    ],
    marketShare: { percentage: 37, activeClients: 3100, totalPopulation: 8400, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Região periférica com qualidade de rede insatisfatória. Investimento em infraestrutura urgente.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },

    shareTrend: { direction: "DOWN", delta: -1.9,
      movel: { pessoasComErb: 3100, populacaoResidente: 8400 },
    },
    crm: { arpu: 68, deviceTier: "Basic", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 25, latencyMs: 68, qualityLabel: "Ruim" },
    demographics: { avgIncome: 2600, incomeLabel: "Baixo", populationDensity: 6800, populationGrowth: 0.4, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 22, scoreLabel: "Baixo", potencialMercado: 20 },
      movel: { classification: "MELHORA_QUALIDADE", score: 85, scoreLabel: "Crítico"},
      decisaoIntegrada: "Qualidade 4G crítica em região periférica. Intervenção urgente para evitar churn.",
    },
    technology: "MOVEL",
    lat: -23.5450, lng: -46.4250,
  },
  {
    id: "6gyf56",
    label: "6gyf56",
    neighborhood: "São Mateus",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.9, color: "#EF4444" },
      { name: "TIM",   score: 7.5, color: "#22C55E" },
      { name: "CLARO", score: 6.8, color: "#EAB308" },
    ],
    marketShare: { percentage: 35, activeClients: 2700, totalPopulation: 7700, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Gap de satisfação significativo vs concorrência. Programa de melhoria de rede necessário.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },

    shareTrend: { direction: "DOWN", delta: -1.6,
      movel: { pessoasComErb: 2700, populacaoResidente: 7700 },
    },
    crm: { arpu: 74, deviceTier: "Basic", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 29, latencyMs: 65, qualityLabel: "Ruim" },
    demographics: { avgIncome: 3100, incomeLabel: "Médio", populationDensity: 7200, populationGrowth: 0.9, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 26, scoreLabel: "Baixo", potencialMercado: 24 },
      movel: { classification: "MELHORA_QUALIDADE", score: 82, scoreLabel: "Crítico"},
      decisaoIntegrada: "Gap de qualidade significativo vs concorrência. Programa de melhoria de rede 4G prioritário.",
    },
    technology: "MOVEL",
    lat: -23.5700, lng: -46.4450,
  },

  // ─── ZONA OESTE — GROWTH ──────────────────────────────────────────────────────
  {
    id: "6gyf3u",
    label: "6gyf3u",
    neighborhood: "Pinheiros",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 7.8, color: "#EAB308" },
      { name: "TIM",   score: 7.2, color: "#22C55E" },
      { name: "CLARO", score: 7.5, color: "#EF4444" },
    ],
    marketShare: { percentage: 27, activeClients: 4200, totalPopulation: 15600, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Bairro premium com share abaixo do potencial. Vivo lidera em satisfação — janela de ataque ideal.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: { direction: "UP", delta: 1.8, deltaMovel: 0.9, deltaFibra: 1.8, shareMovel: 32, shareFibra: 27,
      fibra: { domiciliosComFibra: 4200, totalDomicilios: 15600 } },
    crm: { arpu: 148, deviceTier: "Premium", planType: "Fibra 1Gbps", arpuMovel: 98, arpuFibra: 148, planoMovel: "Pós" },
    speedtest: { downloadMbps: 210, latencyMs: 12, qualityLabel: "Excelente" },
    demographics: { avgIncome: 14500, incomeLabel: "Alto", populationDensity: 12800, populationGrowth: 2.1, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Média" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 74, scoreLabel: "Alto", taxaOcupacao: 88, portasDisponiveis: 12 },
      movel: { classification: "SAUDAVEL", score: 18, scoreLabel: "Baixo"},
      decisaoIntegrada: "Aumentar capacidade de fibra para suportar crescimento. Móvel saudável com 5G disponível.",
    },
    technology: "FIBRA",
    diagnostico: {
      scoreOokla: 7.8, scoreOoklaMovel: 7.4, scoreOoklaFibra: 8.2, scoreHAC: 8.0,
      taxaChamados: 3.2, sharePenetracao: 18, deltaVsLider: 0.4,
      deltaVsLiderFibra: +0.7, deltaVsLiderMovel: +0.2,
      scoreLiderFibra: 7.5, scoreLiderMovel: 7.2,
      arpuRelativo: 1.18, canalDominante: "Loja Física", canalPct: 58,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,       coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 84.90  },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 109.90,  coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 89.90  },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 1Gbps",   precoFibra: 139.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0      },
      ],
    },
    lat: -23.5630, lng: -46.6860,
  },
  {
    id: "6gyf3v",
    label: "6gyf3v",
    neighborhood: "Perdizes",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.5, color: "#EAB308" },
      { name: "TIM",   score: 7.0, color: "#22C55E" },
      { name: "CLARO", score: 7.3, color: "#EF4444" },
    ],
    marketShare: { percentage: 30, activeClients: 3600, totalPopulation: 12000, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Bairro residencial de alto padrão com share abaixo da média. Satisfação Vivo superior.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: { direction: "UP", delta: 1.2, deltaMovel: 0.8, deltaFibra: 1.2, shareMovel: 30, shareFibra: 22,
      fibra: { domiciliosComFibra: 3600, totalDomicilios: 12000 } },
    crm: { arpu: 128, deviceTier: "Premium", planType: "Fibra 500Mbps", arpuMovel: 92, arpuFibra: 128, planoMovel: "Pós" },
    speedtest: { downloadMbps: 185, latencyMs: 14, qualityLabel: "Excelente" },
    demographics: { avgIncome: 12800, incomeLabel: "Alto", populationDensity: 10200, populationGrowth: 1.5, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 65, scoreLabel: "Alto", potencialMercado: 70, sinergiaMovel: 30 },
      movel: { classification: "SAUDAVEL", score: 22, scoreLabel: "Baixo"},
      decisaoIntegrada: "Expandir fibra em área de alto potencial. Móvel saudável com 5G.",
    },
    technology: "FIBRA",
    diagnostico: {
      scoreOokla: 8.3, scoreOoklaMovel: 7.9, scoreOoklaFibra: 8.5, scoreHAC: 8.3,
      taxaChamados: 2.6, sharePenetracao: 22, deltaVsLider: 0.9,
      deltaVsLiderFibra: +1.2, deltaVsLiderMovel: +0.9,
      scoreLiderFibra: 7.3, scoreLiderMovel: 7.0,
      arpuRelativo: 1.22, canalDominante: "Digital", canalPct: 52,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,       coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 84.90  },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 109.90,  coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 89.90  },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 99.90,   coberturaMovel: false, planoMovel: "",              precoMovel: 0      },
      ],
    },
    lat: -23.5370, lng: -46.6710,
  },

  // ─── ZONA SUL — UPSELL ────────────────────────────────────────────────────────
  {
    id: "6gyf2s",
    label: "6gyf2s",
    neighborhood: "Moema",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 8.4, color: "#EAB308" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 7.6, color: "#EF4444" },
    ],
    marketShare: { percentage: 48, activeClients: 7200, totalPopulation: 15000, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Líder de mercado com alta satisfação. Potencial de upsell para planos premium e serviços adicionais.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: { direction: "UP", delta: 2.4, fibra: { domiciliosComFibra: 7200, totalDomicilios: 15000 } },
    crm: { arpu: 182, deviceTier: "Premium", planType: "Fibra 1Gbps" },
    speedtest: { downloadMbps: 320, latencyMs: 8, qualityLabel: "Excelente" },
    demographics: { avgIncome: 18500, incomeLabel: "Alto", populationDensity: 11200, populationGrowth: 1.8, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 68, scoreLabel: "Alto", taxaOcupacao: 91, portasDisponiveis: 9 },
      movel: { classification: "SAUDAVEL", score: 15, scoreLabel: "Baixo"},
      decisaoIntegrada: "Ampliar capacidade de fibra para suportar crescimento. Upsell para 2.5Gbps e serviços premium.",
    },
    technology: "FIBRA",
    lat: -23.6010, lng: -46.6640,
  },
  {
    id: "6gyf2q",
    label: "6gyf2q",
    neighborhood: "Campo Belo",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 8.1, color: "#EAB308" },
      { name: "TIM",   score: 7.5, color: "#22C55E" },
      { name: "CLARO", score: 7.4, color: "#EF4444" },
    ],
    marketShare: { percentage: 44, activeClients: 5800, totalPopulation: 13200, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Base consolidada e satisfeita. Oportunidade para migração para planos 1Gbps e serviços adicionais.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: { direction: "STABLE", delta: 0.5, fibra: { domiciliosComFibra: 5800, totalDomicilios: 13200 } },
    crm: { arpu: 156, deviceTier: "Premium", planType: "Fibra 500Mbps" },
    speedtest: { downloadMbps: 280, latencyMs: 10, qualityLabel: "Excelente" },
    demographics: { avgIncome: 16200, incomeLabel: "Alto", populationDensity: 9800, populationGrowth: 1.2, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 32, scoreLabel: "Baixo", taxaOcupacao: 72, portasDisponiveis: 28 },
      movel: { classification: "SAUDAVEL", score: 20, scoreLabel: "Baixo"},
      decisaoIntegrada: "Rede saudável. Foco em upsell e fidelização da base premium.",
    },
    technology: "FIBRA",
    lat: -23.6180, lng: -46.6720,
  },

  // ─── CENTRO — GROWTH + RETENCAO ─────────────────────────────────────────────
  {
    id: "6gyf5x",
    label: "6gyf5x",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.2, color: "#EF4444" },
      { name: "TIM",   score: 7.6, color: "#22C55E" },
      { name: "CLARO", score: 7.1, color: "#EAB308" },
    ],
    marketShare: { percentage: 29, activeClients: 3800, totalPopulation: 13100, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH+RETENÇÃO",
      motive: "Share baixo e satisfação comprometida. Dupla frente: melhorar rede e captar não-clientes.",
      color: "#F97316",
      bgColor: "#FFF7ED",
    },
    shareTrend: { direction: "DOWN", delta: -1.4, movel: { pessoasComErb: 3800, populacaoResidente: 13100 } },
    crm: { arpu: 92, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 35, latencyMs: 52, qualityLabel: "Razoável" },
    demographics: { avgIncome: 6800, incomeLabel: "Médio-Alto", populationDensity: 14200, populationGrowth: 0.8, growthLabel: "Moderado", technology: "4G + Fibra", severity: "Alta" },
    diagnostico: { scoreOokla: 6.9, taxaChamados: 3.3, sharePenetracao: 30, deltaVsLider: -1.4, arpuRelativo: 1.18, canalDominante: "Digital", canalPct: 61 },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 58, scoreLabel: "Médio", potencialMercado: 55, sinergiaMovel: 29 },
      movel: { classification: "MELHORA_QUALIDADE", score: 72, scoreLabel: "Alto"},
      decisaoIntegrada: "Melhorar qualidade 4G e expandir fibra simultaneamente para recuperar satisfação e share.",
    },
    technology: "AMBOS",
    lat: -23.5590, lng: -46.6430,
  },
  {
    id: "6gyf5y",
    label: "6gyf5y",
    neighborhood: "Liberdade",
    city: "São Paulo",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.0, color: "#EF4444" },
      { name: "TIM",   score: 7.4, color: "#22C55E" },
      { name: "CLARO", score: 6.9, color: "#EAB308" },
    ],
    marketShare: { percentage: 31, activeClients: 4100, totalPopulation: 13200, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH+RETENÇÃO",
      motive: "Bairro denso com share baixo e satisfação crítica. Intervenção urgente em rede e aquisição.",
      color: "#F97316",
      bgColor: "#FFF7ED",
    },
    shareTrend: { direction: "DOWN", delta: -2.1, movel: { pessoasComErb: 4100, populacaoResidente: 13200 } },
    crm: { arpu: 85, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 28, latencyMs: 61, qualityLabel: "Ruim" },
    demographics: { avgIncome: 5900, incomeLabel: "Médio", populationDensity: 16800, populationGrowth: 0.6, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    diagnostico: { scoreOokla: 7.2, taxaChamados: 2.2, sharePenetracao: 32, deltaVsLider: -0.6, arpuRelativo: 1.05, canalDominante: "Loja Física", canalPct: 44 },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 48, scoreLabel: "Médio", potencialMercado: 45 },
      movel: { classification: "MELHORA_QUALIDADE", score: 80, scoreLabel: "Crítico"},
      decisaoIntegrada: "Qualidade 4G crítica. Iniciar expansão de fibra após estabilizar rede móvel.",
    },
    technology: "MOVEL",
    lat: -23.5600, lng: -46.6330,
  },

  // ─── ZONA LESTE — RETENCAO ───────────────────────────────────────────────────
  {
    id: "6gyf6u",
    label: "6gyf6u",
    neighborhood: "Tatuapé",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 6.1, color: "#EF4444" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 7.2, color: "#EAB308" },
    ],
    marketShare: { percentage: 42, activeClients: 6100, totalPopulation: 14500, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Base grande com satisfação crítica. Risco alto de churn para TIM. Ação imediata necessária.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    shareTrend: { direction: "DOWN", delta: -2.8, movel: { pessoasComErb: 6100, populacaoResidente: 14500 } },
    crm: { arpu: 108, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 32, latencyMs: 58, qualityLabel: "Razoável" },
    demographics: { avgIncome: 7200, incomeLabel: "Médio-Alto", populationDensity: 11800, populationGrowth: 1.1, growthLabel: "Moderado", technology: "4G + Fibra", severity: "Alta" },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 78, scoreLabel: "Crítico", taxaOcupacao: 93, portasDisponiveis: 7 },
      movel: { classification: "MELHORA_QUALIDADE", score: 75, scoreLabel: "Alto"},
      decisaoIntegrada: "Capacidade de fibra crítica e qualidade móvel comprometida. Intervenção dupla urgente.",
    },
    technology: "AMBOS",
    lat: -23.5420, lng: -46.5720,
  },
  {
    id: "6gyf6v",
    label: "6gyf6v",
    neighborhood: "Penha",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.8, color: "#EF4444" },
      { name: "TIM",   score: 7.6, color: "#22C55E" },
      { name: "CLARO", score: 6.9, color: "#EAB308" },
    ],
    marketShare: { percentage: 38, activeClients: 4900, totalPopulation: 12900, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Satisfação abaixo do limiar crítico. Programa de melhoria de rede e retenção proativa.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    shareTrend: { direction: "DOWN", delta: -1.9, movel: { pessoasComErb: 4900, populacaoResidente: 12900 } },
    crm: { arpu: 88, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 27, latencyMs: 64, qualityLabel: "Ruim" },
    demographics: { avgIncome: 5400, incomeLabel: "Médio", populationDensity: 9600, populationGrowth: 0.7, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 30, scoreLabel: "Baixo", potencialMercado: 28 },
      movel: { classification: "MELHORA_QUALIDADE", score: 84, scoreLabel: "Crítico"},
      decisaoIntegrada: "Qualidade 4G crítica. Iniciar programa de melhoria de rede e retenção proativa.",
    },
    technology: "MOVEL",
    lat: -23.5240, lng: -46.5380,
  },

  // ─── ZONA NORTE — UPSELL ─────────────────────────────────────────────────────
  {
    id: "6gyf4x",
    label: "6gyf4x",
    neighborhood: "Consolação",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 8.0, color: "#EAB308" },
      { name: "TIM",   score: 7.4, color: "#22C55E" },
      { name: "CLARO", score: 7.6, color: "#EF4444" },
    ],
    marketShare: { percentage: 46, activeClients: 5400, totalPopulation: 11700, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Base consolidada e satisfeita em bairro de alta renda. Potencial de upsell para planos premium.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: { direction: "UP", delta: 1.1, fibra: { domiciliosComFibra: 5400, totalDomicilios: 11700 } },
    crm: { arpu: 162, deviceTier: "Premium", planType: "Fibra 500Mbps" },
    speedtest: { downloadMbps: 290, latencyMs: 9, qualityLabel: "Excelente" },
    demographics: { avgIncome: 15800, incomeLabel: "Alto", populationDensity: 13500, populationGrowth: 1.4, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    diagnostico: { scoreOokla: 7.1, taxaChamados: 2.5, sharePenetracao: 33, deltaVsLider: -0.8, arpuRelativo: 1.08, canalDominante: "Loja Física", canalPct: 51 },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 28, scoreLabel: "Baixo", taxaOcupacao: 68, portasDisponiveis: 32 },
      movel: { classification: "SAUDAVEL", score: 16, scoreLabel: "Baixo"},
      decisaoIntegrada: "Rede saudável. Foco em upsell para 1Gbps e serviços premium.",
    },
    technology: "FIBRA",
    lat: -23.5530, lng: -46.6560,
  },

  // ─── GRANDE SP — GROWTH ───────────────────────────────────────────────────────
  {
    id: "6gyf1n",
    label: "6gyf1n",
    neighborhood: "Guarulhos",
    city: "Guarulhos",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.1, color: "#EAB308" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EF4444" },
    ],
    marketShare: { percentage: 26, activeClients: 5200, totalPopulation: 20000, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Mercado de grande volume com share abaixo do potencial. Oportunidade de crescimento expressívo.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: { direction: "UP", delta: 0.9, deltaMovel: 0.9, deltaFibra: 0.0, shareMovel: 26, shareFibra: 0,
      movel: { pessoasComErb: 5200, populacaoResidente: 20000 } },
    crm: { arpu: 72, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 72, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 48, latencyMs: 36, qualityLabel: "Razoável" },
    demographics: { avgIncome: 4200, incomeLabel: "Médio", populationDensity: 8200, populationGrowth: 2.4, growthLabel: "Alto", technology: "4G", severity: "Média" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 62, scoreLabel: "Médio", potencialMercado: 58, sinergiaMovel: 26 },
      movel: { classification: "MELHORA_QUALIDADE", score: 55, scoreLabel: "Médio"},
      decisaoIntegrada: "Expandir fibra e melhorar qualidade 4G para capturar mercado de alto volume.",
    },
    technology: "MOVEL",
    diagnostico: {
      scoreOokla: 6.4, scoreOoklaMovel: 6.1, scoreOoklaFibra: 5.9, scoreHAC: 5.7,
      taxaChamados: 4.8, sharePenetracao: 27, deltaVsLider: -0.6,
      deltaVsLiderFibra: -0.9, deltaVsLiderMovel: -0.7,
      scoreLiderFibra: 6.8, scoreLiderMovel: 6.8,
      arpuRelativo: 0.88, canalDominante: "Porta a Porta", canalPct: 44,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    lat: -23.4560, lng: -46.5330,
  },
  {
    id: "6gyf0p",
    label: "6gyf0p",
    neighborhood: "Osasco",
    city: "Osasco",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.0, color: "#EAB308" },
      { name: "TIM",   score: 7.5, color: "#22C55E" },
      { name: "CLARO", score: 6.8, color: "#EF4444" },
    ],
    marketShare: { percentage: 28, activeClients: 4800, totalPopulation: 17200, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Cidade industrial com mercado subexplorado. Satisfação Vivo competitiva.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: { direction: "STABLE", delta: 0.4, deltaMovel: 0.4, deltaFibra: 0.0, shareMovel: 28, shareFibra: 0,
      movel: { pessoasComErb: 4800, populacaoResidente: 17200 } },
    crm: { arpu: 78, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 78, arpuFibra: 0, planoMovel: "Pós" },
    speedtest: { downloadMbps: 52, latencyMs: 34, qualityLabel: "Bom" },
    demographics: { avgIncome: 4600, incomeLabel: "Médio", populationDensity: 9400, populationGrowth: 1.8, growthLabel: "Alto", technology: "4G", severity: "Média" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 58, scoreLabel: "Médio", potencialMercado: 52, sinergiaMovel: 28 },
      movel: { classification: "SAUDAVEL", score: 35, scoreLabel: "Baixo"},
      decisaoIntegrada: "Expandir fibra como alavanca de crescimento. Móvel estável.",
    },
    technology: "MOVEL",
    diagnostico: {
      scoreOokla: 6.1, scoreOoklaMovel: 5.9, scoreOoklaFibra: 5.5, scoreHAC: 5.3,
      taxaChamados: 4.5, sharePenetracao: 24, deltaVsLider: -0.8,
      deltaVsLiderFibra: -1.0, deltaVsLiderMovel: -0.5,
      scoreLiderFibra: 6.5, scoreLiderMovel: 6.4,
      arpuRelativo: 0.85, canalDominante: "Porta a Porta", canalPct: 47,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    lat: -23.5329, lng: -46.7920,
  },
  {
    id: "6gyf7k",
    label: "6gyf7k",
    neighborhood: "Itaquera",
    city: "São Paulo",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.9, color: "#EAB308" },
      { name: "TIM",   score: 7.6, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EF4444" },
    ],
    marketShare: { percentage: 23, activeClients: 3900, totalPopulation: 16900, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Região de grande população com share muito baixo. Alto potencial de crescimento.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: { direction: "UP", delta: 1.5, deltaMovel: 1.5, deltaFibra: 0.0, shareMovel: 23, shareFibra: 0,
      movel: { pessoasComErb: 3900, populacaoResidente: 16900 } },
    crm: { arpu: 65, deviceTier: "Basic", planType: "Pós-pago 4G", arpuMovel: 65, arpuFibra: 0, planoMovel: "Pré" },
    speedtest: { downloadMbps: 40, latencyMs: 42, qualityLabel: "Razoável" },
    demographics: { avgIncome: 3400, incomeLabel: "Médio", populationDensity: 10200, populationGrowth: 2.2, growthLabel: "Alto", technology: "4G", severity: "Média" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 70, scoreLabel: "Alto", potencialMercado: 65, sinergiaMovel: 23 },
      movel: { classification: "MELHORA_QUALIDADE", score: 60, scoreLabel: "Médio"},
      decisaoIntegrada: "Expandir fibra e melhorar 4G para capturar mercado de grande volume.",
    },
    technology: "MOVEL",
    diagnostico: {
      scoreOokla: 5.9, scoreOoklaMovel: 5.6, scoreOoklaFibra: 5.1, scoreHAC: 4.9,
      taxaChamados: 5.4, sharePenetracao: 19, deltaVsLider: -1.3,
      deltaVsLiderFibra: -1.5, deltaVsLiderMovel: -0.7,
      scoreLiderFibra: 6.6, scoreLiderMovel: 6.3,
      arpuRelativo: 0.82, canalDominante: "Televendas", canalPct: 38,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    lat: -23.5430, lng: -46.4580,
  },
  {
    id: "6gyf3k",
    label: "6gyf3k",
    neighborhood: "Lapa",
    city: "São Paulo",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.9, color: "#EAB308" },
      { name: "TIM",   score: 7.3, color: "#22C55E" },
      { name: "CLARO", score: 7.5, color: "#EF4444" },
    ],
    marketShare: { percentage: 43, activeClients: 5100, totalPopulation: 11900, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Base consolidada em bairro misto. Oportunidade de upsell para fibra e planos premium.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: { direction: "UP", delta: 0.8, fibra: { domiciliosComFibra: 5100, totalDomicilios: 11900 } },
    crm: { arpu: 138, deviceTier: "Premium", planType: "Fibra 500Mbps" },
    speedtest: { downloadMbps: 240, latencyMs: 11, qualityLabel: "Excelente" },
    demographics: { avgIncome: 11200, incomeLabel: "Alto", populationDensity: 10800, populationGrowth: 1.3, growthLabel: "Moderado", technology: "Fibra + 5G", severity: "Baixa" },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 35, scoreLabel: "Baixo", taxaOcupacao: 74, portasDisponiveis: 26 },
      movel: { classification: "SAUDAVEL", score: 18, scoreLabel: "Baixo"},
      decisaoIntegrada: "Rede saudável. Foco em upsell e fidelização.",
    },
    technology: "FIBRA",
    lat: -23.5260, lng: -46.7010,
  },
  {
    id: "6gyf2n",
    label: "6gyf2n",
    neighborhood: "Jabaquara",
    city: "São Paulo",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.0, color: "#EF4444" },
      { name: "TIM",   score: 7.4, color: "#22C55E" },
      { name: "CLARO", score: 6.8, color: "#EAB308" },
    ],
    marketShare: { percentage: 37, activeClients: 4300, totalPopulation: 11600, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Satisfação crítica em região de média renda. Risco de churn para TIM.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    shareTrend: { direction: "DOWN", delta: -1.7, movel: { pessoasComErb: 4300, populacaoResidente: 11600 } },
    crm: { arpu: 95, deviceTier: "Mid", planType: "Pós-pago 4G" },
    speedtest: { downloadMbps: 31, latencyMs: 56, qualityLabel: "Razoável" },
    demographics: { avgIncome: 5800, incomeLabel: "Médio", populationDensity: 8900, populationGrowth: 0.8, growthLabel: "Moderado", technology: "4G", severity: "Alta" },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 35, scoreLabel: "Baixo", potencialMercado: 32 },
      movel: { classification: "MELHORA_QUALIDADE", score: 76, scoreLabel: "Alto"},
      decisaoIntegrada: "Melhorar qualidade 4G para reter base. Avaliar expansão de fibra em fase posterior.",
    },
    technology: "MOVEL",
    diagnostico: {
      scoreOokla: 6.7,
      taxaChamados: 3.9,
      sharePenetracao: 21,
      deltaVsLider: -0.3,
      arpuRelativo: 0.93,
      canalDominante: "Loja Física",
      canalPct: 41,
    },
    lat: -23.6290, lng: -46.6490,
  },
];

// ─── Decodificador de geohash para polígono ───────────────────────────────
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function decodeGeohashBounds(geohash: string): {
  minLat: number; maxLat: number; minLng: number; maxLng: number;
  centerLat: number; centerLng: number;
} {
  let isEven = true;
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;

  for (const char of geohash) {
    const bits = BASE32.indexOf(char);
    for (let i = 4; i >= 0; i--) {
      const bit = (bits >> i) & 1;
      if (isEven) {
        const mid = (minLng + maxLng) / 2;
        if (bit === 1) minLng = mid; else maxLng = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bit === 1) minLat = mid; else maxLat = mid;
      }
      isEven = !isEven;
    }
  }

  return {
    minLat, maxLat, minLng, maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
  };
}

export function geohashToPolygon(geohash: string): Array<{ lat: number; lng: number }> {
  const { minLat, maxLat, minLng, maxLng } = decodeGeohashBounds(geohash);
  return [
    { lat: maxLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
    { lat: minLat, lng: maxLng },
    { lat: minLat, lng: minLng },
  ];
}

// ─── Score de Prioridade por Quadrante ────────────────────────────────────────
//
// Cada quadrante tem uma fórmula distinta que reflete o que importa
// para aquela estratégia específica:
//
//  RETENCAO:  prioridade = share * 0.5 + (10 - vivoScore) * 5
//             (alto share + baixa satisfação = maior urgência de retenção)
//
//  UPSELL:    prioridade = vivoScore * 5 + share * 0.5
//             (alta satisfação + alto share = maior potencial de upsell/maximização)
//
//  GROWTH:    prioridade = (10 - share) * 0.5 + vivoScore * 5
//             (baixo share + boa satisfação = maior janela de ataque)
//
//  GROWTH_RETENCAO: prioridade = (10 - share) * 0.5 + (10 - vivoScore) * 3 + (avgIncome/1000) * 2
//             (dupla frente: share baixo + satisfação baixa + potencial de renda)

function getVivoScoreRaw(gh: GeohashData): number {
  return gh.satisfactionScores.find(s => s.name === "VIVO")?.score ?? 0;
}

export function calcPriorityScore(gh: GeohashData): number {
  const vivoScore = getVivoScoreRaw(gh);
  const share = gh.marketShare.percentage;
  switch (gh.quadrant) {
    case "RETENCAO":
      return share * 0.5 + (10 - vivoScore) * 5;
    case "UPSELL":
      return vivoScore * 5 + share * 0.5;
    case "GROWTH":
      return (10 - share) * 0.5 + vivoScore * 5;
    case "GROWTH_RETENCAO": {
      const d = gh.demographics;
      if (!d) return 0;
      return (d.avgIncome / 1000) * 3 + d.populationGrowth * 5 + d.populationDensity / 100;
    }
    default:
      return 0;
  }
}

export interface PriorityInfo {
  score: number;          // score bruto
  rank: number;           // posição dentro do quadrante (1 = maior prioridade)
  total: number;          // total de geohashes no quadrante
  percentile: number;     // 0-100 (100 = maior prioridade)
  label: "Crítico" | "Alto" | "Médio" | "Baixo";
  color: string;
}

// Cache calculado uma vez
let _priorityCache: Map<string, PriorityInfo> | null = null;

export function getPriorityInfo(gh: GeohashData): PriorityInfo {
  if (!_priorityCache) {
    _priorityCache = new Map();
    const quadrants: Quadrant[] = ["GROWTH", "UPSELL", "GROWTH_RETENCAO", "RETENCAO"];
    for (const q of quadrants) {
      const group = GEOHASH_DATA.filter(g => g.quadrant === q);
      const scored = group
        .map(g => ({ id: g.id, score: calcPriorityScore(g) }))
        .sort((a, b) => b.score - a.score);
      const total = scored.length;
      scored.forEach((item, idx) => {
        const rank = idx + 1;
        const percentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;
        let label: PriorityInfo["label"];
        let color: string;
        if (percentile >= 75) { label = "Crítico"; color = "#DC2626"; }
        else if (percentile >= 50) { label = "Alto";    color = "#D97706"; }
        else if (percentile >= 25) { label = "Médio";   color = "#2563EB"; }
        else                       { label = "Baixo";   color = "#64748B"; }
        _priorityCache!.set(item.id, { score: item.score, rank, total, percentile, label, color });
      });
    }
  }
  return _priorityCache.get(gh.id) ?? { score: 0, rank: 1, total: 1, percentile: 100, label: "Crítico", color: "#DC2626" };
}
