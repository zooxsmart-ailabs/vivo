<script setup lang="ts">
// pages/growth.vue — Estratégias Growth
// Layout: sidebar (lista geohashes GROWTH) + área principal (header + 4 pilares + recomendação IA)
// Migrado de EstrategiasGrowth.tsx (React) para Vue/Nuxt 3
import { ref, computed } from "vue";
import { GEOHASH_DATA, QUADRANT_CONFIG, PRIORITY_CONFIG } from "~/utils/goiania";
import type { GeohashEntry } from "~/utils/goiania";
import { calcIARecomendacao, DECISAO_CONFIG, PRIORIDADE_CONFIG, scoreToPrioridade } from "~/utils/iaRecomendacao";

definePageMeta({ layout: "default" });

// ── Tipos ──────────────────────────────────────────────────────────────────
type PilarSignal = "POSITIVO" | "ATENCAO" | "CRITICO";

const SIG: Record<PilarSignal, { bg: string; dot: string; text: string; border: string; label: string }> = {
  POSITIVO: { bg: "#ffffff", dot: "#16A34A", text: "#15803D", border: "rgba(0,0,0,0.07)", label: "Positivo" },
  ATENCAO:  { bg: "#ffffff", dot: "#D97706", text: "#B45309", border: "rgba(0,0,0,0.07)", label: "Atenção"  },
  CRITICO:  { bg: "#ffffff", dot: "#DC2626", text: "#DC2626", border: "rgba(0,0,0,0.07)", label: "Crítico"  },
};

interface Metrica {
  label: string;
  formula: string;
  value: string;
  detail: string;
  signal: PilarSignal;
  noWrap?: boolean;
}

