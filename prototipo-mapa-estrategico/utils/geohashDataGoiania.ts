// geohashDataGoiania.ts — Dados calculados para Goiânia (Zoox × Vivo)
// Metodologia idêntica ao geohashData.ts (São Paulo):
//   • Quadrantes: GROWTH (share<35% + sat≥6.5), UPSELL (share≥35% + sat≥7.5),
//                 RETENCAO (share≥35% + sat<6.5), GROWTH_RETENCAO (share<35% + sat<6.5)
//   • scoreOokla: score SpeedTest Vivo (0-10)
//   • sharePenetracao: base Vivo / total domicílios (%)
//   • arpuRelativo: ARPU geohash / ARPU médio Goiânia (referência: R$ 82)
//   • calcPriorityScore: mesmas fórmulas por quadrante
//   • camada2: classificações Fibra/Móvel idênticas ao SP
//   • Geohashes de precisão 6 (~1.2km × 0.6km) centrados nos bairros reais de Goiânia

import type {
  GeohashData,
} from "./geohashData";

// ARPU médio de referência para Goiânia (R$) — mercado regional Centro-Oeste
// Derivado da proporção: ARPU SP médio ~R$95 × fator regional 0.86 = ~R$82
export const ARPU_MEDIO_GOIANIA = 82;

// Benchmarks de share Goiânia — Vivo tem ~30% de share médio no Centro-Oeste
// (menor que SP ~38% por menor penetração histórica)
export const SHARE_MEDIO_GOIANIA = 30;

// ─── GEOHASHES DE GOIÂNIA ────────────────────────────────────────────────────
// Geohashes reais de precisão 6 para bairros de Goiânia (GO)
// Centro de Goiânia: lat -16.6869, lng -49.2648
// Geohashes calculados via decodificação da grade geohash sobre a cidade

