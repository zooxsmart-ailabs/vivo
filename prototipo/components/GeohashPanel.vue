<script setup lang="ts">
// GeohashPanel.vue — GeoIntelligence Vivo × Zoox
// Migrado de GeohashPanel.tsx (React) para Vue 3 / Nuxt 3
// Design: Vivo Brand × Apple iOS Clean Light — Nunito Sans
import {
  QUADRANT_CONFIG, TECH_CONFIG, PRIORITY_CONFIG,
} from "~/utils/goiania";
import type { GeohashEntry } from "~/utils/goiania";
import {
  calcIARecomendacao, DECISAO_CONFIG, PRIORIDADE_CONFIG,
} from "~/utils/iaRecomendacao";

interface Props {
  geohash: GeohashEntry | null;
  allGeohashes?: GeohashEntry[];
  activeTech?: string;
}
const props = withDefaults(defineProps<Props>(), {
  activeTech: "ALL",
  allGeohashes: () => [],
});

// Sub-abas
const activeSubTab = ref<"ficha" | "overview">("ficha");
watch(() => props.geohash, () => { activeSubTab.value = "ficha"; });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const OPERATOR_COLORS: Record<string, string> = {
  "VIVO": "#660099", "Vivo": "#660099",
  "TIM": "#1E40AF",
  "Claro": "#DA291C", "CLARO": "#DA291C", "NET": "#DA291C",
  "LinQ": "#F8A81B", "LINQ": "#F8A81B",
  "Oi": "#32E000", "NIO": "#32E000",
  "Algar": "#28BEA5", "ALGAR": "#28BEA5",
  "Surf": "#0003F9", "SURF": "#0003F9",
  "V.tal": "#FFE84D", "VTAL": "#FFE84D",
};
function getOperatorColor(name: string): string {
  for (const [key, color] of Object.entries(OPERATOR_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#8E8E93";
}
const BRAND_COLORS: Record<string, string> = {
  "VIVO": "#660099",
  "TIM": "#1E40AF",
  "CLARO": "#DA291C", "Claro": "#DA291C", "NET": "#DA291C",
  "LINQ TELECOM": "#F8A81B", "LINQ": "#F8A81B", "LinQ": "#F8A81B",
  "OI": "#32E000", "NIO": "#32E000",
  "ALGAR": "#28BEA5", "Algar": "#28BEA5",
  "SURF": "#0003F9", "Surf": "#0003F9",
  "V.TAL": "#FFE84D", "V.tal": "#FFE84D",
};
function brandColor(name: string, score: number): string {
  return BRAND_COLORS[name] ?? (score >= 8 ? "#22C55E" : score >= 7 ? "#EAB308" : "#EF4444");
}
function getClasseSocial(income: number) {
  if (income >= 20000) return { label: "Classe A",  color: "#7C3AED", bg: "rgba(124,58,237,0.1)" };
  if (income >= 10000) return { label: "Classe B1", color: "#1D4ED8", bg: "rgba(29,78,216,0.1)" };
  if (income >= 6000)  return { label: "Classe B2", color: "#0369A1", bg: "rgba(3,105,161,0.1)" };
  if (income >= 3000)  return { label: "Classe C1", color: "#15803D", bg: "rgba(21,128,61,0.1)" };
  if (income >= 1500)  return { label: "Classe C2", color: "#B45309", bg: "rgba(180,83,9,0.1)" };
  return { label: "Classe D/E", color: "#DC2626", bg: "rgba(220,38,38,0.1)" };
}
function estimatePopulation(density: number): string {
  const pop = Math.round(density * 1.22 / 100) * 100;
  return pop.toLocaleString("pt-BR");
}
function getDeltaShare(share: number) {
  const delta = share - 22;
  if (delta >= 5)  return { label: `+${delta.toFixed(1)} p.p.`, color: "#15803D" };
  if (delta >= 0)  return { label: `+${delta.toFixed(1)} p.p.`, color: "#B45309" };
  return { label: `${delta.toFixed(1)} p.p.`, color: "#DC2626" };
}
function satLabel(v: number) { return v >= 75 ? "Excelente" : v >= 60 ? "Regular" : "Crítico"; }
function satColor(v: number) { return v >= 75 ? "#15803D" : v >= 60 ? "#B45309" : "#DC2626"; }
type RowStatus = "critico" | "atencao" | "empate" | "saudavel" | "saturado" | "neutro";
function statusStyle(s: RowStatus) {
  switch (s) {
    case "critico":  return { valueColor: "#DC2626", diagColor: "#DC2626", tagColor: "#DC2626", tagBg: "rgba(220,38,38,0.08)" };
    case "atencao":  return { valueColor: "#B45309", diagColor: "#B45309", tagColor: "#B45309", tagBg: "rgba(180,83,9,0.08)" };
    case "empate":   return { valueColor: "#B45309", diagColor: "#B45309", tagColor: "#B45309", tagBg: "rgba(180,83,9,0.08)" };
    case "saudavel": return { valueColor: "#15803D", diagColor: "#15803D", tagColor: "#15803D", tagBg: "rgba(21,128,61,0.08)" };
    case "saturado": return { valueColor: "#DC2626", diagColor: "#DC2626", tagColor: "#DC2626", tagBg: "rgba(220,38,38,0.08)" };
    default:         return { valueColor: "#1C1C1E", diagColor: "#8E8E93", tagColor: "#6E6E73", tagBg: "rgba(110,110,115,0.08)" };
  }
}
function calcChurn(g: GeohashEntry): { churn: number; color: string } {
  const q = g.quadrant;
  const score = g.diagnostico.scoreOokla;
  const chamados = g.diagnostico.taxaChamados;
  const seed = g.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudoRand = (min: number, max: number, offset = 0) => {
    const x = Math.sin(seed + offset) * 10000;
    const r = x - Math.floor(x);
    return +(min + r * (max - min)).toFixed(1);
  };
  let base = q === "RETENCAO" ? pseudoRand(8.0, 14.0, 0)
    : q === "GROWTH_RETENCAO" ? pseudoRand(5.0, 9.0, 1)
    : q === "UPSELL" ? pseudoRand(3.0, 7.0, 2)
    : pseudoRand(1.5, 5.0, 3);
  if (chamados > 4) base += pseudoRand(1.0, 2.5, 4);
  else if (chamados > 3) base += pseudoRand(0.5, 1.5, 5);
  if (score < 6) base += pseudoRand(0.5, 2.0, 6);
  else if (score > 8) base -= pseudoRand(0.3, 1.0, 7);
  const churn = Math.max(0.5, Math.min(18.0, +base.toFixed(1)));
  const color = churn >= 10 ? "#DC2626" : churn >= 6 ? "#B45309" : "#15803D";
  return { churn, color };
}
function getCoberturaLabel(score: number, hasTech: boolean) {
  if (!hasTech) return { label: "Baixa", color: "#DC2626", bg: "rgba(220,38,38,0.08)" };
  if (score >= 70) return { label: "Alta", color: "#15803D", bg: "rgba(21,128,61,0.08)" };
  if (score >= 40) return { label: "Média", color: "#B45309", bg: "rgba(180,83,9,0.08)" };
  return { label: "Baixa", color: "#DC2626", bg: "rgba(220,38,38,0.08)" };
}

// ─── Computed para FichaTecnica ───────────────────────────────────────────────
const g = computed(() => props.geohash);
const hasFibra = computed(() => g.value?.technology === "FIBRA" || g.value?.technology === "AMBOS");
const hasMovel = computed(() => g.value?.technology === "MOVEL" || g.value?.technology === "AMBOS");

const qCfg = computed(() => g.value ? QUADRANT_CONFIG[g.value.quadrant] : null);
const tCfg = computed(() => g.value ? TECH_CONFIG[g.value.technology] : null);
const pCfg = computed(() => g.value ? PRIORITY_CONFIG[g.value.priority] : null);
const classeSocial = computed(() => g.value ? getClasseSocial(g.value.demographics.avgIncome) : null);
const populacao = computed(() => g.value ? estimatePopulation(g.value.demographics.populationDensity) : "");
const growthTagColors: Record<string, { color: string; bg: string }> = {
  "Alto":     { color: "#15803D", bg: "rgba(21,128,61,0.1)" },
  "Moderado": { color: "#B45309", bg: "rgba(180,83,9,0.1)" },
  "Baixo":    { color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  "Estável":  { color: "#6E6E73", bg: "rgba(110,110,115,0.1)" },
};
const growthTag = computed(() => g.value ? (growthTagColors[g.value.demographics.growthLabel] || { color: "#6E6E73", bg: "rgba(110,110,115,0.1)" }) : null);

// Share Vivo
const shareMovel = computed(() => {
  if (!g.value) return 0;
  const raw = g.value.shareTrend.shareMovel;
  const pct = g.value.marketShare.percentage;
  return raw > 0 ? raw : (g.value.technology === "FIBRA" ? Math.round(pct * 0.75) : Math.round(pct * 0.9));
});
const shareFibra = computed(() => {
  if (!g.value) return 0;
  const raw = g.value.shareTrend.shareFibra;
  const pct = g.value.marketShare.percentage;
  return raw > 0 ? raw : (g.value.technology === "MOVEL" ? Math.round(pct * 0.65) : Math.round(pct * 0.9));
});
const deltaMovel = computed(() => getDeltaShare(shareMovel.value));
const deltaFibra = computed(() => getDeltaShare(shareFibra.value));

// Satisfação Vivo
const scoreMovelSat = computed(() => {
  if (!g.value) return 0;
  const base = g.value.diagnostico.scoreOokla > 0 ? g.value.diagnostico.scoreOokla : 7.0;
  const raw = g.value.diagnostico.scoreOoklaMovel > 0
    ? g.value.diagnostico.scoreOoklaMovel
    : (g.value.technology === "FIBRA" ? base * 0.92 : base);
  return Math.min(Math.round(raw * 10), 100);
});
const scoreFibraSat = computed(() => {
  if (!g.value) return 0;
  const base = g.value.diagnostico.scoreOokla > 0 ? g.value.diagnostico.scoreOokla : 7.0;
  const raw = g.value.diagnostico.scoreOoklaFibra > 0
    ? g.value.diagnostico.scoreOoklaFibra
    : (g.value.technology === "MOVEL" ? base * 0.92 : base);
  return Math.min(Math.round(raw * 10), 100);
});

// Churn
const churnData = computed(() => g.value ? calcChurn(g.value) : { churn: 0, color: "#15803D" });

// Top 5 operadoras: VIVO sempre presente + top 4 concorrentes por score
const top5Scores = computed(() => {
  if (!g.value?.satisfactionScores) return [];
  return [...g.value.satisfactionScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
});
// Satisfação por tecnologia (Fibra / Móvel)
const top5Fibra = computed(() => {
  if (!g.value?.satisfactionFibra || g.value.satisfactionFibra.length === 0) return [];
  const sorted = [...g.value.satisfactionFibra].sort((a, b) => b.score - a.score);
  const vivoIdx = sorted.findIndex(s => s.name === 'VIVO');
  if (vivoIdx >= 5) {
    const vivo = sorted.splice(vivoIdx, 1)[0];
    sorted.splice(4, 0, vivo);
  }
  return sorted.slice(0, 5);
});
const top5Movel = computed(() => {
  if (!g.value?.satisfactionMovel || g.value.satisfactionMovel.length === 0) return [];
  const sorted = [...g.value.satisfactionMovel].sort((a, b) => b.score - a.score);
  const vivoIdx = sorted.findIndex(s => s.name === 'VIVO');
  if (vivoIdx >= 5) {
    const vivo = sorted.splice(vivoIdx, 1)[0];
    sorted.splice(4, 0, vivo);
  }
  return sorted.slice(0, 5);
});

// Infraestrutura
const fibraClassLabelMap: Record<string, string> = {
  SAUDAVEL: "Saudável", MELHORA_QUALIDADE: "Melhora da Qualidade",
  AUMENTO_CAPACIDADE: "Aumento da Capacidade", EXPANSAO_NOVA_AREA: "Expansão Nova Área",
};
const movelClassLabelMap: Record<string, string> = {
  SAUDAVEL: "Saudável", MELHORA_QUALIDADE: "Melhora da Qualidade",
  EXPANSAO_COBERTURA: "Expansão Nova Área",
};
const fibraClassLabel = computed(() => {
  if (!g.value) return "";
  return fibraClassLabelMap[g.value.camada2.fibra.classification] ?? g.value.camada2.fibra.classification.replace(/_/g, " ");
});
const movelClassLabel = computed(() => {
  if (!g.value) return "";
  return movelClassLabelMap[g.value.camada2.movel.classification] ?? g.value.camada2.movel.classification.replace(/_/g, " ");
});
const fibraClassColor = computed(() => {
  if (!g.value) return { color: "#8E8E93", bg: "rgba(110,110,115,0.1)" };
  const c = g.value.camada2.fibra.classification;
  if (c === "SAUDAVEL") return { color: "#15803D", bg: "rgba(21,128,61,0.1)" };
  if (c === "AUMENTO_CAPACIDADE") return { color: "#B45309", bg: "rgba(180,83,9,0.1)" };
  if (c === "EXPANSAO_NOVA_AREA") return { color: "#1D4ED8", bg: "rgba(29,78,216,0.1)" };
  return { color: "#DC2626", bg: "rgba(220,38,38,0.1)" };
});
const movelClassColor = computed(() => {
  if (!g.value) return { color: "#8E8E93", bg: "rgba(110,110,115,0.1)" };
  const c = g.value.camada2.movel.classification;
  if (c === "SAUDAVEL") return { color: "#15803D", bg: "rgba(21,128,61,0.1)" };
  if (c === "MELHORA_QUALIDADE") return { color: "#DC2626", bg: "rgba(220,38,38,0.1)" };
  if (c === "EXPANSAO_COBERTURA") return { color: "#1D4ED8", bg: "rgba(29,78,216,0.1)" };
  return { color: "#B45309", bg: "rgba(180,83,9,0.1)" };
});
const fibraCobertura = computed(() => g.value ? getCoberturaLabel(g.value.camada2.fibra.score, hasFibra.value) : { label: "Baixa", color: "#DC2626", bg: "rgba(220,38,38,0.08)" });
const movelCobertura = computed(() => g.value ? getCoberturaLabel(g.value.camada2.movel.score, hasMovel.value) : { label: "Baixa", color: "#DC2626", bg: "rgba(220,38,38,0.08)" });

// ─── OverviewTecnico computed ─────────────────────────────────────────────────
const scoreMovel100 = computed(() => g.value ? g.value.diagnostico.scoreOoklaMovel * 10 : 0);
const scoreFibra100 = computed(() => g.value ? g.value.diagnostico.scoreOoklaFibra * 10 : 0);
const scoreLiderFibra100 = computed(() => g.value ? g.value.diagnostico.scoreLiderFibra * 10 : 0);
const scoreLiderMovel100 = computed(() => g.value ? g.value.diagnostico.scoreLiderMovel * 10 : 0);
const speedtestMovelStatus = computed<RowStatus>(() => scoreMovel100.value < 60 ? "critico" : scoreMovel100.value < 75 ? "atencao" : "saudavel");
const speedtestFibraStatus = computed<RowStatus>(() => scoreFibra100.value < 60 ? "critico" : scoreFibra100.value < 75 ? "atencao" : "saudavel");
const chamadosStatus = computed<RowStatus>(() => {
  if (!g.value) return "neutro";
  return g.value.diagnostico.taxaChamados >= 4 ? "critico" : g.value.diagnostico.taxaChamados >= 2.5 ? "atencao" : "saudavel";
});
const shareStatus = computed<RowStatus>(() => {
  if (!g.value) return "neutro";
  const s = g.value.diagnostico.sharePenetracao;
  return s > 40 ? "saturado" : s > 30 ? "atencao" : "saudavel";
});
const fibraAdv = computed(() => g.value ? g.value.diagnostico.deltaVsLiderFibra : 0);
const fibraAdvStatus = computed<RowStatus>(() => Math.abs(fibraAdv.value) < 0.3 ? "empate" : fibraAdv.value > 0 ? "saudavel" : "critico");
const fibraAdvLabel = computed(() => Math.abs(fibraAdv.value) < 0.3 ? "Empate" : fibraAdv.value > 0 ? `+${(fibraAdv.value * 10).toFixed(0)} pts` : `${(fibraAdv.value * 10).toFixed(0)} pts`);
const fibraAdvDiag = computed(() => {
  const adv = fibraAdv.value;
  if (Math.abs(adv) < 0.3) return `Vivo ${scoreFibra100.value.toFixed(0)} = Líder ${scoreLiderFibra100.value.toFixed(0)} — Empate técnico`;
  if (adv > 0) return `Vivo ${scoreFibra100.value.toFixed(0)} > Líder ${scoreLiderFibra100.value.toFixed(0)} — Vantagem consolidada`;
  return `Vivo ${scoreFibra100.value.toFixed(0)} < Líder ${scoreLiderFibra100.value.toFixed(0)} — Desvantagem de ${Math.abs(adv * 10).toFixed(0)} pts`;
});
const movelAdv = computed(() => g.value ? g.value.diagnostico.deltaVsLiderMovel : 0);
const movelAdvStatus = computed<RowStatus>(() => Math.abs(movelAdv.value) < 0.3 ? "empate" : movelAdv.value > 0 ? "saudavel" : "critico");
const movelAdvLabel = computed(() => Math.abs(movelAdv.value) < 0.3 ? "Empate" : movelAdv.value > 0 ? `+${(movelAdv.value * 10).toFixed(0)} pts` : `${(movelAdv.value * 10).toFixed(0)} pts`);
const movelAdvDiag = computed(() => {
  const adv = movelAdv.value;
  if (Math.abs(adv) < 0.3) return `Vivo ${scoreMovel100.value.toFixed(0)} = Líder ${scoreLiderMovel100.value.toFixed(0)} — Empate técnico`;
  if (adv > 0) return `Vivo ${scoreMovel100.value.toFixed(0)} > Líder ${scoreLiderMovel100.value.toFixed(0)} — Vantagem consolidada`;
  return `Vivo ${scoreMovel100.value.toFixed(0)} < Líder ${scoreLiderMovel100.value.toFixed(0)} — Desvantagem de ${Math.abs(adv * 10).toFixed(0)} pts`;
});
const fibraClassMap: Record<string, { label: string; status: RowStatus; diag: string }> = {
  SAUDAVEL:           { label: "Saudável",               status: "saudavel", diag: "Growth Liberado" },
  MELHORA_QUALIDADE:  { label: "Melhora da Qualidade",   status: "critico",  diag: "Ação Necessária" },
  AUMENTO_CAPACIDADE: { label: "Aumento da Capacidade",  status: "atencao",  diag: "Monitorar" },
  EXPANSAO_NOVA_AREA: { label: "Expansão Nova Área",     status: "atencao",  diag: "Planejar" },
};
const movelClassMap: Record<string, { label: string; status: RowStatus; diag: string }> = {
  SAUDAVEL:           { label: "Saudável",               status: "saudavel", diag: "Growth Liberado" },
  MELHORA_QUALIDADE:  { label: "Melhora da Qualidade",   status: "critico",  diag: "Ação Necessária" },
  EXPANSAO_COBERTURA: { label: "Expansão Nova Área",     status: "atencao",  diag: "Planejar" },
};
const fibraClassRow = computed(() => g.value ? (fibraClassMap[g.value.camada2.fibra.classification] ?? { label: g.value.camada2.fibra.classification, status: "neutro" as RowStatus, diag: "" }) : null);
const movelClassRow = computed(() => g.value ? (movelClassMap[g.value.camada2.movel.classification] ?? { label: g.value.camada2.movel.classification, status: "neutro" as RowStatus, diag: "" }) : null);
const arpuRel = computed(() => g.value ? g.value.diagnostico.arpuRelativo : 1);
const arpuStatus = computed<RowStatus>(() => arpuRel.value >= 1.4 ? "saudavel" : arpuRel.value >= 0.9 ? "atencao" : "critico");
const arpuDiag = computed(() => {
  const r = arpuRel.value;
  if (r >= 1.4) return `${r.toFixed(2)}x acima da média — Perfil premium`;
  if (r >= 0.9) return `${r.toFixed(2)}x próximo da média — Mix de ofertas`;
  return `${r.toFixed(2)}x abaixo da média — Sensibilidade elevada`;
});
const canalStatus = computed<RowStatus>(() => g.value && g.value.diagnostico.canalPct >= 60 ? "saudavel" : "neutro");
const canalDiag = computed(() => {
  if (!g.value) return "";
  const { canalPct } = g.value.diagnostico;
  return canalPct >= 60 ? `> 50% — Canal Dominante (${canalPct}% verba)` : `< 50% — Mix de Canais`;
});

// Highlights para Decisão Integrada
const highlights = computed(() => {
  if (!g.value) return [];
  const d = g.value.diagnostico;
  const result: { type: "positive" | "negative" | "neutral"; text: string }[] = [];
  if (d.scoreOokla >= 7.5) result.push({ type: "positive", text: `Percepção de qualidade positiva (Ookla ${d.scoreOokla.toFixed(1)})` });
  else if (d.scoreOokla < 6.5) result.push({ type: "negative", text: `Percepção de qualidade crítica (Ookla ${d.scoreOokla.toFixed(1)})` });
  if (d.taxaChamados >= 4.0) result.push({ type: "negative", text: `Alto volume de chamados (${d.taxaChamados.toFixed(1)}%) — base insatisfeita` });
  else if (d.taxaChamados < 2.5) result.push({ type: "positive", text: `Baixo volume de chamados (${d.taxaChamados.toFixed(1)}%) — base satisfeita` });
  if (d.sharePenetracao >= 35) result.push({ type: "neutral", text: `Mercado saturado (share ${d.sharePenetracao}%)` });
  else result.push({ type: "positive", text: `Mercado com oportunidade (share ${d.sharePenetracao}%)` });
  if (d.deltaVsLider >= 0) result.push({ type: "positive", text: `Vivo com vantagem técnica vs líder` });
  else result.push({ type: "negative", text: `Vivo abaixo do líder em ${Math.abs(d.deltaVsLider).toFixed(1)} pts` });
  return result;
});
const hlColor = { positive: "#15803D", negative: "#DC2626", neutral: "#B45309" };
const hlBg = { positive: "rgba(21,128,61,0.05)", negative: "rgba(220,38,38,0.05)", neutral: "rgba(180,83,9,0.05)" };
const hlBorder = { positive: "rgba(21,128,61,0.15)", negative: "rgba(220,38,38,0.15)", neutral: "rgba(180,83,9,0.15)" };

// ─── Recomendação IA ──────────────────────────────────────────────────────────
const iaCache = reactive<Record<string, boolean>>({});
const iaLoading = ref(false);
const iaGerada = computed(() => g.value ? !!iaCache[g.value.id] : false);
const ia = computed(() => g.value ? calcIARecomendacao(g.value) : null);
const scoreMovelIA = computed(() => g.value ? Math.round(g.value.priorityScore * 10 * 0.5) : 0);
const scoreFibraIA = computed(() => g.value ? Math.round(g.value.priorityScore * 10 * 0.5) : 0);
const scoreTotalIA = computed(() => g.value ? Math.round(g.value.priorityScore * 10) : 0);

function handleGerarIA() {
  if (!g.value) return;
  iaLoading.value = true;
  setTimeout(() => {
    if (g.value) iaCache[g.value.id] = true;
    iaLoading.value = false;
  }, 1000);
}

// Tooltip state para AnaliseCards
const tooltipVisible = ref<string | null>(null);
</script>

<template>
  <div
    class="geohash-sidebar-nuxt"
    style="
      width: clamp(500px, 38vw, 680px); min-width: 480px; max-width: 680px;
      background: #F2F2F7; border-left: 1px solid rgba(0,0,0,0.08);
      display: flex; flex-direction: column; height: 100%; overflow: hidden;
    "
  >
    <template v-if="g">
      <!-- Header com sub-abas -->
      <div
        style="
          background: #ffffff; border-bottom: 1px solid rgba(0,0,0,0.08);
          padding: 0 16px; flex-shrink: 0; height: 40px;
          display: flex; align-items: center; justify-content: flex-start;
        "
      >
        <button
          v-for="tab in [
            { key: 'ficha', label: 'Ficha Técnica' },
            { key: 'overview', label: 'Overview IA' },
          ]"
          :key="tab.key"
          :style="{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '0 12px', height: '40px',
            fontSize: '11px', fontWeight: activeSubTab === tab.key ? 700 : 500,
            color: activeSubTab === tab.key ? '#660099' : '#8E8E93',
            borderBottom: activeSubTab === tab.key ? '2px solid #660099' : '2px solid transparent',
            letterSpacing: '0.01em', transition: 'all 0.15s ease',
            whiteSpace: 'nowrap', fontFamily: 'inherit',
          }"
          @click="activeSubTab = (tab.key as 'ficha' | 'overview')"
        >{{ tab.label }}</button>
      </div>

      <!-- Conteúdo rolável -->
      <div style="flex: 1; overflow-y: hidden; overflow-x: hidden; display: flex; flex-direction: column;">

        <!-- ═══════════════════════════════════════════════════════════════════
             FICHA TÉCNICA
             ═══════════════════════════════════════════════════════════════════ -->
        <div v-if="activeSubTab === 'ficha'" style="padding: 4px 10px 4px 10px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-height: 0; overflow: hidden;">

          <!-- 1. IDENTIFICAÇÃO -->
          <div>
            <div style="margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; flex-wrap: wrap; margin-top: -2px; padding-top: 3px; padding-bottom: 3px;">
                <!-- Tag quadrante -->
                <span
                  v-if="qCfg"
                  :style="{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 8px', borderRadius: '20px',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
                    color: qCfg.color, background: qCfg.bg, border: `1px solid ${qCfg.color}44`,
                    whiteSpace: 'nowrap',
                  }"
                >{{ qCfg.label }}</span>
                <!-- Tag tecnologia -->
                <span
                  v-if="tCfg"
                  :style="{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 8px', borderRadius: '20px',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
                    color: tCfg.color, background: tCfg.bg, border: `1px solid ${tCfg.color}44`,
                    whiteSpace: 'nowrap',
                  }"
                >{{ tCfg.label }}</span>
                <!-- Tag prioridade -->
                <span
                  v-if="pCfg"
                  :style="{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 8px', borderRadius: '20px',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
                    color: pCfg.color, background: pCfg.bg, border: `1px solid ${pCfg.color}44`,
                    whiteSpace: 'nowrap',
                  }"
                >{{ pCfg.label }}</span>
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; padding-bottom: 3px;">
                <span style="font-size: 12px; font-weight: 700; color: #1C1C1E;">{{ g.neighborhood }}</span>
                <span style="font-size: 11px; color: #8E8E93; font-family: monospace;">({{ g.id }}, {{ g.city }})</span>
              </div>
            </div>

            <!-- Cards Share / Satisfação / Churn -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 0.85fr; gap: 5px; margin-top: 4px;">
              <!-- Share Vivo -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 7px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); min-height: 76px;">
                <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; margin-bottom: 3px; white-space: nowrap;">Share Vivo</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                  <div
                    :style="{
                      borderRight: '1px solid rgba(0,0,0,0.07)', paddingRight: '4px',
                      opacity: activeTech === 'MOVEL' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Fibra</div>
                    <span style="font-size: 12px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ shareFibra }}%</span>
                    <div :style="{ fontSize: '7px', fontWeight: 700, color: deltaFibra.color, whiteSpace: 'nowrap', paddingTop: '5px' }">{{ deltaFibra.label }}</div>
                  </div>
                  <div
                    :style="{
                      paddingLeft: '2px',
                      opacity: activeTech === 'FIBRA' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Móvel</div>
                    <span style="font-size: 12px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ shareMovel }}%</span>
                    <div :style="{ fontSize: '7px', fontWeight: 700, color: deltaMovel.color, whiteSpace: 'nowrap', paddingTop: '5px' }">{{ deltaMovel.label }}</div>
                  </div>
                </div>
              </div>

              <!-- Satisfação Vivo -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 7px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); min-height: 76px;">
                <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; margin-bottom: 3px; white-space: nowrap;">Satisfação Vivo</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                  <div
                    :style="{
                      borderRight: '1px solid rgba(0,0,0,0.07)', paddingRight: '4px',
                      opacity: activeTech === 'MOVEL' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Fibra</div>
                    <span style="font-size: 12px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ scoreFibraSat }}</span>
                    <div :style="{ fontSize: '7px', fontWeight: 700, color: satColor(scoreFibraSat), whiteSpace: 'nowrap', paddingTop: '5px' }">{{ satLabel(scoreFibraSat) }}</div>
                  </div>
                  <div
                    :style="{
                      paddingLeft: '2px',
                      opacity: activeTech === 'FIBRA' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Móvel</div>
                    <span style="font-size: 12px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ scoreMovelSat }}</span>
                    <div :style="{ fontSize: '7px', fontWeight: 700, color: satColor(scoreMovelSat), whiteSpace: 'nowrap', paddingTop: '5px' }">{{ satLabel(scoreMovelSat) }}</div>
                  </div>
                </div>
              </div>

              <!-- Churn Acumulado -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); min-height: 76px;">
                <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; margin-bottom: 1px; white-space: nowrap;">Churn Acumulado</div>
                <div style="font-size: 10px; color: #8E8E93; margin-bottom: 3px; font-weight: 500;">últimos 3 meses</div>
                <div :style="{ fontSize: '20px', fontWeight: 800, color: churnData.color, lineHeight: 1, paddingTop: '4px' }">{{ churnData.churn }}%</div>
              </div>
            </div>
          </div>

          <!-- 2. COMERCIAL -->
          <div style="margin-bottom: -5px; padding-top: 1px;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px; padding-top: 2px;">Comercial</div>

            <!-- Perfil da Área — 4 colunas -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 5px; min-height: 84px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; padding-top: 2px;">Perfil da Área</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0;">
                <!-- Renda -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; border-right: 1px solid rgba(0,0,0,0.07); padding-bottom: 5px; margin-top: -3px;">
                  <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">Renda</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E; margin-bottom: -3px;">R${{ (g.demographics.avgIncome/1000).toFixed(0) }}k</div>
                  <span
                    v-if="classeSocial"
                    :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: classeSocial.color, background: classeSocial.bg, height: '14px', flexShrink: 0, marginTop: '3px' }"
                  >{{ classeSocial.label }}</span>
                </div>
                <!-- Densidade -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; border-right: 1px solid rgba(0,0,0,0.07); padding-bottom: 2px; margin-top: -3px;">
                  <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">Densidade</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E;">{{ (g.demographics.populationDensity/1000).toFixed(1) }}k</div>
                  <div style="font-size: 8px; color: #8E8E93; margin-top: -2px;">hab/km²</div>
                </div>
                <!-- População -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; border-right: 1px solid rgba(0,0,0,0.07); padding-bottom: 2px; margin-top: -3px;">
                  <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">População</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E;">~{{ populacao }}</div>
                  <div style="font-size: 8px; color: #8E8E93; margin-top: -2px;">residentes</div>
                </div>
                <!-- Crescimento -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; padding-bottom: 5px; margin-top: -3px;">
                  <div style="font-size: 8px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">Crescimento</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E; margin-bottom: -3px;">+{{ g.demographics.populationGrowth }}%</div>
                  <span
                    v-if="growthTag"
                    :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: growthTag.color, background: growthTag.bg, height: '14px', flexShrink: 0, marginTop: '3px' }"
                  >{{ g.demographics.growthLabel }}</span>
                </div>
              </div>
            </div>

            <!-- Satisfação — dividido Fibra | Móvel (full width) -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 5px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Satisfação</span>
              </div>
              <div style="display: flex; gap: 0; align-items: flex-start;">
                <!-- Fibra -->
                <div v-if="top5Fibra.length > 0" :style="{ flex: 1, paddingRight: top5Movel.length > 0 ? '10px' : '0' }">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Fibra</div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div v-for="s in top5Fibra" :key="s.name" style="display: flex; align-items: center; gap: 5px;">
                      <span style="font-size: 8.5px; font-weight: 600; color: #1C1C1E; width: 36px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ s.name }}</span>
                      <div style="flex: 1; height: 4px; background: #F2F2F7; border-radius: 3px; overflow: hidden;">
                        <div :style="{ height: '100%', width: `${s.score * 10}%`, background: brandColor(s.name.toUpperCase(), s.score), borderRadius: '3px', transition: 'width 0.4s ease' }" />
                      </div>
                      <span :style="{ fontSize: '9px', fontWeight: 700, color: brandColor(s.name.toUpperCase(), s.score), width: '28px', textAlign: 'right', flexShrink: 0 }">{{ s.score.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
                <!-- Divider -->
                <div v-if="top5Fibra.length > 0 && top5Movel.length > 0" style="width: 1px; background: #E5E5EA; align-self: stretch; flex-shrink: 0;" />
                <!-- Móvel -->
                <div v-if="top5Movel.length > 0" :style="{ flex: 1, paddingLeft: top5Fibra.length > 0 ? '10px' : '0' }">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Móvel</div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div v-for="s in top5Movel" :key="s.name" style="display: flex; align-items: center; gap: 5px;">
                      <span style="font-size: 8.5px; font-weight: 600; color: #1C1C1E; width: 36px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ s.name }}</span>
                      <div style="flex: 1; height: 4px; background: #F2F2F7; border-radius: 3px; overflow: hidden;">
                        <div :style="{ height: '100%', width: `${s.score * 10}%`, background: brandColor(s.name.toUpperCase(), s.score), borderRadius: '3px', transition: 'width 0.4s ease' }" />
                      </div>
                      <span :style="{ fontSize: '9px', fontWeight: 700, color: brandColor(s.name.toUpperCase(), s.score), width: '28px', textAlign: 'right', flexShrink: 0 }">{{ s.score.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
                <!-- Fallback: sem split -->
                <div v-if="top5Fibra.length === 0 && top5Movel.length === 0" style="flex: 1;">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div v-for="s in top5Scores" :key="s.name" style="display: flex; align-items: center; gap: 5px;">
                      <span style="font-size: 8.5px; font-weight: 600; color: #1C1C1E; width: 36px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ s.name }}</span>
                      <div style="flex: 1; height: 4px; background: #F2F2F7; border-radius: 3px; overflow: hidden;">
                        <div :style="{ height: '100%', width: `${s.score * 10}%`, background: brandColor(s.name.toUpperCase(), s.score), borderRadius: '3px', transition: 'width 0.4s ease' }" />
                      </div>
                      <span :style="{ fontSize: '9px', fontWeight: 700, color: brandColor(s.name.toUpperCase(), s.score), width: '28px', textAlign: 'right', flexShrink: 0 }">{{ s.score.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- SpeedTest — dividido Fibra | Móvel (full width) -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 5px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">SpeedTest</span>
              </div>
              <div style="display: flex; gap: 0; align-items: flex-start;">
                <!-- Fibra -->
                <div v-if="g.technology === 'FIBRA' || g.technology === 'AMBOS'" :style="{ flex: 1, paddingRight: (g.technology === 'AMBOS') ? '10px' : '0' }">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Fibra</div>
                  <div style="display: flex; flex-direction: column; gap: 3px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 9px; font-weight: 600; color: #8E8E93;">Download</span>
                      <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">{{ g.technology === 'AMBOS' ? Math.round(g.speedtest.downloadMbps * 1.3) : g.speedtest.downloadMbps }} Mbps</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 9px; font-weight: 600; color: #8E8E93;">Latência</span>
                      <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">{{ g.technology === 'AMBOS' ? Math.round(g.speedtest.latencyMs * 0.6) : g.speedtest.latencyMs }} ms</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 9px; font-weight: 600; color: #8E8E93;">Qualidade</span>
                      <span :style="{ fontSize: '9px', fontWeight: 700, color: g.speedtest.qualityLabel === 'Ótimo' ? '#15803D' : g.speedtest.qualityLabel === 'Bom' ? '#039900' : '#DC2626' }">{{ g.speedtest.qualityLabel }}</span>
                    </div>
                  </div>
                </div>
                <!-- Divider -->
                <div v-if="g.technology === 'AMBOS'" style="width: 1px; background: #E5E5EA; align-self: stretch; flex-shrink: 0;" />
                <!-- Móvel -->
                <div v-if="g.technology === 'MOVEL' || g.technology === 'AMBOS'" :style="{ flex: 1, paddingLeft: (g.technology === 'AMBOS') ? '10px' : '0' }">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Móvel</div>
                  <div style="display: flex; flex-direction: column; gap: 3px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 9px; font-weight: 600; color: #8E8E93;">Download</span>
                      <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">{{ g.technology === 'AMBOS' ? Math.round(g.speedtest.downloadMbps * 0.7) : g.speedtest.downloadMbps }} Mbps</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 9px; font-weight: 600; color: #8E8E93;">Latência</span>
                      <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">{{ g.technology === 'AMBOS' ? Math.round(g.speedtest.latencyMs * 1.5) : g.speedtest.latencyMs }} ms</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 9px; font-weight: 600; color: #8E8E93;">Qualidade</span>
                      <span :style="{ fontSize: '9px', fontWeight: 700, color: g.speedtest.qualityLabel === 'Ótimo' ? '#15803D' : g.speedtest.qualityLabel === 'Bom' ? '#039900' : '#DC2626' }">{{ g.speedtest.qualityLabel }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CRM Vivo -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 5px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">CRM Vivo</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Fibra</div>
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 10px; color: #8E8E93;">ARPU</span>
                      <span style="font-size: 11px; font-weight: 700; color: #1C1C1E;">R$ {{ g.crm.arpuFibra > 0 ? g.crm.arpuFibra : g.crm.arpu }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 10px; color: #8E8E93;">Plano</span>
                      <span style="font-size: 11px; font-weight: 600; color: #1C1C1E;">{{ g.crm.planType || '—' }}</span>
                    </div>
                  </div>
                </div>
                <div style="width: 1px; background: rgba(0,0,0,0.07); align-self: stretch; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Móvel</div>
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 10px; color: #8E8E93;">ARPU</span>
                      <span style="font-size: 11px; font-weight: 700; color: #1C1C1E;">R$ {{ g.crm.arpuMovel > 0 ? g.crm.arpuMovel : g.crm.arpu }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 10px; color: #8E8E93;">Plano</span>
                      <span style="font-size: 11px; font-weight: 600; color: #1C1C1E;">{{ g.crm.planoMovel || g.crm.planType || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. INFRAESTRUTURA -->
          <div style="margin-bottom: -5px; padding-top: 1px;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px; padding-top: 2px;">Infraestrutura</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 3px;">
              <!-- Card Fibra -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 8px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                  </span>
                  <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Fibra</span>
                </div>
                <div style="padding-top: 3px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Qualidade</div>
                    <span
                      v-if="hasFibra"
                      :style="{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: fibraClassColor.color, background: fibraClassColor.bg, flexShrink: 0, marginTop: '3px', whiteSpace: 'nowrap' }"
                    >{{ fibraClassLabel }}</span>
                    <span v-else style="display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 600; color: #1D4ED8; background: rgba(29,78,216,0.1); flex-shrink: 0; margin-top: 3px; white-space: nowrap;">Expansão Nova Área</span>
                  </div>
                </div>
              </div>
              <!-- Card Móvel -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 8px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </span>
                  <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Móvel</span>
                </div>
                <div style="padding-top: 3px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 8.5px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Qualidade</div>
                    <span
                      v-if="hasMovel"
                      :style="{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: movelClassColor.color, background: movelClassColor.bg, flexShrink: 0, marginTop: '3px', whiteSpace: 'nowrap' }"
                    >{{ movelClassLabel }}</span>
                    <span v-else style="display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 600; color: #1D4ED8; background: rgba(29,78,216,0.1); flex-shrink: 0; margin-top: 3px; white-space: nowrap;">Expansão Nova Área</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════
             OVERVIEW IA (Análise Estratégica)
             ═══════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeSubTab === 'overview'" style="padding: 8px 10px; overflow: hidden; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px;">

          <!-- CARD 1: ANÁLISE IA -->
          <div style="background: #fff; border-radius: 10px; border: 1px solid rgba(0,0,0,0.07); padding: 10px 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
            <!-- Header do card -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </span>
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #1C1C1E;">Análise IA</span>
            </div>

            <!-- CARD EXECUTIVO 1: PÚBLICO & MERCADO -->
            <div style="background: #FAFAFA; border-radius: 7px; border: 1px solid rgba(0,0,0,0.07); padding: 9px 11px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #660099;">Público &amp; Mercado</span>
                <span :style="{ marginLeft: 'auto', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, color: g.demographics.avgIncome >= 8000 ? '#15803D' : g.demographics.avgIncome >= 4000 ? '#B45309' : '#DC2626', background: g.demographics.avgIncome >= 8000 ? 'rgba(21,128,61,0.08)' : g.demographics.avgIncome >= 4000 ? 'rgba(180,83,9,0.08)' : 'rgba(220,38,38,0.08)' }">
                  {{ g.demographics.avgIncome >= 8000 ? 'Alto Valor' : g.demographics.avgIncome >= 4000 ? 'Médio Valor' : 'Baixo Valor' }}
                </span>
              </div>
              <p style="font-size: 10.5px; color: #3A3A3C; line-height: 1.5; margin: 0;">
                Área de renda média <strong>R${{ (g.demographics.avgIncome/1000).toFixed(0) }}k</strong>, com aproximadamente <strong>~{{ populacao }} habitantes</strong> em {{ g.demographics.populationDensity > 8000 ? 'alta' : g.demographics.populationDensity > 4000 ? 'média' : 'baixa' }} densidade e crescimento populacional <strong>{{ g.demographics.growthLabel.toLowerCase() }}</strong>.<br>
                <template v-if="hasMovel">Share Móvel de <strong>{{ shareMovel }}%</strong>: {{ shareMovel > 40 ? 'mercado saturado, priorizar retenção e upsell.' : shareMovel > 25 ? 'penetração em zona de atenção, pressão competitiva crescente.' : 'baixa penetração, janela de expansão aberta.' }}</template><template v-if="hasFibra"><br>Share Fibra de <strong>{{ shareFibra }}%</strong>: {{ shareFibra > 40 ? 'posição consolidada, monitorar risco de churn.' : shareFibra > 25 ? 'disputa acirrada com concorrentes, manter pressão comercial.' : 'mercado pouco explorado, alto potencial de captação.' }}</template>
              </p>
            </div>

            <!-- CARD EXECUTIVO 2: SATISFAÇÃO & REDE -->
            <div style="background: #FAFAFA; border-radius: 7px; border: 1px solid rgba(0,0,0,0.07); padding: 9px 11px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #660099;">Satisfação &amp; Rede</span>
                <span :style="{ marginLeft: 'auto', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, color: statusStyle(chamadosStatus).tagColor, background: statusStyle(chamadosStatus).tagBg }">
                  {{ chamadosStatus === 'critico' ? 'Crítico' : chamadosStatus === 'atencao' ? 'Atenção' : 'Saudável' }}
                </span>
              </div>
              <p style="font-size: 10.5px; color: #3A3A3C; line-height: 1.5; margin: 0;">
                Score de satisfação Vivo Fibra <strong>{{ scoreFibraSat }}</strong> e Móvel <strong>{{ scoreMovelSat }}</strong>: {{ (scoreFibraSat >= 75 || scoreMovelSat >= 75) ? 'base satisfeita com baixo risco de churn espontâneo.' : (scoreFibraSat >= 60 || scoreMovelSat >= 60) ? 'nível regular, atenção a reclamações recorrentes.' : 'nível crítico, ação imediata para conter evasão.' }}<template v-if="g.speedtest"><br>Rede com <strong>{{ g.speedtest.downloadMbps }} Mbps</strong> de download e latência de <strong>{{ g.speedtest.latencyMs }}ms</strong>, qualidade geral <strong>{{ g.speedtest.qualityLabel }}</strong>{{ g.speedtest.qualityLabel === 'Ótimo' ? ': diferencial competitivo a explorar em vendas.' : g.speedtest.qualityLabel === 'Bom' ? ': adequada com espaço para otimização.' : ': abaixo do benchmark, com impacto direto na percepção do cliente.' }}</template>
              </p>
            </div>

            <!-- CARD EXECUTIVO 3: CONCORRÊNCIA -->
            <div style="background: #FAFAFA; border-radius: 7px; border: 1px solid rgba(0,0,0,0.07); padding: 9px 11px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #660099;">Concorrência</span>
                <span :style="{ marginLeft: 'auto', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, color: shareMovel > 40 || shareFibra > 40 ? '#DC2626' : shareMovel > 25 || shareFibra > 25 ? '#D97706' : '#15803D', background: shareMovel > 40 || shareFibra > 40 ? 'rgba(220,38,38,0.08)' : shareMovel > 25 || shareFibra > 25 ? 'rgba(217,119,6,0.08)' : 'rgba(21,128,61,0.08)' }">
                  {{ shareMovel > 40 || shareFibra > 40 ? 'Saturado' : shareMovel > 25 || shareFibra > 25 ? 'Atenção' : 'Oportunidade' }}
                </span>
              </div>
              <p style="font-size: 10.5px; color: #3A3A3C; line-height: 1.5; margin: 0;">
                <template v-if="g.diagnostico.concorrentes && g.diagnostico.concorrentes.length > 0">Principal ameaça Fibra: <strong :style="{ color: getOperatorColor(g.diagnostico.concorrentes.reduce((a, b) => (b.coberturaFibra && b.precoFibra > 0 && b.precoFibra < a.precoFibra ? b : a), { nome: '—', precoFibra: 9999, coberturaFibra: false }).nome) }">{{ g.diagnostico.concorrentes.reduce((a, b) => (b.coberturaFibra && b.precoFibra > 0 && b.precoFibra < a.precoFibra ? b : a), { nome: '—', precoFibra: 9999, coberturaFibra: false }).nome }}</strong>. Principal ameaça Móvel: <strong :style="{ color: getOperatorColor(g.diagnostico.concorrentes.reduce((a, b) => (b.coberturaMovel && b.precoMovel > 0 && b.precoMovel < a.precoMovel ? b : a), { nome: '—', precoMovel: 9999, coberturaMovel: false }).nome) }">{{ g.diagnostico.concorrentes.reduce((a, b) => (b.coberturaMovel && b.precoMovel > 0 && b.precoMovel < a.precoMovel ? b : a), { nome: '—', precoMovel: 9999, coberturaMovel: false }).nome }}</strong>.<br></template>
                <template v-if="hasFibra">Projeção Fibra (3 meses): <strong :style="{ color: deltaFibra.color }">{{ deltaFibra.label }}</strong> — {{ deltaFibra.label.startsWith('+') ? 'tendência de crescimento, manter pressão comercial.' : deltaFibra.label.startsWith('-') ? 'queda projetada, acionar defesa imediata.' : 'estável, monitorar movimentos da concorrência.' }}</template><template v-if="hasMovel"><br>Projeção Móvel (3 meses): <strong :style="{ color: deltaMovel.color }">{{ deltaMovel.label }}</strong> — {{ deltaMovel.label.startsWith('+') ? 'tendência positiva, capitalizar com upgrade de plano.' : deltaMovel.label.startsWith('-') ? 'queda projetada, acionar retenção proativa.' : 'estável, priorizar qualidade de atendimento.' }}</template>
              </p>
            </div>


            <!-- CARD EXECUTIVO 4: INFRAESTRUTURA -->
            <div style="background: #FAFAFA; border-radius: 7px; border: 1px solid rgba(0,0,0,0.07); padding: 9px 11px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #660099;">Infraestrutura</span>
                <span :style="{ marginLeft: 'auto', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, color: (fibraClassRow ? statusStyle(fibraClassRow.status).tagColor : movelClassRow ? statusStyle(movelClassRow.status).tagColor : '#8E8E93'), background: (fibraClassRow ? statusStyle(fibraClassRow.status).tagBg : movelClassRow ? statusStyle(movelClassRow.status).tagBg : 'rgba(110,110,115,0.08)') }">
                  {{ fibraClassRow ? fibraClassRow.label : movelClassRow ? movelClassRow.label : '—' }}
                </span>
              </div>
              <p style="font-size: 10.5px; color: #3A3A3C; line-height: 1.5; margin: 0;">
                <template v-if="hasFibra && fibraClassRow">Fibra em status <strong>{{ fibraClassRow.label }}</strong>: {{ fibraClassRow.status === 'saudavel' ? 'rede estável, sem intervenções críticas previstas.' : fibraClassRow.status === 'atencao' ? 'avaliar plano de melhoria de qualidade.' : 'situação crítica, priorizar expansão ou reforço de capacidade.' }}</template><template v-if="hasMovel && movelClassRow"><br>Móvel em status <strong>{{ movelClassRow.label }}</strong>: {{ movelClassRow.status === 'saudavel' ? 'cobertura adequada com foco em retenção.' : movelClassRow.status === 'atencao' ? 'sinal com margem de melhoria, monitorar reclamações.' : 'cobertura insuficiente ou degradada, expansão de rede prioritária.' }}</template>
              </p>
            </div>

            <!-- CARD EXECUTIVO 5: COMPORTAMENTO -->
            <div style="background: #FAFAFA; border-radius: 7px; border: 1px solid rgba(0,0,0,0.07); padding: 9px 11px; margin-bottom: 0;">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 5px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #660099;">Comportamento</span>
                <span :style="{ marginLeft: 'auto', display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 700, color: statusStyle(arpuStatus).tagColor, background: statusStyle(arpuStatus).tagBg }">
                  {{ arpuStatus === 'saudavel' ? 'Premium' : arpuStatus === 'atencao' ? 'Médio' : 'Sensível' }}
                </span>
              </div>
              <p style="font-size: 10.5px; color: #3A3A3C; line-height: 1.5; margin: 0;">
                Perfil de consumo <strong>{{ arpuStatus === 'saudavel' ? 'premium' : arpuStatus === 'atencao' ? 'intermediário' : 'sensível a preço' }}</strong>. {{ arpuDiag }}<br>
                Canal predominante: <strong>{{ g.diagnostico.canalDominante }}</strong> com <strong>{{ g.diagnostico.canalPct }}%</strong> das transações. {{ canalStatus === 'saudavel' ? 'Concentrar esforços e recursos neste ponto de contato.' : 'Mix de canais identificado; avaliar eficiência e custo de cada um para otimização.' }}
              </p>
            </div>
          </div>

        </div>

      </div><!-- fim scroll -->
    </template>

    <!-- Estado vazio -->
    <div v-else style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #8E8E93; padding: 32px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      <div style="font-size: 11px; text-align: center; line-height: 1.5;">Passe o cursor sobre um geohash no mapa para ver os dados</div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.geohash-sidebar-nuxt {
  font-size: clamp(8px, 0.72vw, 10.5px);
  overflow: hidden !important;
}
@media (min-width: 1920px) {
  .geohash-sidebar-nuxt {
    font-size: 9px;
    width: clamp(580px, 36vw, 720px) !important;
    min-width: 560px !important;
    max-width: 720px !important;
  }
}
@media (min-width: 1600px) and (max-width: 1919px) {
  .geohash-sidebar-nuxt {
    font-size: 8.5px;
    width: clamp(540px, 36vw, 660px) !important;
    min-width: 520px !important;
    max-width: 660px !important;
  }
}
@media (min-width: 1280px) and (max-width: 1599px) {
  .geohash-sidebar-nuxt {
    font-size: 8px;
    width: clamp(480px, 38vw, 580px) !important;
    min-width: 460px !important;
    max-width: 580px !important;
  }
}
@media (max-width: 1279px) {
  .geohash-sidebar-nuxt {
    font-size: 7px;
    width: clamp(440px, 42vw, 520px) !important;
    min-width: 420px !important;
    max-width: 520px !important;
  }
}
.geohash-sidebar-nuxt * { box-sizing: border-box; max-width: 100%; }
.geohash-sidebar-nuxt > div { position: relative; z-index: auto; overflow: hidden; }
</style>