interface Pilar {
  id: string;
  title: string;
  description: string;
  signal: PilarSignal;
  metricas: Metrica[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSocialClass(income: number): { label: string; color: string; bg: string } {
  if (income >= 20000) return { label: "Classe A",  color: "#7C3AED", bg: "rgba(124,58,237,0.1)" };
  if (income >= 10000) return { label: "Classe B1", color: "#1D4ED8", bg: "rgba(29,78,216,0.1)" };
  if (income >= 6000)  return { label: "Classe B2", color: "#0369A1", bg: "rgba(3,105,161,0.1)" };
  if (income >= 3000)  return { label: "Classe C1", color: "#15803D", bg: "rgba(21,128,61,0.1)" };
  if (income >= 1500)  return { label: "Classe C2", color: "#B45309", bg: "rgba(180,83,9,0.1)" };
  return { label: "Classe D/E", color: "#DC2626", bg: "rgba(220,38,38,0.1)" };
}

function fmtCurrency(v?: number): string {
  if (!v || v === 0) return "—";
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function getSignal(value: number, thresholds: [number, number]): PilarSignal {
  if (value >= thresholds[1]) return "POSITIVO";
  if (value >= thresholds[0]) return "ATENCAO";
  return "CRITICO";
}

function buildPilares(g: GeohashEntry): Pilar[] {
  const d = g.diagnostico;
  const hasFibra = g.technology === "FIBRA" || g.technology === "AMBOS";
  const hasMovel = g.technology === "MOVEL" || g.technology === "AMBOS";

  // Pilar 1: Percepção
  const rawScoreMovel = d.scoreOoklaMovel > 0 ? d.scoreOoklaMovel
    : d.scoreOoklaFibra > 0 ? Math.max(4.0, d.scoreOoklaFibra - 1.2)
    : Math.max(4.0, g.priorityScore * 0.7);
  const speedMovelSignal: PilarSignal = rawScoreMovel >= 8 ? "POSITIVO" : rawScoreMovel >= 6 ? "ATENCAO" : "CRITICO";
  const speedMovelDetail = rawScoreMovel >= 8 ? "≥ 8.0 — Excelente" : rawScoreMovel >= 7 ? "7.0–7.9 — Bom" : rawScoreMovel >= 6 ? "6.0–6.9 — Regular" : "< 6.0 — Ruim";

  const rawScoreFibra = d.scoreOoklaFibra > 0 ? d.scoreOoklaFibra
    : d.scoreOoklaMovel > 0 ? Math.max(4.5, d.scoreOoklaMovel - 0.8)
    : Math.max(4.5, g.priorityScore * 0.75);
  const speedFibraSignal: PilarSignal = rawScoreFibra >= 8 ? "POSITIVO" : rawScoreFibra >= 6 ? "ATENCAO" : "CRITICO";
  const speedFibraDetail = rawScoreFibra >= 8 ? "≥ 8.0 — Excelente" : rawScoreFibra >= 7 ? "7.0–7.9 — Bom" : rawScoreFibra >= 6 ? "6.0–6.9 — Regular" : "< 6.0 — Ruim";

  const hacSignal: PilarSignal = d.scoreHAC <= 0 ? "ATENCAO"
    : d.scoreHAC >= 5.15 ? "POSITIVO" : d.scoreHAC >= 4.28 ? "ATENCAO" : "CRITICO";
  const hacDetail = d.scoreHAC <= 0 ? "Sem dados HAC"
    : d.scoreHAC >= 5.64 ? "≥ 5.64 — Altíssimo" : d.scoreHAC >= 5.15 ? "5.15–5.64 — Alto" : d.scoreHAC >= 4.78 ? "4.78–5.15 — Médio alto" : d.scoreHAC >= 4.28 ? "4.28–4.78 — Médio" : d.scoreHAC >= 3.89 ? "3.89–4.28 — Médio baixo" : d.scoreHAC >= 3.23 ? "3.23–3.89 — Baixo" : "< 3.23 — Baixíssimo";
  const p1Signal: PilarSignal = [speedMovelSignal, speedFibraSignal, hacSignal].includes("CRITICO") ? "CRITICO"
    : [speedMovelSignal, speedFibraSignal, hacSignal].includes("ATENCAO") ? "ATENCAO" : "POSITIVO";

  // Pilar 2: Concorrência
  const shareSignal: PilarSignal = d.sharePenetracao >= 50 ? "POSITIVO" : d.sharePenetracao >= 10 ? "ATENCAO" : "CRITICO";
  const shareDetail = d.sharePenetracao >= 50 ? "50–100% — Excelente" : d.sharePenetracao >= 30 ? "30–50% — Bom" : d.sharePenetracao >= 10 ? "10–30% — Razoável" : "< 10% — Ruim";

  const effDeltaFibra = d.deltaVsLiderFibra !== 0 ? d.deltaVsLiderFibra
    : (rawScoreFibra - (d.scoreLiderFibra > 0 ? d.scoreLiderFibra : rawScoreFibra - 0.3));
  const advFibraSignal: PilarSignal = effDeltaFibra > 0 ? "POSITIVO" : effDeltaFibra === 0 ? "ATENCAO" : "CRITICO";
  const catFibraVivo = rawScoreFibra >= 8 ? "Excelente" : rawScoreFibra >= 6 ? "Regular" : "Crítico";
  const catFibraLider = (d.scoreLiderFibra > 0 ? d.scoreLiderFibra : rawScoreFibra - 0.3) >= 8 ? "Excelente" : (d.scoreLiderFibra > 0 ? d.scoreLiderFibra : rawScoreFibra - 0.3) >= 6 ? "Regular" : "Crítico";
  const advFibraResultado = effDeltaFibra > 0 ? "Vantagem" : effDeltaFibra === 0 ? "Empate" : "Desvantagem";
  const advFibraDetail = `Vivo ${catFibraVivo} vs Líder ${catFibraLider} — ${advFibraResultado}`;
  const advFibraValue = effDeltaFibra >= 0 ? `+${effDeltaFibra.toFixed(1)}` : effDeltaFibra.toFixed(1);

  const effDeltaMovel = d.deltaVsLiderMovel !== 0 ? d.deltaVsLiderMovel
    : (rawScoreMovel - (d.scoreLiderMovel > 0 ? d.scoreLiderMovel : rawScoreMovel - 0.2));
  const catMovelVivo = rawScoreMovel >= 8 ? "Excelente" : rawScoreMovel >= 6 ? "Regular" : "Crítico";
  const catMovelLider = (d.scoreLiderMovel > 0 ? d.scoreLiderMovel : rawScoreMovel - 0.2) >= 8 ? "Excelente" : (d.scoreLiderMovel > 0 ? d.scoreLiderMovel : rawScoreMovel - 0.2) >= 6 ? "Regular" : "Crítico";
  const advMovelResultado = effDeltaMovel > 0 ? "Vantagem" : effDeltaMovel === 0 ? "Empate" : "Desvantagem";
  const advMovelDetail = `Vivo ${catMovelVivo} vs Líder ${catMovelLider} — ${advMovelResultado}`;
  const advMovelValue = effDeltaMovel >= 0 ? `+${effDeltaMovel.toFixed(1)}` : effDeltaMovel.toFixed(1);
  const advMovelSignal: PilarSignal = effDeltaMovel > 0 ? "POSITIVO" : effDeltaMovel === 0 ? "ATENCAO" : "CRITICO";
  const p2Signal: PilarSignal = [shareSignal, advFibraSignal, advMovelSignal].includes("CRITICO") ? "CRITICO"
    : [shareSignal, advFibraSignal, advMovelSignal].includes("ATENCAO") ? "ATENCAO" : "POSITIVO";

  // Pilar 3: Infraestrutura
  const fibraInfraSignal: PilarSignal = !hasFibra ? "ATENCAO"
    : g.camada2.fibra.classification === "SAUDAVEL" ? "POSITIVO"
    : g.camada2.fibra.classification === "AUMENTO_CAPACIDADE" ? "ATENCAO" : "CRITICO";
  const fibraStatusLabel = hasFibra
    ? g.camada2.fibra.classification.replace(/_/g, " ")
        .replace("SAUDAVEL", "SAUDÁVEL").replace("EXPANSAO NOVA AREA", "EXPANSÃO NOVA ÁREA")
        .replace("AUMENTO CAPACIDADE", "AUMENTO DE CAPACIDADE").replace("MELHORA QUALIDADE", "MELHORA DA QUALIDADE")
    : "EXPANSÃO NOVA ÁREA";
  const fibraDetail = hasFibra
    ? (fibraInfraSignal === "POSITIVO" ? `${fibraStatusLabel} — Growth Liberado` : fibraInfraSignal === "ATENCAO" ? `${fibraStatusLabel} — Controlado` : `${fibraStatusLabel} — Ação urgente`)
    : "EXPANSÃO NOVA ÁREA — Planejar";

  const movelInfraSignal: PilarSignal = !hasMovel ? "ATENCAO"
    : g.camada2.movel.classification === "SAUDAVEL" ? "POSITIVO"
    : g.camada2.movel.classification === "MELHORA_QUALIDADE" ? "CRITICO" : "ATENCAO";
  const movelStatusLabel = hasMovel
    ? g.camada2.movel.classification.replace(/_/g, " ")
        .replace("SAUDAVEL", "SAUDÁVEL").replace("MELHORA QUALIDADE", "MELHORA NA QUALIDADE")
        .replace("EXPANSAO COBERTURA", "EXPANSÃO DE COBERTURA")
    : "EXPANSÃO DE COBERTURA";
  const movelDetail = hasMovel
    ? (movelInfraSignal === "POSITIVO" ? `${movelStatusLabel} — Growth Liberado` : movelInfraSignal === "ATENCAO" ? `${movelStatusLabel} — Controlado` : `${movelStatusLabel} — Ação urgente`)
    : "EXPANSÃO DE COBERTURA — Planejar Expansão";
  const p3Signal: PilarSignal = [fibraInfraSignal, movelInfraSignal].includes("CRITICO") ? "CRITICO"
    : [fibraInfraSignal, movelInfraSignal].includes("ATENCAO") ? "ATENCAO" : "POSITIVO";

  // Pilar 4: Comportamento
  const arpuSignal: PilarSignal = d.arpuRelativo >= 1.1 ? "POSITIVO" : d.arpuRelativo >= 0.9 ? "ATENCAO" : "CRITICO";
  const arpuDetail = d.arpuRelativo >= 1.1 ? "Índice > 1.1 — Foco em Totalização"
    : d.arpuRelativo >= 0.9 ? "0.9 a 1.1 — Mix de Ofertas" : "< 0.9 — Sensível a Preço";
  const canalSignal: PilarSignal = d.canalPct >= 50 ? "POSITIVO" : d.canalPct >= 20 ? "ATENCAO" : "CRITICO";
  const canalDetail = d.canalPct >= 50 ? "> 50% — Canal Dominante (80% verba)"
    : d.canalPct >= 20 ? "20–50% — Canal Complementar (verba proporcional)" : "< 20% — Canal Ineficiente (reduzir ou realocar)";
  const p4Signal: PilarSignal = [arpuSignal, canalSignal].includes("CRITICO") ? "CRITICO"
    : [arpuSignal, canalSignal].includes("ATENCAO") ? "ATENCAO" : "POSITIVO";

  return [
    {
      id: "01", title: "Percepção", description: "Entender a percepção do usuário",
      signal: p1Signal,
      metricas: [
        { label: "SpeedTest Fibra", formula: "Score Ookla — SpeedTest Vivo Fibra no Geohash", value: rawScoreFibra.toFixed(1), detail: speedFibraDetail, signal: speedFibraSignal },
        { label: "SpeedTest Móvel", formula: "Score Ookla — SpeedTest Vivo Móvel no Geohash", value: rawScoreMovel.toFixed(1), detail: speedMovelDetail, signal: speedMovelSignal },
        { label: "Score HAC", formula: "Avaliação de qualidade HAC — Fibra", value: d.scoreHAC > 0 ? d.scoreHAC.toFixed(1) : "—", detail: hacDetail, signal: hacSignal },
      ],
    },
    {
      id: "02", title: "Concorrência", description: "Entender presença, satisfação e preço da concorrência",
      signal: p2Signal,
      metricas: [
        { label: "Share / Penetração", formula: "Base Vivo / Total Domicílios (Zoox)", value: `${d.sharePenetracao}%`, detail: shareDetail, signal: shareSignal },
        { label: "Vantagem Satisfação Fibra", formula: "Comparação por categoria: Excelente / Regular / Crítico (Ookla)", noWrap: true, value: advFibraValue, detail: advFibraDetail, signal: advFibraSignal },
        { label: "Vantagem Satisfação Móvel", formula: "Comparação por categoria: Excelente / Regular / Crítico (Ookla)", noWrap: true, value: advMovelValue, detail: advMovelDetail, signal: advMovelSignal },
      ],
    },
    {
      id: "03", title: "Infraestrutura", description: "Ações técnicas direcionadas pelo cruzamento de capacidade e qualidade",
      signal: p3Signal,
      metricas: [
        { label: "Fibra (Status)", formula: "Saudável / Melhora da Qualidade / Aumento da Capacidade / Expansão Nova Área", value: fibraStatusLabel, detail: fibraDetail, signal: fibraInfraSignal },
        { label: "Móvel (Status)", formula: "Saudável / Melhora da Qualidade / Expansão Nova Área", value: movelStatusLabel, detail: movelDetail, signal: movelInfraSignal },
      ],
    },
    {
      id: "04", title: "Comportamento", description: "Análise de comportamento de consumo e canal",
      signal: p4Signal,
      metricas: [
        { label: "Sensibilidade a Preço", formula: "ARPU Geohash / ARPU Médio da Cidade", value: d.arpuRelativo.toFixed(2), detail: arpuDetail, signal: arpuSignal },
        { label: "Afinidade de Canal", formula: "Vendas Canal X / Total Vendas no Geohash", value: `${d.canalDominante} (${d.canalPct}%)`, detail: canalDetail, signal: canalSignal },
      ],
    },
  ];
}

// ── Estado ──────────────────────────────────────────────────────────────────
const search = ref("");
const selectedId = ref<string | null>(null);

const filtered = computed(() => {
  let data = GEOHASH_DATA.filter(g => g.quadrant === "GROWTH");
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    data = data.filter(g => g.id.includes(q) || g.neighborhood.toLowerCase().includes(q));
  }
  return [...data].sort((a, b) => b.priorityScore - a.priorityScore);
});

const displayGeo = computed<GeohashEntry | null>(() => {
  if (selectedId.value) return GEOHASH_DATA.find(g => g.id === selectedId.value) ?? filtered.value[0] ?? null;
  return filtered.value[0] ?? null;
});

const pilares = computed<Pilar[]>(() => displayGeo.value ? buildPilares(displayGeo.value) : []);
const ia = computed(() => displayGeo.value ? calcIARecomendacao(displayGeo.value) : null);

const pilaresOrdenados = computed(() => {
  if (!pilares.value.length) return [];
  const order = ["01", "02", "03", "04"];
  return order.map(id => pilares.value.find(p => p.id === id)!).filter(Boolean);
});
</script>

<template>
  <div style="display:flex;height:100%;overflow:hidden;background:#F2F2F7;">
    <!-- Sidebar -->
    <div style="width:220px;min-width:200px;max-width:240px;background:#C7C7CC;display:flex;flex-direction:column;border-right:1px solid rgba(0,0,0,0.12);height:100%;">
      <!-- Busca -->
      <div style="padding:12px 10px;border-bottom:1px solid rgba(0,0,0,0.07);">
        <div style="position:relative;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="search"
            placeholder="Buscar geohash..."
            style="width:100%;box-sizing:border-box;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:8px;padding:6px 8px 6px 26px;font-size:13px;color:#1C1C1E;outline:none;font-family:inherit;"
          />
        </div>
      </div>
      <!-- Lista -->
      <div style="flex:1;overflow-y:auto;">
        <div v-if="filtered.length === 0" style="padding:24px 12px;text-align:center;color:#8E8E93;font-size:12px;">
          Nenhum geohash encontrado
        </div>
        <button
          v-else
          v-for="(g, idx) in filtered"
          :key="g.id"
          @click="selectedId = g.id"
          :style="{
            width:'100%', textAlign:'left',
            padding:'8px 12px', borderBottom:'1px solid rgba(0,0,0,0.05)',
            background: displayGeo?.id === g.id ? 'rgba(255,255,255,0.7)' : 'transparent',
            borderLeft: displayGeo?.id === g.id ? `2.5px solid ${QUADRANT_CONFIG[g.quadrant].color}` : '2.5px solid transparent',
            cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
          }"
        >
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:2px;">
            <div style="display:flex;align-items:center;gap:5px;min-width:0;">
              <span style="font-size:12px;font-weight:800;color:#3C3C43;flex-shrink:0;">#{{ idx + 1 }}</span>
              <span style="font-size:12px;font-weight:700;color:#1C1C1E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ g.neighborhood }}</span>
            </div>
            <span style="font-size:12px;font-weight:800;color:#660099;flex-shrink:0;">{{ g.priorityScore.toFixed(1) }}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:11px;color:#3C3C43;font-family:monospace;">{{ g.id }}</span>
            <span :style="{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'14px',fontWeight:700,color:'#fff',background:QUADRANT_CONFIG[g.quadrant].color,padding:'2px 7px 2px 5px',borderRadius:'20px'}">
              <span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.8);flex-shrink:0;display:inline-block;" />
              {{ QUADRANT_CONFIG[g.quadrant].label }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Área principal -->
    <div v-if="displayGeo" style="flex:1;overflow-y:auto;padding:20px;">
      <!-- Bloco de Identificação -->
      <div style="background:#fff;border-radius:14px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 4px rgba(0,0,0,0.05);overflow:hidden;margin-bottom:16px;">
        <!-- Linha 1: Nome + Badge de Prioridade -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 10px;border-bottom:1px solid rgba(0,0,0,0.06);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:10px;background:#F2F2F7;border:1px solid rgba(0,0,0,0.07);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <div style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1.2;">{{ displayGeo.neighborhood }}</div>
              <div style="font-size:11px;color:#8E8E93;margin-top:2px;">{{ displayGeo.city }} · {{ displayGeo.id }}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;border:1px solid rgba(0,0,0,0.07);background:#F2F2F7;flex-shrink:0;">
            <span style="font-size:22px;font-weight:800;color:#22c55e;line-height:1;">{{ displayGeo.priorityScore.toFixed(1) }}</span>
            <div style="display:flex;flex-direction:column;">
              <span style="font-size:13px;font-weight:800;color:#22c55e;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;">
                {{ PRIORITY_CONFIG[displayGeo.priority].label }}
              </span>
              <span style="font-size:8px;color:#8E8E93;line-height:1.2;">Score de Priorização</span>
            </div>
          </div>
        </div>

        <!-- Linha 2: Dados Demográficos -->
        <div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,0.06);">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
            <!-- População -->
            <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 3px rgba(0,0,0,0.04);padding:8px 10px;display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;">
                <div style="display:flex;align-items:center;gap:5px;min-width:0;">
                  <div style="width:16px;height:16px;border-radius:5px;background:rgba(102,0,153,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">População</span>
                </div>
                <span style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;flex-shrink:0;padding-top:2px;">~{{ (Math.round(displayGeo.demographics.populationDensity * 1.22 / 100) * 100).toLocaleString('pt-BR') }}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <div style="display:flex;gap:3px;flex-wrap:wrap;">
                  <span :style="{fontSize:'14px',fontWeight:700,padding:'1px 6px',borderRadius:'20px',whiteSpace:'nowrap',height:'14px',display:'inline-flex',alignItems:'center',marginTop:'3px',color: displayGeo.demographics.populationDensity > 8000 ? '#DC2626' : displayGeo.demographics.populationDensity > 4000 ? '#D97706' : '#16A34A',background: displayGeo.demographics.populationDensity > 8000 ? 'rgba(220,38,38,0.08)' : displayGeo.demographics.populationDensity > 4000 ? 'rgba(217,119,6,0.08)' : 'rgba(22,163,74,0.08)',border: `1px solid ${displayGeo.demographics.populationDensity > 8000 ? '#DC2626' : displayGeo.demographics.populationDensity > 4000 ? '#D97706' : '#16A34A'}30`}">
                    {{ displayGeo.demographics.populationDensity > 8000 ? "Alta densidade" : displayGeo.demographics.populationDensity > 4000 ? "Média densidade" : "Baixa densidade" }}
                  </span>
                </div>
                <div style="font-size:11px;color:#8E8E93;text-align:right;flex-shrink:0;">hab</div>
              </div>
            </div>
            <!-- Densidade -->
            <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 3px rgba(0,0,0,0.04);padding:8px 10px;display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;">
                <div style="display:flex;align-items:center;gap:5px;min-width:0;">
                  <div style="width:16px;height:16px;border-radius:5px;background:rgba(102,0,153,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Densidade</span>
                </div>
                <span style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;flex-shrink:0;padding-top:2px;">{{ (displayGeo.demographics.populationDensity / 1000).toFixed(1) }}k</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <div style="display:flex;gap:3px;flex-wrap:wrap;">
                  <span style="font-size:12px;font-weight:700;padding:1px 6px;border-radius:20px;white-space:nowrap;height:14px;display:inline-flex;align-items:center;margin-top:3px;color:#5856D6;background:rgba(88,86,214,0.08);border:1px solid rgba(88,86,214,0.3);">
                    {{ displayGeo.demographics.populationDensity > 6000 ? "Urbano denso" : displayGeo.demographics.populationDensity > 3000 ? "Urbano médio" : "Urbano baixo" }}
                  </span>
                </div>
                <div style="font-size:11px;color:#8E8E93;text-align:right;flex-shrink:0;">hab/km²</div>
              </div>
            </div>
            <!-- Renda Média -->
            <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 3px rgba(0,0,0,0.04);padding:8px 10px;display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;">
                <div style="display:flex;align-items:center;gap:5px;min-width:0;">
                  <div style="width:16px;height:16px;border-radius:5px;background:rgba(102,0,153,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Renda Média</span>
                </div>
                <span style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;flex-shrink:0;padding-top:2px;">{{ fmtCurrency(displayGeo.demographics.avgIncome) }}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;">
                <div style="font-size:11px;color:#8E8E93;text-align:right;flex-shrink:0;">renda domiciliar</div>
              </div>
            </div>
            <!-- Classe Social -->
            <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 3px rgba(0,0,0,0.04);padding:8px 10px;display:flex;flex-direction:column;gap:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;">
                <div style="display:flex;align-items:center;gap:5px;min-width:0;">
                  <div style="width:16px;height:16px;border-radius:5px;background:rgba(102,0,153,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </div>
                  <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Classe Social</span>
                </div>
                <span style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;flex-shrink:0;padding-top:2px;">{{ getSocialClass(displayGeo.demographics.avgIncome ?? 0).label }}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;">
                <div style="font-size:11px;color:#8E8E93;text-align:right;flex-shrink:0;">classificação IBGE</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Linha 3: Fibra + Móvel -->
        <div style="padding:12px 16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <!-- Card Fibra -->
            <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;height:65px;">
              <div style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-bottom:1px solid rgba(0,0,0,0.06);background:rgba(102,0,153,0.03);height:27px;">
                <div style="width:16px;height:16px;border-radius:5px;background:rgba(102,0,153,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                </div>
                <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;padding-top:1px;">Fibra</span>
              </div>
              <div style="padding:8px 10px 0px;height:34px;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 6px;">
                  <div style="text-align:center;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Share</div>
                    <div style="display:flex;align-items:baseline;justify-content:center;gap:3px;margin-left:9px;">
                      <span style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;">
                        {{ (() => { const rawF = displayGeo.shareTrend.shareFibra ?? 0; const pctF = displayGeo.marketShare.percentage; return rawF > 0 ? rawF : (displayGeo.technology === 'MOVEL' ? Math.round(pctF * 0.65) : Math.round(pctF * 0.9)); })() }}%
                      </span>
                      <span :style="{fontSize:'14px',fontWeight:700,color: (() => { const rawF = displayGeo.shareTrend.shareFibra ?? 0; const pctF = displayGeo.marketShare.percentage; const sfv = rawF > 0 ? rawF : (displayGeo.technology === 'MOVEL' ? Math.round(pctF * 0.65) : Math.round(pctF * 0.9)); const dfv = sfv - 22; return dfv >= 5 ? '#15803D' : dfv >= 0 ? '#B45309' : '#DC2626'; })()}">
                        {{ (() => { const rawF = displayGeo.shareTrend.shareFibra ?? 0; const pctF = displayGeo.marketShare.percentage; const sfv = rawF > 0 ? rawF : (displayGeo.technology === 'MOVEL' ? Math.round(pctF * 0.65) : Math.round(pctF * 0.9)); const dfv = sfv - 22; return `${dfv >= 0 ? '+' : ''}${dfv.toFixed(1)} p.p.`; })() }}
                      </span>
                    </div>
                  </div>
                  <div style="text-align:center;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">ARPU</div>
                    <div style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;">R$ {{ displayGeo.crm?.arpuFibra > 0 ? displayGeo.crm.arpuFibra : (displayGeo.crm?.arpu ?? '—') }}</div>
                  </div>
                  <div style="text-align:center;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Plano</div>
                    <div style="font-size:12px;font-weight:700;color:#1C1C1E;line-height:1.2;">{{ displayGeo.crm?.planType ?? "—" }}</div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Card Móvel -->
            <div style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;height:65px;">
              <div style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-bottom:1px solid rgba(0,0,0,0.06);background:rgba(102,0,153,0.03);height:27px;">
                <div style="width:16px;height:16px;border-radius:5px;background:rgba(102,0,153,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
                <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;padding-top:1px;">Móvel</span>
              </div>
              <div style="padding:8px 10px 0px;height:34px;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 6px;">
                  <div style="text-align:center;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Share</div>
                    <div style="display:flex;align-items:baseline;justify-content:center;gap:3px;margin-left:9px;">
                      <span style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;">
                        {{ (() => { const rawM = displayGeo.shareTrend.shareMovel ?? 0; const pctM = displayGeo.marketShare.percentage; return rawM > 0 ? rawM : (displayGeo.technology === 'FIBRA' ? Math.round(pctM * 0.35) : Math.round(pctM * 0.9)); })() }}%
                      </span>
                      <span :style="{fontSize:'14px',fontWeight:700,color: (() => { const rawM = displayGeo.shareTrend.shareMovel ?? 0; const pctM = displayGeo.marketShare.percentage; const smv = rawM > 0 ? rawM : (displayGeo.technology === 'FIBRA' ? Math.round(pctM * 0.35) : Math.round(pctM * 0.9)); const dmv = smv - 18; return dmv >= 5 ? '#15803D' : dmv >= 0 ? '#B45309' : '#DC2626'; })()}">
                        {{ (() => { const rawM = displayGeo.shareTrend.shareMovel ?? 0; const pctM = displayGeo.marketShare.percentage; const smv = rawM > 0 ? rawM : (displayGeo.technology === 'FIBRA' ? Math.round(pctM * 0.35) : Math.round(pctM * 0.9)); const dmv = smv - 18; return `${dmv >= 0 ? '+' : ''}${dmv.toFixed(1)} p.p.`; })() }}
                      </span>
                    </div>
                  </div>
                  <div style="text-align:center;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">ARPU</div>
                    <div style="font-size:13px;font-weight:800;color:#1C1C1E;line-height:1;">R$ {{ displayGeo.crm?.arpuMovel > 0 ? displayGeo.crm.arpuMovel : (displayGeo.crm?.arpu ?? '—') }}</div>
                  </div>
                  <div style="text-align:center;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Plano</div>
                    <div style="font-size:12px;font-weight:700;color:#1C1C1E;line-height:1.2;">{{ displayGeo.crm?.planoMovel ?? "—" }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Layout: Pilares (esq) + Recomendação (dir) -->
      <div style="display:flex;gap:16px;align-items:flex-start;margin-top:-6px;width:661px;">
        <!-- 4 Pilares -->
        <div style="flex:0 0 auto;">
          <div style="margin-bottom:4px;margin-top:-4px;padding-top:4px;padding-bottom:4px;">
            <span style="font-size:11px;font-weight:800;color:#1C1C1E;letter-spacing:0.06em;text-transform:uppercase;">Avaliação dos 4 Pilares</span>
          </div>
          <div style="display:grid;grid-template-columns:435px 435px;gap:10px;">
            <div
              v-for="pilar in pilaresOrdenados"
              :key="pilar.id"
              style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.07);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);width:435px;"
            >
              <!-- Header do Pilar -->
              <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid rgba(0,0,0,0.06);">
                <div style="display:flex;align-items:center;gap:7px;">
                  <div style="width:22px;height:22px;border-radius:50%;background:rgba(102,0,153,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg v-if="pilar.id === '01'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <svg v-if="pilar.id === '02'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                    <svg v-if="pilar.id === '03'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                    <svg v-if="pilar.id === '04'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <span style="font-size:12px;font-weight:800;color:#1C1C1E;letter-spacing:0.03em;">{{ pilar.title }}</span>
                </div>
                <span :style="{fontSize:'14px',fontWeight:700,color:'#fff',background:SIG[pilar.signal].dot,padding:'2px 8px',borderRadius:'20px',flexShrink:0}">
                  {{ SIG[pilar.signal].label }}
                </span>
              </div>
              <!-- Métricas -->
              <div style="padding:8px 10px;display:flex;flex-direction:column;gap:6px;">
                <div
                  v-for="(m, i) in pilar.metricas"
                  :key="i"
                  :style="{
                    borderRadius:'8px', border:'1px solid rgba(0,0,0,0.07)', background:'#fff',
                    padding: pilar.id === '01' ? '12px 10px' : '5px 10px',
                    marginTop: pilar.id === '01' ? (i === 0 ? '0px' : '12px') : '0px',
                    marginBottom: pilar.id === '01' ? '12px' : '0px',
                  }"
                >
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;">
                    <div style="min-width:0;">
                      <div style="display:flex;align-items:center;gap:5px;">
                        <span style="font-size:12px;font-weight:700;color:#1C1C1E;line-height:1.3;">{{ m.label }}</span>
                      </div>
                      <div :style="{fontSize:'14px',color:'#8E8E93',lineHeight:'1.4',marginTop:'6px',maxWidth:'360px',whiteSpace:'nowrap'}">{{ m.formula }}</div>
                    </div>
                    <div :style="{fontSize:'14px',fontWeight:800,color:SIG[m.signal].text,flexShrink:0,whiteSpace:'nowrap'}">{{ m.value }}</div>
                  </div>
                  <div :style="{fontSize:'14px',fontWeight:600,color:SIG[m.signal].text,lineHeight:'1.4',whiteSpace:(m.noWrap || m.label === 'Fibra (Status)' || m.label === 'Móvel (Status)') ? 'nowrap' : 'normal'}">{{ m.detail }}</div>
                </div>

                <!-- Tabela de concorrência (pilar 02) -->
                <div
                  v-if="pilar.id === '02' && displayGeo.diagnostico.concorrentes && displayGeo.diagnostico.concorrentes.length > 0"
                  style="border-radius:8px;border:1px solid rgba(0,0,0,0.07);background:#fff;overflow:hidden;"
                >
                  <div style="padding:5px 10px;border-bottom:1px solid rgba(0,0,0,0.06);background:#F9F9FB;height:18px;display:flex;align-items:center;">
                    <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Comparativo de Concorrência</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead>
                      <tr style="background:#F9F9FB;">
                        <th rowspan="2" style="padding:5px 8px;text-align:left;font-weight:700;color:#8E8E93;font-size:10px;letter-spacing:0.04em;vertical-align:middle;border-right:1px solid rgba(0,0,0,0.06);width:70px;">Operadora</th>
                        <th colspan="2" style="text-align:center;font-weight:700;color:#8E8E93;font-size:10px;letter-spacing:0.04em;border-right:1px solid rgba(0,0,0,0.06);border-bottom:1px solid rgba(0,0,0,0.06);height:9px;">Fibra</th>
                        <th colspan="2" style="text-align:center;font-weight:700;color:#8E8E93;font-size:10px;letter-spacing:0.04em;border-bottom:1px solid rgba(0,0,0,0.06);height:9px;">Móvel</th>
                      </tr>
                      <tr style="background:#F9F9FB;">
                        <th style="text-align:center;font-weight:600;color:#AEAEB2;font-size:8px;border-right:1px solid rgba(0,0,0,0.06);border-bottom:1px solid rgba(0,0,0,0.06);height:10px;width:70px;">Cobertura</th>
                        <th style="text-align:center;font-weight:600;color:#AEAEB2;font-size:8px;border-right:1px solid rgba(0,0,0,0.06);border-bottom:1px solid rgba(0,0,0,0.06);height:10px;width:70px;">Valor</th>
                        <th style="text-align:center;font-weight:600;color:#AEAEB2;font-size:8px;border-right:1px solid rgba(0,0,0,0.06);border-bottom:1px solid rgba(0,0,0,0.06);height:10px;width:70px;">Cobertura</th>
                        <th style="text-align:center;font-weight:600;color:#AEAEB2;font-size:8px;border-bottom:1px solid rgba(0,0,0,0.06);height:10px;width:70px;">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(c, ci) in displayGeo.diagnostico.concorrentes" :key="ci" :style="{background: ci % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom:'1px solid rgba(0,0,0,0.04)'}">
                        <td style="padding:3px 8px;font-weight:700;color:#1C1C1E;font-size:12px;border-right:1px solid rgba(0,0,0,0.06);">{{ c.nome }}</td>
                        <td style="padding:3px 6px;text-align:center;border-right:1px solid rgba(0,0,0,0.06);">
                          <span style="font-size:12px;font-weight:600;color:#c869f7;">{{ c.coberturaFibra ? "Sim" : "Não" }}</span>
                        </td>
                        <td style="padding:3px 6px;text-align:center;border-right:1px solid rgba(0,0,0,0.06);">
                          <div v-if="c.coberturaFibra">
                            <div style="font-size:12px;font-weight:700;color:#1C1C1E;line-height:1.3;">R$ {{ c.precoFibra }}</div>
                            <div style="font-size:8px;color:#8E8E93;line-height:1.2;">{{ c.planoFibra }}</div>
                          </div>
                          <span v-else style="color:#C7C7CC;">—</span>
                        </td>
                        <td style="padding:3px 6px;text-align:center;border-right:1px solid rgba(0,0,0,0.06);">
                          <span style="font-size:12px;font-weight:700;color:#660099;">{{ c.coberturaMovel ? "Sim" : "Não" }}</span>
                        </td>
                        <td style="padding:3px 6px;text-align:center;">
                          <div v-if="c.coberturaMovel">
                            <div style="font-size:12px;font-weight:700;color:#1C1C1E;line-height:1.3;">R$ {{ c.precoMovel }}</div>
                            <div style="font-size:8px;color:#8E8E93;line-height:1.2;">{{ c.planoMovel }}</div>
                          </div>
                          <span v-else style="color:#C7C7CC;">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna direita: Recomendação + IA -->
        <div v-if="ia" style="flex:0 0 auto;display:flex;flex-direction:column;gap:16px;">
          <div>
            <div style="margin-bottom:4px;margin-top:-4px;padding-top:4px;padding-bottom:4px;">
              <span style="font-size:11px;font-weight:800;color:#1C1C1E;letter-spacing:0.06em;text-transform:uppercase;">Recomendação Estratégica</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;height:450px;width:372px;">
              <!-- Cards Móvel + Fibra -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:372px;padding-bottom:10px;">
                <!-- Móvel -->
                <div style="background:#fff;border-radius:12px;border:1px solid rgba(102,0,153,0.25);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);width:181px;margin-top:1px;">
                  <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.06);background:rgba(102,0,153,0.08);">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    <span style="font-size:11px;font-weight:800;color:#660099;text-transform:uppercase;letter-spacing:0.06em;">Móvel</span>
                  </div>
                  <div style="padding:15px 12px;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Score de Priorização</div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                      <span :style="{fontSize:'20px',fontWeight:800,color:PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaMovel > 0 ? displayGeo.diagnostico.scoreOoklaMovel : displayGeo.priorityScore))].color,lineHeight:1}">
                        {{ Math.min(10, displayGeo.diagnostico.scoreOoklaMovel > 0 ? displayGeo.diagnostico.scoreOoklaMovel : displayGeo.priorityScore).toFixed(1) }}
                      </span>
                      <span :style="{fontSize:'14px',fontWeight:700,color:PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaMovel > 0 ? displayGeo.diagnostico.scoreOoklaMovel : displayGeo.priorityScore))].color,background:PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaMovel > 0 ? displayGeo.diagnostico.scoreOoklaMovel : displayGeo.priorityScore))].bg,padding:'2px 7px',borderRadius:'20px',border:`1px solid ${PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaMovel > 0 ? displayGeo.diagnostico.scoreOoklaMovel : displayGeo.priorityScore))].color}40`}">
                        {{ scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaMovel > 0 ? displayGeo.diagnostico.scoreOoklaMovel : displayGeo.priorityScore)) }} PRIORIDADE
                      </span>
                    </div>
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Decisão</div>
                    <div style="display:flex;align-items:center;gap:5px;">
                      <span :style="{color:DECISAO_CONFIG[ia.movel.decisao].color,display:'flex'}">
                        <svg v-if="ia.movel.decisao === 'ATACAR'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                        <svg v-if="ia.movel.decisao === 'AGUARDAR'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <svg v-if="ia.movel.decisao === 'RETER'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <svg v-if="ia.movel.decisao === 'EXPANDIR'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                      </span>
                      <span :style="{fontSize:'13px',fontWeight:800,color:DECISAO_CONFIG[ia.movel.decisao].color}">{{ DECISAO_CONFIG[ia.movel.decisao].label }}</span>
                    </div>
                  </div>
                </div>
                <!-- Fibra -->
                <div style="background:#fff;border-radius:12px;border:1px solid rgba(102,0,153,0.25);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);width:181px;margin-top:1px;">
                  <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.06);background:rgba(102,0,153,0.08);">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    <span style="font-size:11px;font-weight:800;color:#660099;text-transform:uppercase;letter-spacing:0.06em;">Fibra</span>
                  </div>
                  <div style="padding:15px 12px;">
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Score de Priorização</div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                      <span :style="{fontSize:'20px',fontWeight:800,color:PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaFibra > 0 ? displayGeo.diagnostico.scoreOoklaFibra : displayGeo.priorityScore))].color,lineHeight:1}">
                        {{ Math.min(10, displayGeo.diagnostico.scoreOoklaFibra > 0 ? displayGeo.diagnostico.scoreOoklaFibra : displayGeo.priorityScore).toFixed(1) }}
                      </span>
                      <span :style="{fontSize:'14px',fontWeight:700,color:PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaFibra > 0 ? displayGeo.diagnostico.scoreOoklaFibra : displayGeo.priorityScore))].color,background:PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaFibra > 0 ? displayGeo.diagnostico.scoreOoklaFibra : displayGeo.priorityScore))].bg,padding:'2px 7px',borderRadius:'20px',border:`1px solid ${PRIORIDADE_CONFIG[scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaFibra > 0 ? displayGeo.diagnostico.scoreOoklaFibra : displayGeo.priorityScore))].color}40`}">
                        {{ scoreToPrioridade(Math.min(10, displayGeo.diagnostico.scoreOoklaFibra > 0 ? displayGeo.diagnostico.scoreOoklaFibra : displayGeo.priorityScore)) }} PRIORIDADE
                      </span>
                    </div>
                    <div style="font-size:8px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Decisão</div>
                    <div style="display:flex;align-items:center;gap:5px;">
                      <span :style="{color:DECISAO_CONFIG[ia.fibra.decisao].color,display:'flex'}">
                        <svg v-if="ia.fibra.decisao === 'ATACAR'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                        <svg v-if="ia.fibra.decisao === 'AGUARDAR'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <svg v-if="ia.fibra.decisao === 'RETER'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <svg v-if="ia.fibra.decisao === 'EXPANDIR'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                      </span>
                      <span :style="{fontSize:'13px',fontWeight:800,color:DECISAO_CONFIG[ia.fibra.decisao].color}">{{ DECISAO_CONFIG[ia.fibra.decisao].label }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card Recomendação IA -->
              <div style="background:#fff;border-radius:12px;border:1px solid rgba(102,0,153,0.25);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);width:372px;height:285px;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.06);background:rgba(102,0,153,0.08);height:31px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>
                    <span style="font-size:11px;font-weight:800;color:#660099;text-transform:uppercase;letter-spacing:0.06em;">Recomendação IA</span>
                  </div>
                  <span style="font-size:11px;color:#8E8E93;font-style:italic;">Gerado automaticamente</span>
                </div>
                <div style="padding:20px 12px;border-bottom:1px solid rgba(0,0,0,0.06);height:70px;">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l1-4h18l1 4"/><path d="M2 7h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/><path d="M9 7v13"/><path d="M15 7v13"/><path d="M2 12h20"/></svg>
                    <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Canal Recomendado</span>
                  </div>
                  <div style="font-size:12px;color:#1C1C1E;line-height:1.5;">{{ ia.canalRecomendado }}</div>
                </div>
                <div style="padding:18px 12px;border-bottom:1px solid rgba(0,0,0,0.06);height:80px;">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l3 4v-12l-3 4H4a1 1 0 0 0-1 1z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Abordagem Comercial</span>
                  </div>
                  <div style="font-size:12px;color:#1C1C1E;line-height:1.5;width:346px;">{{ ia.abordagemComercial }}</div>
                </div>
                <div style="padding:18px 12px;">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
                    <span style="font-size:10px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:0.06em;">Raciocínio</span>
                  </div>
                  <div style="font-size:12px;color:#3C3C43;line-height:1.5;">{{ ia.raciocinio }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vazio -->
    <div v-else style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#8E8E93;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      <div style="font-size:12px;">Selecione um geohash na lista à esquerda</div>
    </div>
  </div>
</template>