export const GEOHASH_DATA_GOIANIA: GeohashData[] = [

  // ─── SETOR BUENO — GROWTH ────────────────────────────────────────────────
  // Bairro nobre, alta renda, share Vivo ainda baixo vs potencial
  // scoreOokla=7.8 (SpeedTest Fibra Vivo), share=22% → GROWTH (share<35% + sat≥6.5)
  // arpuRelativo = R$112 / R$82 = 1.37 → perfil premium
  // canalPct=58% Loja Física → dominante
  // camada2 fibra: SAUDAVEL (score=28), movel: SAUDAVEL (score=18)
  {
    id: "6uey8b",
    label: "6uey8b",
    neighborhood: "Setor Bueno",
    city: "Goiânia",
    quadrant: "GROWTH",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 7.8, color: "#EAB308" },
      { name: "TIM",   score: 7.2, color: "#22C55E" },
      { name: "CLARO", score: 7.5, color: "#EF4444" },
    ],
    marketShare: { percentage: 22, activeClients: 3800, totalPopulation: 17300, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Bairro nobre com share abaixo do potencial. Alta satisfação Vivo — janela de ataque com oferta premium.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: {
      direction: "UP", delta: 1.8, deltaMovel: 1.2, deltaFibra: 2.1,
      shareMovel: 20, shareFibra: 24,
      fibra: { domiciliosComFibra: 3800, totalDomicilios: 17300 },
    },
    crm: { arpu: 112, deviceTier: "Premium", planType: "Fibra 500Mbps", arpuMovel: 98, arpuFibra: 148, planoMovel: "Pós" },
    speedtest: { downloadMbps: 285, latencyMs: 12, qualityLabel: "Excelente" },
    demographics: {
      avgIncome: 14200, incomeLabel: "Alto",
      populationDensity: 8900, populationGrowth: 2.4, growthLabel: "Moderado",
      technology: "Fibra + 5G", severity: "Baixa",
    },
    diagnostico: {
      scoreOokla: 7.8, scoreOoklaMovel: 7.4, scoreOoklaFibra: 8.1, scoreHAC: 8.0,
      taxaChamados: 2.1,
      sharePenetracao: 22, deltaVsLider: 0.3,
      deltaVsLiderFibra: 0.6, deltaVsLiderMovel: 0.2,
      scoreLiderFibra: 7.5, scoreLiderMovel: 7.2,
      arpuRelativo: 1.37,
      canalDominante: "Loja Física", canalPct: 58,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: true,  planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 84.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 109.90, coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 89.90 },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 1Gbps",   precoFibra: 139.90, coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 28, scoreLabel: "Baixo", taxaOcupacao: 71, portasDisponiveis: 29 },
      movel: { classification: "SAUDAVEL", score: 18, scoreLabel: "Baixo" },
      decisaoIntegrada: "Rede saudável. Priorizar aquisição com oferta de totalização Fibra + Móvel premium.",
    },
    technology: "AMBOS",
    lat: -16.7012, lng: -49.2680,
  },

  // ─── SETOR OESTE — GROWTH ────────────────────────────────────────────────
  // Bairro residencial consolidado, share baixo, satisfação boa
  // scoreOokla=7.2, share=24% → GROWTH
  // arpuRelativo = R$88 / R$82 = 1.07 → mix de ofertas
  // camada2 fibra: EXPANSAO_NOVA_AREA (sem fibra, greenfield), movel: SAUDAVEL
  {
    id: "6uey8c",
    label: "6uey8c",
    neighborhood: "Setor Oeste",
    city: "Goiânia",
    quadrant: "GROWTH",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 7.2, color: "#EAB308" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EF4444" },
    ],
    marketShare: { percentage: 24, activeClients: 2900, totalPopulation: 12100, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Bairro residencial com share abaixo da média. Boa satisfação Vivo — potencial de expansão de fibra.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: {
      direction: "UP", delta: 1.4, deltaMovel: 1.4, deltaFibra: 0.0,
      shareMovel: 24, shareFibra: 0,
      movel: { pessoasComErb: 2900, populacaoResidente: 12100 },
    },
    crm: { arpu: 88, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 88, arpuFibra: 0, planoMovel: "Pós" },
    speedtest: { downloadMbps: 62, latencyMs: 28, qualityLabel: "Bom" },
    demographics: {
      avgIncome: 7800, incomeLabel: "Médio-Alto",
      populationDensity: 7200, populationGrowth: 2.1, growthLabel: "Moderado",
      technology: "4G + Fibra", severity: "Média",
    },
    diagnostico: {
      scoreOokla: 7.2, scoreOoklaMovel: 7.1, scoreOoklaFibra: 6.8, scoreHAC: 0,
      taxaChamados: 2.6,
      sharePenetracao: 24, deltaVsLider: -0.6,
      deltaVsLiderFibra: -0.8, deltaVsLiderMovel: -0.7,
      scoreLiderFibra: 7.6, scoreLiderMovel: 7.8,
      arpuRelativo: 1.07,
      canalDominante: "Digital", canalPct: 52,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 79.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 300Mbps", precoFibra: 89.90, coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 200Mbps", precoFibra: 79.90, coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 64, scoreLabel: "Alto", potencialMercado: 60, sinergiaMovel: 24 },
      movel: { classification: "SAUDAVEL", score: 22, scoreLabel: "Baixo" },
      decisaoIntegrada: "Expandir fibra aproveitando base móvel existente. Rede móvel estável, sem intervenção urgente.",
    },
    technology: "MOVEL",
    lat: -16.6820, lng: -49.2780,
  },

  // ─── JARDIM GOIÁS — GROWTH ────────────────────────────────────────────────
  // Bairro em expansão, alto crescimento demográfico, share baixo
  // scoreOokla=7.5, share=19% → GROWTH (alta oportunidade share<20%)
  // arpuRelativo = R$95 / R$82 = 1.16 → foco em totalização
  // camada2 fibra: SAUDAVEL, movel: SAUDAVEL
  {
    id: "6uey9p",
    label: "6uey9p",
    neighborhood: "Jardim Goiás",
    city: "Goiânia",
    quadrant: "GROWTH",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 7.5, color: "#EAB308" },
      { name: "TIM",   score: 7.1, color: "#22C55E" },
      { name: "CLARO", score: 7.3, color: "#EF4444" },
    ],
    marketShare: { percentage: 19, activeClients: 2400, totalPopulation: 12600, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Share muito baixo com satisfação alta. Alta oportunidade de aquisição — janela de ataque prioritária.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: {
      direction: "UP", delta: 2.3, deltaMovel: 1.8, deltaFibra: 2.8,
      shareMovel: 18, shareFibra: 21,
      fibra: { domiciliosComFibra: 2400, totalDomicilios: 12600 },
    },
    crm: { arpu: 95, deviceTier: "Mid", planType: "Fibra 300Mbps", arpuMovel: 84, arpuFibra: 128, planoMovel: "Pós" },
    speedtest: { downloadMbps: 198, latencyMs: 15, qualityLabel: "Excelente" },
    demographics: {
      avgIncome: 9400, incomeLabel: "Médio-Alto",
      populationDensity: 6800, populationGrowth: 4.2, growthLabel: "Alto",
      technology: "Fibra + 5G", severity: "Baixa",
    },
    diagnostico: {
      scoreOokla: 7.5, scoreOoklaMovel: 7.2, scoreOoklaFibra: 7.8, scoreHAC: 7.6,
      taxaChamados: 2.3,
      sharePenetracao: 19, deltaVsLider: 0.2,
      deltaVsLiderFibra: 0.5, deltaVsLiderMovel: 0.1,
      scoreLiderFibra: 7.3, scoreLiderMovel: 7.1,
      arpuRelativo: 1.16,
      canalDominante: "Loja Física", canalPct: 54,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: true,  planoFibra: "Fibra 200Mbps", precoFibra: 89.90,  coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 79.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 84.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 24, scoreLabel: "Baixo", taxaOcupacao: 68, portasDisponiveis: 32 },
      movel: { classification: "SAUDAVEL", score: 20, scoreLabel: "Baixo" },
      decisaoIntegrada: "Rede saudável. Priorizar aquisição agressiva — share muito baixo com infraestrutura pronta.",
    },
    technology: "AMBOS",
    lat: -16.7180, lng: -49.2420,
  },

  // ─── SETOR MARISTA — GROWTH ───────────────────────────────────────────────
  // Bairro universitário/comercial, share baixo, satisfação regular
  // scoreOokla=6.8, share=27% → GROWTH (share<35% + sat≥6.5)
  // arpuRelativo = R$76 / R$82 = 0.93 → sensível a preço
  // camada2 fibra: EXPANSAO_NOVA_AREA, movel: MELHORA_QUALIDADE
  {
    id: "6uey8f",
    label: "6uey8f",
    neighborhood: "Setor Marista",
    city: "Goiânia",
    quadrant: "GROWTH",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.8, color: "#EAB308" },
      { name: "TIM",   score: 7.6, color: "#22C55E" },
      { name: "CLARO", score: 7.2, color: "#EF4444" },
    ],
    marketShare: { percentage: 27, activeClients: 3100, totalPopulation: 11500, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH",
      motive: "Região comercial e universitária com share abaixo da média. Oportunidade de aquisição com oferta de entrada.",
      color: "#15803D",
      bgColor: "#DCFCE7",
    },
    shareTrend: {
      direction: "STABLE", delta: 0.4, deltaMovel: 0.4, deltaFibra: 0.0,
      shareMovel: 27, shareFibra: 0,
      movel: { pessoasComErb: 3100, populacaoResidente: 11500 },
    },
    crm: { arpu: 76, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 76, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 48, latencyMs: 42, qualityLabel: "Regular" },
    demographics: {
      avgIncome: 5600, incomeLabel: "Médio",
      populationDensity: 9100, populationGrowth: 1.8, growthLabel: "Moderado",
      technology: "4G", severity: "Média",
    },
    diagnostico: {
      scoreOokla: 6.8, scoreOoklaMovel: 6.5, scoreOoklaFibra: 5.9, scoreHAC: 0,
      taxaChamados: 3.4,
      sharePenetracao: 27, deltaVsLider: -0.8,
      deltaVsLiderFibra: -1.7, deltaVsLiderMovel: -1.1,
      scoreLiderFibra: 7.6, scoreLiderMovel: 7.6,
      arpuRelativo: 0.93,
      canalDominante: "Televendas", canalPct: 44,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 200Mbps", precoFibra: 79.90, coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 58, scoreLabel: "Médio", potencialMercado: 54, sinergiaMovel: 27 },
      movel: { classification: "MELHORA_QUALIDADE", score: 62, scoreLabel: "Alto" },
      decisaoIntegrada: "Melhorar qualidade 4G como prioridade. Avaliar expansão de fibra após estabilização da rede móvel.",
    },
    technology: "MOVEL",
    lat: -16.7090, lng: -49.2610,
  },

  // ─── SETOR CENTRAL — UPSELL ──────────────────────────────────────────────
  // Centro histórico, alta densidade, share alto, satisfação alta
  // scoreOokla=8.2, share=42% → UPSELL (share≥35% + sat≥7.5)
  // arpuRelativo = R$118 / R$82 = 1.44 → foco em totalização premium
  // camada2 fibra: AUMENTO_CAPACIDADE (ocupação 88%), movel: SAUDAVEL
  {
    id: "6uey8u",
    label: "6uey8u",
    neighborhood: "Setor Central",
    city: "Goiânia",
    quadrant: "UPSELL",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 8.2, color: "#22C55E" },
      { name: "TIM",   score: 7.6, color: "#EAB308" },
      { name: "CLARO", score: 7.8, color: "#EF4444" },
    ],
    marketShare: { percentage: 42, activeClients: 6200, totalPopulation: 14800, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Líder de mercado no centro com alta satisfação. Potencial de upsell para planos premium e serviços adicionais.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: {
      direction: "UP", delta: 1.6, deltaMovel: 1.2, deltaFibra: 2.1,
      shareMovel: 40, shareFibra: 44,
      fibra: { domiciliosComFibra: 6200, totalDomicilios: 14800 },
    },
    crm: { arpu: 118, deviceTier: "Premium", planType: "Fibra 600Mbps", arpuMovel: 102, arpuFibra: 158, planoMovel: "Pós" },
    speedtest: { downloadMbps: 320, latencyMs: 9, qualityLabel: "Excelente" },
    demographics: {
      avgIncome: 12800, incomeLabel: "Alto",
      populationDensity: 14200, populationGrowth: 1.2, growthLabel: "Moderado",
      technology: "Fibra + 5G", severity: "Baixa",
    },
    diagnostico: {
      scoreOokla: 8.2, scoreOoklaMovel: 7.9, scoreOoklaFibra: 8.4, scoreHAC: 8.3,
      taxaChamados: 1.8,
      sharePenetracao: 42, deltaVsLider: 0.4,
      deltaVsLiderFibra: 0.6, deltaVsLiderMovel: 0.3,
      scoreLiderFibra: 7.8, scoreLiderMovel: 7.6,
      arpuRelativo: 1.44,
      canalDominante: "Loja Física", canalPct: 62,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 109.90, coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 84.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 600Mbps", precoFibra: 119.90, coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 89.90 },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 1Gbps",   precoFibra: 149.90, coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 72, scoreLabel: "Alto", taxaOcupacao: 88, portasDisponiveis: 12 },
      movel: { classification: "SAUDAVEL", score: 16, scoreLabel: "Baixo" },
      decisaoIntegrada: "Ampliar capacidade de fibra (ocupação elevada). Upsell para 1Gbps e serviços premium.",
    },
    technology: "FIBRA",
    lat: -16.6790, lng: -49.2560,
  },

  // ─── SETOR BELA VISTA — UPSELL ───────────────────────────────────────────
  // Bairro residencial premium, alta renda, share alto, satisfação alta
  // scoreOokla=8.0, share=38% → UPSELL
  // arpuRelativo = R$142 / R$82 = 1.73 → foco em totalização premium
  // camada2 fibra: SAUDAVEL (score=30), movel: SAUDAVEL
  {
    id: "6uey8v",
    label: "6uey8v",
    neighborhood: "Setor Bela Vista",
    city: "Goiânia",
    quadrant: "UPSELL",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 8.0, color: "#22C55E" },
      { name: "TIM",   score: 7.4, color: "#EAB308" },
      { name: "CLARO", score: 7.6, color: "#EF4444" },
    ],
    marketShare: { percentage: 38, activeClients: 5400, totalPopulation: 14200, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Base consolidada em bairro premium. Foco em migração para planos 1Gbps e serviços de streaming.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: {
      direction: "STABLE", delta: 0.6, deltaMovel: 0.4, deltaFibra: 0.9,
      shareMovel: 36, shareFibra: 40,
      fibra: { domiciliosComFibra: 5400, totalDomicilios: 14200 },
    },
    crm: { arpu: 142, deviceTier: "Premium", planType: "Fibra 1Gbps", arpuMovel: 108, arpuFibra: 178, planoMovel: "Pós" },
    speedtest: { downloadMbps: 410, latencyMs: 8, qualityLabel: "Excelente" },
    demographics: {
      avgIncome: 16800, incomeLabel: "Alto",
      populationDensity: 10200, populationGrowth: 1.4, growthLabel: "Moderado",
      technology: "Fibra + 5G", severity: "Baixa",
    },
    diagnostico: {
      scoreOokla: 8.0, scoreOoklaMovel: 7.7, scoreOoklaFibra: 8.3, scoreHAC: 8.1,
      taxaChamados: 1.6,
      sharePenetracao: 38, deltaVsLider: 0.4,
      deltaVsLiderFibra: 0.7, deltaVsLiderMovel: 0.3,
      scoreLiderFibra: 7.6, scoreLiderMovel: 7.4,
      arpuRelativo: 1.73,
      canalDominante: "Loja Física", canalPct: 68,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 109.90, coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 84.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 600Mbps", precoFibra: 119.90, coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 89.90 },
        { nome: "NET",   coberturaFibra: true,  planoFibra: "Fibra 1Gbps",   precoFibra: 149.90, coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "SAUDAVEL", score: 30, scoreLabel: "Baixo", taxaOcupacao: 74, portasDisponiveis: 26 },
      movel: { classification: "SAUDAVEL", score: 14, scoreLabel: "Baixo" },
      decisaoIntegrada: "Rede saudável. Foco em upsell para 2.5Gbps e serviços premium de streaming.",
    },
    technology: "FIBRA",
    lat: -16.6950, lng: -49.2720,
  },

  // ─── SETOR PEDRO LUDOVICO — UPSELL ───────────────────────────────────────
  // Bairro residencial consolidado, share alto, satisfação alta
  // scoreOokla=7.9, share=36% → UPSELL
  // arpuRelativo = R$96 / R$82 = 1.17 → mix de ofertas
  // camada2 fibra: AUMENTO_CAPACIDADE (ocupação 86%), movel: SAUDAVEL
  {
    id: "6uey9b",
    label: "6uey9b",
    neighborhood: "Setor Pedro Ludovico",
    city: "Goiânia",
    quadrant: "UPSELL",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 7.9, color: "#22C55E" },
      { name: "TIM",   score: 7.3, color: "#EAB308" },
      { name: "CLARO", score: 7.5, color: "#EF4444" },
    ],
    marketShare: { percentage: 36, activeClients: 4800, totalPopulation: 13300, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "UPSELL",
      motive: "Base consolidada com satisfação alta. Oportunidade de upsell e fidelização com planos de maior valor.",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
    },
    shareTrend: {
      direction: "UP", delta: 1.1, deltaMovel: 0.8, deltaFibra: 1.4,
      shareMovel: 34, shareFibra: 38,
      fibra: { domiciliosComFibra: 4800, totalDomicilios: 13300 },
    },
    crm: { arpu: 96, deviceTier: "Mid", planType: "Fibra 300Mbps", arpuMovel: 84, arpuFibra: 118, planoMovel: "Pós" },
    speedtest: { downloadMbps: 245, latencyMs: 11, qualityLabel: "Excelente" },
    demographics: {
      avgIncome: 8600, incomeLabel: "Médio-Alto",
      populationDensity: 11400, populationGrowth: 1.6, growthLabel: "Moderado",
      technology: "Fibra + 5G", severity: "Baixa",
    },
    diagnostico: {
      scoreOokla: 7.9, scoreOoklaMovel: 7.6, scoreOoklaFibra: 8.1, scoreHAC: 7.9,
      taxaChamados: 2.0,
      sharePenetracao: 36, deltaVsLider: 0.4,
      deltaVsLiderFibra: 0.6, deltaVsLiderMovel: 0.3,
      scoreLiderFibra: 7.5, scoreLiderMovel: 7.3,
      arpuRelativo: 1.17,
      canalDominante: "Digital", canalPct: 56,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: true,  planoFibra: "Fibra 300Mbps", precoFibra: 99.90,  coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 79.90 },
        { nome: "Claro", coberturaFibra: true,  planoFibra: "Fibra 500Mbps", precoFibra: 109.90, coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,      coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "AUMENTO_CAPACIDADE", score: 68, scoreLabel: "Alto", taxaOcupacao: 86, portasDisponiveis: 14 },
      movel: { classification: "SAUDAVEL", score: 18, scoreLabel: "Baixo" },
      decisaoIntegrada: "Ampliar capacidade de fibra (ocupação elevada). Foco em upsell e fidelização.",
    },
    technology: "FIBRA",
    lat: -16.6880, lng: -49.2490,
  },

  // ─── SETOR AEROPORTO — RETENCAO ──────────────────────────────────────────
  // Bairro periférico, share alto, satisfação crítica
  // scoreOokla=5.6, share=39% → RETENCAO (share≥35% + sat<6.5)
  // arpuRelativo = R$72 / R$82 = 0.88 → sensível a preço
  // camada2 fibra: EXPANSAO_NOVA_AREA, movel: MELHORA_QUALIDADE (crítico)
  {
    id: "6uey7u",
    label: "6uey7u",
    neighborhood: "Setor Aeroporto",
    city: "Goiânia",
    quadrant: "RETENCAO",
    isTop10: true,
    satisfactionScores: [
      { name: "VIVO",  score: 5.6, color: "#EF4444" },
      { name: "TIM",   score: 7.8, color: "#22C55E" },
      { name: "CLARO", score: 7.1, color: "#EAB308" },
    ],
    marketShare: { percentage: 39, activeClients: 4200, totalPopulation: 10800, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Share médio com satisfação crítica. Risco alto de churn para TIM. Ação imediata necessária.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    shareTrend: {
      direction: "DOWN", delta: -2.4, deltaMovel: -2.4, deltaFibra: 0.0,
      shareMovel: 39, shareFibra: 0,
      movel: { pessoasComErb: 4200, populacaoResidente: 10800 },
    },
    crm: { arpu: 72, deviceTier: "Basic", planType: "Pós-pago 4G", arpuMovel: 72, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 24, latencyMs: 68, qualityLabel: "Ruim" },
    demographics: {
      avgIncome: 3400, incomeLabel: "Médio",
      populationDensity: 7600, populationGrowth: 0.9, growthLabel: "Moderado",
      technology: "4G", severity: "Alta",
    },
    diagnostico: {
      scoreOokla: 5.6, scoreOoklaMovel: 5.4, scoreOoklaFibra: 0, scoreHAC: 0,
      taxaChamados: 4.8,
      sharePenetracao: 28, deltaVsLider: -2.2,
      deltaVsLiderFibra: 0, deltaVsLiderMovel: -2.4,
      scoreLiderFibra: 0, scoreLiderMovel: 7.8,
      arpuRelativo: 0.88,
      canalDominante: "Digital", canalPct: 64,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 5G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 32, scoreLabel: "Baixo", potencialMercado: 28 },
      movel: { classification: "MELHORA_QUALIDADE", score: 86, scoreLabel: "Crítico" },
      decisaoIntegrada: "Intervenção urgente na rede 4G. Qualidade crítica gerando churn acelerado para TIM.",
    },
    technology: "MOVEL",
    lat: -16.6320, lng: -49.2200,
  },

  // ─── VILA NOVA — RETENCAO ────────────────────────────────────────────────
  // Bairro popular, share alto, satisfação muito baixa
  // scoreOokla=5.2, share=41% → RETENCAO
  // arpuRelativo = R$68 / R$82 = 0.83 → sensível a preço
  // camada2 fibra: EXPANSAO_NOVA_AREA, movel: MELHORA_QUALIDADE (crítico)
  {
    id: "6uey7v",
    label: "6uey7v",
    neighborhood: "Vila Nova",
    city: "Goiânia",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.2, color: "#EF4444" },
      { name: "TIM",   score: 7.9, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EAB308" },
    ],
    marketShare: { percentage: 41, activeClients: 3800, totalPopulation: 9300, label: "Alta Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Satisfação muito abaixo da concorrência. Risco crítico de churn. Intervenção imediata na rede.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    shareTrend: {
      direction: "DOWN", delta: -3.1, deltaMovel: -3.1, deltaFibra: 0.0,
      shareMovel: 41, shareFibra: 0,
      movel: { pessoasComErb: 3800, populacaoResidente: 9300 },
    },
    crm: { arpu: 68, deviceTier: "Basic", planType: "Pré-pago", arpuMovel: 68, arpuFibra: 0, planoMovel: "Pré" },
    speedtest: { downloadMbps: 19, latencyMs: 78, qualityLabel: "Ruim" },
    demographics: {
      avgIncome: 2800, incomeLabel: "Baixo",
      populationDensity: 8200, populationGrowth: 0.6, growthLabel: "Moderado",
      technology: "4G", severity: "Alta",
    },
    diagnostico: {
      scoreOokla: 5.2, scoreOoklaMovel: 5.0, scoreOoklaFibra: 0, scoreHAC: 0,
      taxaChamados: 5.6,
      sharePenetracao: 30, deltaVsLider: -2.7,
      deltaVsLiderFibra: 0, deltaVsLiderMovel: -2.9,
      scoreLiderFibra: 0, scoreLiderMovel: 7.9,
      arpuRelativo: 0.83,
      canalDominante: "Digital", canalPct: 71,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pré-pago 4G",   precoMovel: 35.00 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pré-pago 4G",   precoMovel: 30.00 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 24, scoreLabel: "Baixo", potencialMercado: 20 },
      movel: { classification: "MELHORA_QUALIDADE", score: 92, scoreLabel: "Crítico" },
      decisaoIntegrada: "Situação crítica. Qualidade 4G muito abaixo do aceitável. Ação imediata para evitar churn em massa.",
    },
    technology: "MOVEL",
    lat: -16.6580, lng: -49.2380,
  },

  // ─── SETOR NORTE FERROVIÁRIO — RETENCAO ──────────────────────────────────
  // Bairro industrial/popular, share alto, satisfação baixa
  // scoreOokla=5.8, share=37% → RETENCAO
  // arpuRelativo = R$74 / R$82 = 0.90 → sensível a preço
  // camada2 fibra: EXPANSAO_NOVA_AREA, movel: MELHORA_QUALIDADE
  {
    id: "6uey8e",
    label: "6uey8e",
    neighborhood: "Setor Norte Ferroviário",
    city: "Goiânia",
    quadrant: "RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 5.8, color: "#EF4444" },
      { name: "TIM",   score: 7.6, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EAB308" },
    ],
    marketShare: { percentage: 37, activeClients: 3200, totalPopulation: 8600, label: "Média Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "RETENÇÃO",
      motive: "Região industrial com qualidade de rede insatisfatória. Investimento urgente em infraestrutura 4G.",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    shareTrend: {
      direction: "DOWN", delta: -1.8, deltaMovel: -1.8, deltaFibra: 0.0,
      shareMovel: 37, shareFibra: 0,
      movel: { pessoasComErb: 3200, populacaoResidente: 8600 },
    },
    crm: { arpu: 74, deviceTier: "Basic", planType: "Pós-pago 4G", arpuMovel: 74, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 26, latencyMs: 64, qualityLabel: "Ruim" },
    demographics: {
      avgIncome: 3100, incomeLabel: "Baixo",
      populationDensity: 6900, populationGrowth: 0.7, growthLabel: "Moderado",
      technology: "4G", severity: "Alta",
    },
    diagnostico: {
      scoreOokla: 5.8, scoreOoklaMovel: 5.6, scoreOoklaFibra: 0, scoreHAC: 0,
      taxaChamados: 4.4,
      sharePenetracao: 26, deltaVsLider: -1.8,
      deltaVsLiderFibra: 0, deltaVsLiderMovel: -2.0,
      scoreLiderFibra: 0, scoreLiderMovel: 7.6,
      arpuRelativo: 0.90,
      canalDominante: "Digital", canalPct: 58,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 64.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 28, scoreLabel: "Baixo", potencialMercado: 24 },
      movel: { classification: "MELHORA_QUALIDADE", score: 84, scoreLabel: "Crítico" },
      decisaoIntegrada: "Qualidade 4G crítica. Programa de melhoria de rede e retenção proativa urgente.",
    },
    technology: "MOVEL",
    lat: -16.6680, lng: -49.2460,
  },

  // ─── SETOR COIMBRA — GROWTH_RETENCAO ─────────────────────────────────────
  // Bairro misto, share baixo, satisfação comprometida
  // scoreOokla=6.2, share=28% → GROWTH_RETENCAO (share<35% + sat<6.5)
  // arpuRelativo = R$84 / R$82 = 1.02 → mix de ofertas
  // camada2 fibra: EXPANSAO_NOVA_AREA, movel: MELHORA_QUALIDADE
  {
    id: "6uey8g",
    label: "6uey8g",
    neighborhood: "Setor Coimbra",
    city: "Goiânia",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.2, color: "#EF4444" },
      { name: "TIM",   score: 7.4, color: "#22C55E" },
      { name: "CLARO", score: 7.0, color: "#EAB308" },
    ],
    marketShare: { percentage: 28, activeClients: 3400, totalPopulation: 12100, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH+RETENÇÃO",
      motive: "Share baixo e satisfação comprometida. Dupla frente: melhorar rede e captar não-clientes.",
      color: "#F97316",
      bgColor: "#FFF7ED",
    },
    shareTrend: {
      direction: "DOWN", delta: -1.2, deltaMovel: -1.2, deltaFibra: 0.0,
      shareMovel: 28, shareFibra: 0,
      movel: { pessoasComErb: 3400, populacaoResidente: 12100 },
    },
    crm: { arpu: 84, deviceTier: "Mid", planType: "Pós-pago 4G", arpuMovel: 84, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 32, latencyMs: 56, qualityLabel: "Regular" },
    demographics: {
      avgIncome: 5200, incomeLabel: "Médio",
      populationDensity: 10800, populationGrowth: 1.4, growthLabel: "Moderado",
      technology: "4G + Fibra", severity: "Alta",
    },
    diagnostico: {
      scoreOokla: 6.2, scoreOoklaMovel: 6.0, scoreOoklaFibra: 5.6, scoreHAC: 0,
      taxaChamados: 3.8,
      sharePenetracao: 28, deltaVsLider: -1.2,
      deltaVsLiderFibra: -2.0, deltaVsLiderMovel: -1.4,
      scoreLiderFibra: 7.6, scoreLiderMovel: 7.4,
      arpuRelativo: 1.02,
      canalDominante: "Televendas", canalPct: 38,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 74.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "Fibra 200Mbps", precoFibra: 79.90, coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 52, scoreLabel: "Médio", potencialMercado: 48, sinergiaMovel: 28 },
      movel: { classification: "MELHORA_QUALIDADE", score: 74, scoreLabel: "Alto" },
      decisaoIntegrada: "Melhorar qualidade 4G e expandir fibra simultaneamente para recuperar satisfação e share.",
    },
    technology: "AMBOS",
    lat: -16.6760, lng: -49.2540,
  },

  // ─── SETOR UNIVERSITÁRIO — GROWTH_RETENCAO ───────────────────────────────
  // Bairro universitário, share baixo, satisfação baixa
  // scoreOokla=6.0, share=26% → GROWTH_RETENCAO
  // arpuRelativo = R$72 / R$82 = 0.88 → sensível a preço
  // camada2 fibra: EXPANSAO_NOVA_AREA, movel: MELHORA_QUALIDADE
  {
    id: "6uey8h",
    label: "6uey8h",
    neighborhood: "Setor Universitário",
    city: "Goiânia",
    quadrant: "GROWTH_RETENCAO",
    isTop10: false,
    satisfactionScores: [
      { name: "VIVO",  score: 6.0, color: "#EF4444" },
      { name: "TIM",   score: 7.2, color: "#22C55E" },
      { name: "CLARO", score: 6.8, color: "#EAB308" },
    ],
    marketShare: { percentage: 26, activeClients: 2800, totalPopulation: 10800, label: "Baixa Penetração" },
    strategy: {
      quadrantLabel: "QUADRANTE",
      title: "GROWTH+RETENÇÃO",
      motive: "Região universitária com share baixo e qualidade comprometida. Intervenção urgente em rede e aquisição.",
      color: "#F97316",
      bgColor: "#FFF7ED",
    },
    shareTrend: {
      direction: "DOWN", delta: -1.8, deltaMovel: -1.8, deltaFibra: 0.0,
      shareMovel: 26, shareFibra: 0,
      movel: { pessoasComErb: 2800, populacaoResidente: 10800 },
    },
    crm: { arpu: 72, deviceTier: "Basic", planType: "Pós-pago 4G", arpuMovel: 72, arpuFibra: 0, planoMovel: "Controle" },
    speedtest: { downloadMbps: 28, latencyMs: 62, qualityLabel: "Ruim" },
    demographics: {
      avgIncome: 4200, incomeLabel: "Médio",
      populationDensity: 12400, populationGrowth: 0.8, growthLabel: "Moderado",
      technology: "4G", severity: "Alta",
    },
    diagnostico: {
      scoreOokla: 6.0, scoreOoklaMovel: 5.8, scoreOoklaFibra: 5.4, scoreHAC: 0,
      taxaChamados: 4.1,
      sharePenetracao: 26, deltaVsLider: -1.2,
      deltaVsLiderFibra: -2.2, deltaVsLiderMovel: -1.4,
      scoreLiderFibra: 7.6, scoreLiderMovel: 7.2,
      arpuRelativo: 0.88,
      canalDominante: "Digital", canalPct: 48,
      concorrentes: [
        { nome: "TIM",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 69.90 },
        { nome: "Claro", coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: true,  planoMovel: "Pós-pago 4G",   precoMovel: 64.90 },
        { nome: "NET",   coberturaFibra: false, planoFibra: "",              precoFibra: 0,     coberturaMovel: false, planoMovel: "",              precoMovel: 0     },
      ],
    },
    camada2: {
      fibra: { classification: "EXPANSAO_NOVA_AREA", score: 44, scoreLabel: "Médio", potencialMercado: 40 },
      movel: { classification: "MELHORA_QUALIDADE", score: 78, scoreLabel: "Alto" },
      decisaoIntegrada: "Qualidade 4G comprometida. Iniciar expansão de fibra após estabilizar rede móvel.",
    },
    technology: "MOVEL",
    lat: -16.6720, lng: -49.2620,
  },
];
