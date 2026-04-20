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
  "Vivo": "#660099", "TIM": "#0060AE", "Claro": "#E30613",
  "NET": "#E30613", "LinQ": "#F5A623", "Oi": "#F5A623",
};
function getOperatorColor(name: string): string {
  for (const [key, color] of Object.entries(OPERATOR_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#8E8E93";
}
const BRAND_COLORS: Record<string, string> = {
  "VIVO": "#79009e", "TIM": "#0060AE", "CLARO": "#d10505",
  "NET": "#d10505", "LINQ TELECOM": "#EAB308", "LINQ": "#EAB308", "OI": "#EAB308",
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
  if (!hasTech) return { label: "BAIXA", color: "#DC2626", bg: "rgba(220,38,38,0.08)" };
  if (score >= 70) return { label: "ALTA", color: "#15803D", bg: "rgba(21,128,61,0.08)" };
  if (score >= 40) return { label: "MÉDIA", color: "#B45309", bg: "rgba(180,83,9,0.08)" };
  return { label: "BAIXA", color: "#DC2626", bg: "rgba(220,38,38,0.08)" };
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

// Infraestrutura
const fibraClassLabelMap: Record<string, string> = {
  SAUDAVEL: "SAUDÁVEL", MELHORA_QUALIDADE: "MELHORA DA QUALIDADE",
  AUMENTO_CAPACIDADE: "AUMENTO DE CAPACIDADE", EXPANSAO_NOVA_AREA: "EXPANSÃO NOVA ÁREA",
};
const movelClassLabelMap: Record<string, string> = {
  SAUDAVEL: "SAUDÁVEL", MELHORA_QUALIDADE: "MELHORA NA QUALIDADE",
  EXPANSAO_COBERTURA: "EXPANSÃO DE COBERTURA",
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
const fibraCobertura = computed(() => g.value ? getCoberturaLabel(g.value.camada2.fibra.score, hasFibra.value) : { label: "BAIXA", color: "#DC2626", bg: "rgba(220,38,38,0.08)" });
const movelCobertura = computed(() => g.value ? getCoberturaLabel(g.value.camada2.movel.score, hasMovel.value) : { label: "BAIXA", color: "#DC2626", bg: "rgba(220,38,38,0.08)" });

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
  SAUDAVEL:           { label: "SAUDÁVEL",               status: "saudavel", diag: "Growth Liberado" },
  MELHORA_QUALIDADE:  { label: "MELHORA DA QUALIDADE",   status: "critico",  diag: "Ação Necessária" },
  AUMENTO_CAPACIDADE: { label: "AUMENTO DE CAPACIDADE",  status: "atencao",  diag: "Planejar Expansão" },
  EXPANSAO_NOVA_AREA: { label: "EXPANSÃO NOVA ÁREA",     status: "atencao",  diag: "Planejar Expansão" },
};
const movelClassMap: Record<string, { label: string; status: RowStatus; diag: string }> = {
  SAUDAVEL:           { label: "SAUDÁVEL",               status: "saudavel", diag: "Growth Liberado" },
  MELHORA_QUALIDADE:  { label: "MELHORA NA QUALIDADE",   status: "critico",  diag: "Ação Necessária" },
  EXPANSAO_COBERTURA: { label: "EXPANSÃO DE COBERTURA",  status: "atencao",  diag: "Planejar Expansão" },
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
    style="
      width: 510px; min-width: 490px; max-width: 530px;
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
            fontSize: '12px', fontWeight: activeSubTab === tab.key ? 700 : 500,
            color: activeSubTab === tab.key ? '#660099' : '#8E8E93',
            borderBottom: activeSubTab === tab.key ? '2px solid #660099' : '2px solid transparent',
            letterSpacing: '0.01em', transition: 'all 0.15s ease',
            whiteSpace: 'nowrap', fontFamily: 'inherit',
          }"
          @click="activeSubTab = (tab.key as 'ficha' | 'overview')"
        >{{ tab.label }}</button>
      </div>

      <!-- Conteúdo rolável -->
      <div style="flex: 1; overflow-y: auto;">

        <!-- ═══════════════════════════════════════════════════════════════════
             FICHA TÉCNICA
             ═══════════════════════════════════════════════════════════════════ -->
        <div v-if="activeSubTab === 'ficha'" style="padding: 7px 10px 8px; display: flex; flex-direction: column; gap: 6px; min-height: 100%;">

          <!-- 1. IDENTIFICAÇÃO -->
          <div>
            <div style="margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px; flex-wrap: wrap; margin-top: -2px; padding-top: 3px; padding-bottom: 3px;">
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
              <div style="display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; padding-bottom: 3px;">
                <span style="font-size: 14px; font-weight: 700; color: #1C1C1E;">{{ g.neighborhood }}</span>
                <span style="font-size: 10px; color: #8E8E93; font-family: monospace;">({{ g.id }}, {{ g.city }})</span>
              </div>
            </div>

            <!-- Cards Share / Satisfação / Churn -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 0.85fr; gap: 4px; margin-top: 4px;">
              <!-- Share Vivo -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); height: 70px;">
                <div style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; margin-bottom: 3px; white-space: nowrap;">Share Vivo</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                  <div
                    :style="{
                      borderRight: '1px solid rgba(0,0,0,0.07)', paddingRight: '4px',
                      opacity: activeTech === 'MOVEL' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Fibra</div>
                    <span style="font-size: 14px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ shareFibra }}%</span>
                    <div :style="{ fontSize: '7px', fontWeight: 700, color: deltaFibra.color, whiteSpace: 'nowrap', paddingTop: '5px' }">{{ deltaFibra.label }}</div>
                  </div>
                  <div
                    :style="{
                      paddingLeft: '2px',
                      opacity: activeTech === 'FIBRA' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Móvel</div>
                    <span style="font-size: 14px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ shareMovel }}%</span>
                    <div :style="{ fontSize: '7px', fontWeight: 700, color: deltaMovel.color, whiteSpace: 'nowrap', paddingTop: '5px' }">{{ deltaMovel.label }}</div>
                  </div>
                </div>
              </div>

              <!-- Satisfação Vivo -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 5px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); height: 70px;">
                <div style="font-size: 8.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; margin-bottom: 3px; white-space: nowrap;">Satisfação Vivo</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                  <div
                    :style="{
                      borderRight: '1px solid rgba(0,0,0,0.07)', paddingRight: '4px',
                      opacity: activeTech === 'MOVEL' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Fibra</div>
                    <span style="font-size: 14px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ scoreFibraSat }}</span>
                    <div style="margin-top: -5px;">
                      <span
                        :style="{
                          display: 'inline-block', fontSize: '7px', fontWeight: 700,
                          color: satColor(scoreFibraSat),
                          background: `${satColor(scoreFibraSat)}15`,
                          border: `1px solid ${satColor(scoreFibraSat)}44`,
                          borderRadius: '4px', padding: '1px 5px', height: '13px', whiteSpace: 'nowrap',
                        }"
                      >{{ satLabel(scoreFibraSat) }}</span>
                    </div>
                  </div>
                  <div
                    :style="{
                      paddingLeft: '2px',
                      opacity: activeTech === 'FIBRA' ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    }"
                  >
                    <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 1px;">Móvel</div>
                    <span style="font-size: 14px; font-weight: 800; color: #1c1c1e; line-height: 1;">{{ scoreMovelSat }}</span>
                    <div style="margin-top: -5px;">
                      <span
                        :style="{
                          display: 'inline-block', fontSize: '7px', fontWeight: 700,
                          color: satColor(scoreMovelSat),
                          background: `${satColor(scoreMovelSat)}15`,
                          border: `1px solid ${satColor(scoreMovelSat)}44`,
                          borderRadius: '4px', padding: '1px 5px', height: '13px', whiteSpace: 'nowrap',
                        }"
                      >{{ satLabel(scoreMovelSat) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Churn Acumulado -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); height: 70px;">
                <div style="font-size: 8.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; margin-bottom: 1px; white-space: nowrap;">Churn Acumulado</div>
                <div style="font-size: 8px; color: #8E8E93; margin-bottom: 3px; font-weight: 500;">últimos 3 meses</div>
                <div :style="{ fontSize: '20px', fontWeight: 800, color: churnData.color, lineHeight: 1, paddingTop: '4px' }">{{ churnData.churn }}%</div>
              </div>
            </div>
          </div>

          <!-- 2. COMERCIAL -->
          <div style="margin-bottom: -5px; padding-top: 1px;">
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px; padding-top: 2px;">Comercial</div>

            <!-- Perfil da Área — 4 colunas -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 4px; height: 78px;">
              <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93; padding-top: 2px;">Perfil da Área</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0;">
                <!-- Renda -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; border-right: 1px solid rgba(0,0,0,0.07); padding-bottom: 5px; margin-top: -3px;">
                  <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">Renda</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E; margin-bottom: -3px;">R${{ (g.demographics.avgIncome/1000).toFixed(0) }}k</div>
                  <span
                    v-if="classeSocial"
                    :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: classeSocial.color, background: classeSocial.bg, height: '14px', flexShrink: 0, marginTop: '3px' }"
                  >{{ classeSocial.label }}</span>
                </div>
                <!-- Densidade -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; border-right: 1px solid rgba(0,0,0,0.07); padding-bottom: 2px; margin-top: -3px;">
                  <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">Densidade</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E;">{{ (g.demographics.populationDensity/1000).toFixed(1) }}k</div>
                  <div style="font-size: 7px; color: #8E8E93; margin-top: -2px;">hab/km²</div>
                </div>
                <!-- População -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; border-right: 1px solid rgba(0,0,0,0.07); padding-bottom: 2px; margin-top: -3px;">
                  <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">População</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E;">~{{ populacao }}</div>
                  <div style="font-size: 7px; color: #8E8E93; margin-top: -2px;">residentes</div>
                </div>
                <!-- Crescimento -->
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3px 2px; padding-bottom: 5px; margin-top: -3px;">
                  <div style="font-size: 7px; color: #8E8E93; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 2px; margin-top: -2px;">Crescimento</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1C1C1E; margin-bottom: -3px;">+{{ g.demographics.populationGrowth }}%</div>
                  <span
                    v-if="growthTag"
                    :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: growthTag.color, background: growthTag.bg, height: '14px', flexShrink: 0, marginTop: '3px' }"
                  >{{ g.demographics.growthLabel }}</span>
                </div>
              </div>
            </div>

            <!-- Satisfação + SpeedTest -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 4px;">
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-top: 3px;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </span>
                  <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Satisfação</span>
                </div>
                <!-- Barras de satisfação -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <div v-for="s in g.satisfactionScores" :key="s.name" style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 8px; font-weight: 600; color: #1C1C1E; width: 36px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ s.name }}</span>
                    <div style="flex: 1; height: 4px; background: #F2F2F7; border-radius: 3px; overflow: hidden;">
                      <div
                        :style="{
                          height: '100%',
                          width: `${s.score * 10}%`,
                          background: brandColor(s.name.toUpperCase(), s.score),
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }"
                      />
                    </div>
                    <span :style="{ fontSize: '9px', fontWeight: 700, color: brandColor(s.name.toUpperCase(), s.score), width: '28px', textAlign: 'right', flexShrink: 0 }">{{ (s.score * 10).toFixed(0) }}</span>
                  </div>
                </div>
              </div>
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-top: 3px;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </span>
                  <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">SpeedTest</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 9px; font-weight: 600; color: #1C1C1E;">Download</span>
                    <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">{{ g.speedtest.downloadMbps }} Mbps</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 9px; font-weight: 600; color: #1C1C1E;">Latência</span>
                    <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">{{ g.speedtest.latencyMs }} ms</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 9px; font-weight: 600; color: #1C1C1E;">Qualidade</span>
                    <span
                      :style="{
                        fontSize: '9px', fontWeight: 700,
                        color: g.speedtest.qualityLabel === 'Ótimo' ? '#15803D' : g.speedtest.qualityLabel === 'Bom' ? '#039900' : '#DC2626',
                      }"
                    >{{ g.speedtest.qualityLabel }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- CRM Vivo -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 6px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">CRM Vivo</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Fibra</div>
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 9px; color: #8E8E93;">ARPU</span>
                      <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">R$ {{ g.crm.arpuFibra > 0 ? g.crm.arpuFibra : g.crm.arpu }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 9px; color: #8E8E93;">Plano</span>
                      <span style="font-size: 9px; font-weight: 600; color: #1C1C1E;">{{ g.crm.planType || '—' }}</span>
                    </div>
                  </div>
                </div>
                <div style="width: 1px; background: rgba(0,0,0,0.07); align-self: stretch; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                  <div style="font-size: 9px; color: #660099; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 3px;">Móvel</div>
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 9px; color: #8E8E93;">ARPU</span>
                      <span style="font-size: 9px; font-weight: 700; color: #1C1C1E;">R$ {{ g.crm.arpuMovel > 0 ? g.crm.arpuMovel : g.crm.arpu }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 9px; color: #8E8E93;">Plano</span>
                      <span style="font-size: 9px; font-weight: 600; color: #1C1C1E;">{{ g.crm.planoMovel || g.crm.planType || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. INFRAESTRUTURA -->
          <div>
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px;">Infraestrutura</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 4px;">
              <!-- Card Fibra -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); height: 82px;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                  </span>
                  <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Fibra</span>
                </div>
                <div style="padding-top: 3px; margin-bottom: -3px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 9px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Cobertura</div>
                    <span :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: fibraCobertura.color, background: fibraCobertura.bg, height: '14px', flexShrink: 0, marginTop: '3px' }">{{ fibraCobertura.label }}</span>
                  </div>
                </div>
                <div style="padding-top: 5px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 9px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Qualidade</div>
                    <span
                      v-if="hasFibra"
                      :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: fibraClassColor.color, background: fibraClassColor.bg, height: '14px', flexShrink: 0, marginTop: '3px' }"
                    >{{ fibraClassLabel }}</span>
                    <span v-else style="display: inline-flex; align-items: center; padding: 0px 7px; border-radius: 5px; font-size: 9px; font-weight: 600; color: #1D4ED8; background: rgba(29,78,216,0.1); height: 14px; flex-shrink: 0; margin-top: 3px;">EXPANSÃO</span>
                  </div>
                </div>
              </div>
              <!-- Card Móvel -->
              <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </span>
                  <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Móvel</span>
                </div>
                <div style="padding-top: 3px; margin-bottom: -3px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 9px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0px;">Cobertura</div>
                    <span :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: movelCobertura.color, background: movelCobertura.bg, height: '14px', flexShrink: 0, marginTop: '3px' }">{{ movelCobertura.label }}</span>
                  </div>
                </div>
                <div style="padding-top: 5px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 9px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">Qualidade</div>
                    <span
                      v-if="hasMovel"
                      :style="{ display: 'inline-flex', alignItems: 'center', padding: '0px 7px', borderRadius: '5px', fontSize: '9px', fontWeight: 600, color: movelClassColor.color, background: movelClassColor.bg, height: '14px', flexShrink: 0, marginTop: '3px' }"
                    >{{ movelClassLabel }}</span>
                    <span v-else style="display: inline-flex; align-items: center; padding: 0px 7px; border-radius: 5px; font-size: 9px; font-weight: 600; color: #1D4ED8; background: rgba(29,78,216,0.1); height: 14px; flex-shrink: 0; margin-top: 3px;">EXPANSÃO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════
             OVERVIEW IA (Análise Estratégica)
             ═══════════════════════════════════════════════════════════════════ -->
        <div v-else-if="activeSubTab === 'overview'" style="padding: 14px 14px 20px;">

          <!-- PERCEPÇÃO -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px;">Percepção</div>

            <!-- Score Ookla Fibra/Móvel -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </span>
                <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #1C1C1E;">Score Ookla</span>
              </div>
              <div style="display: flex; gap: 0;">
                <div style="flex: 1; padding: 0 10px 0 0; display: flex; flex-direction: column; align-items: center; text-align: center;">
                  <div style="font-size: 10px; color: #0369A1; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 3px;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    Fibra
                  </div>
                  <template v-if="hasFibra && g.diagnostico.scoreOoklaFibra > 0">
                    <div :style="{ fontSize: '20px', fontWeight: 800, color: statusStyle(speedtestFibraStatus).valueColor }">{{ scoreFibra100.toFixed(0) }}</div>
                    <span :style="{ display: 'inline-block', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, color: statusStyle(speedtestFibraStatus).tagColor, background: statusStyle(speedtestFibraStatus).tagBg }">{{ speedtestFibraStatus === 'critico' ? 'Crítico' : speedtestFibraStatus === 'atencao' ? 'Atenção' : 'Saudável' }}</span>
                  </template>
                  <template v-else>
                    <div style="font-size: 20px; font-weight: 800; color: #C7C7CC;">—</div>
                    <span style="display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; color: #1D4ED8; background: rgba(29,78,216,0.1);">EXPANSÃO NOVA ÁREA</span>
                  </template>
                </div>
                <div style="width: 1px; background: rgba(0,0,0,0.07); align-self: stretch; flex-shrink: 0;"></div>
                <div style="flex: 1; padding: 0 0 0 10px; display: flex; flex-direction: column; align-items: center; text-align: center;">
                  <div style="font-size: 10px; color: #660099; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 3px;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    Móvel
                  </div>
                  <template v-if="hasMovel && g.diagnostico.scoreOoklaMovel > 0">
                    <div :style="{ fontSize: '20px', fontWeight: 800, color: statusStyle(speedtestMovelStatus).valueColor }">{{ scoreMovel100.toFixed(0) }}</div>
                    <span :style="{ display: 'inline-block', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, color: statusStyle(speedtestMovelStatus).tagColor, background: statusStyle(speedtestMovelStatus).tagBg }">{{ speedtestMovelStatus === 'critico' ? 'Crítico' : speedtestMovelStatus === 'atencao' ? 'Atenção' : 'Saudável' }}</span>
                  </template>
                  <template v-else>
                    <div style="font-size: 20px; font-weight: 800; color: #C7C7CC;">—</div>
                    <span style="display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; color: #1D4ED8; background: rgba(29,78,216,0.1);">EXPANSÃO COBERTURA</span>
                  </template>
                </div>
              </div>
            </div>

            <!-- Score HAC -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8a16 16 0 0 0 6 6l.27-.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Score HAC</span>
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0;">
                  <span :style="{ display: 'inline-block', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, color: statusStyle(chamadosStatus).tagColor, background: statusStyle(chamadosStatus).tagBg }">{{ chamadosStatus === 'critico' ? 'Crítico' : chamadosStatus === 'atencao' ? 'Atenção' : 'Saudável' }}</span>
                  <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(chamadosStatus).valueColor, whiteSpace: 'nowrap' }">{{ g.diagnostico.taxaChamados.toFixed(1) }}%</div>
                </div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(chamadosStatus).diagColor, marginTop: '6px', paddingLeft: '26px' }">
                {{ g.diagnostico.taxaChamados >= 2.5 ? '2.5–4% — Atenção' : '< 3% — Saudável' }}
              </div>
            </div>
          </div>

          <!-- CONCORRÊNCIA -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px;">Concorrência</div>

            <!-- Share/Penetração -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="14" x2="8" y2="11"/><line x1="11" y1="14" x2="11" y2="8"/><line x1="14" y1="14" x2="14" y2="10"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Share / Penetração</span>
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0;">
                  <span :style="{ display: 'inline-block', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 700, color: statusStyle(shareStatus).tagColor, background: statusStyle(shareStatus).tagBg }">{{ shareStatus === 'saturado' ? 'Saturado' : shareStatus === 'atencao' ? 'Atenção' : 'Oportunidade' }}</span>
                  <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(shareStatus).valueColor, whiteSpace: 'nowrap' }">{{ g.diagnostico.sharePenetracao }}%</div>
                </div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(shareStatus).diagColor, marginTop: '6px', paddingLeft: '26px' }">
                {{ g.diagnostico.sharePenetracao > 30 ? '30–40% — Atenção' : '< 30% — Oportunidade' }}
              </div>
            </div>

            <!-- Vantagem Satisfação Fibra -->
            <div v-if="hasFibra" style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Vantagem Satisfação Fibra</span>
                  </div>
                </div>
                <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(fibraAdvStatus).valueColor, whiteSpace: 'nowrap', flexShrink: 0 }">{{ fibraAdvLabel }}</div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(fibraAdvStatus).diagColor, marginTop: '6px', paddingLeft: '26px' }">{{ fibraAdvDiag }}</div>
            </div>

            <!-- Vantagem Satisfação Móvel -->
            <div v-if="hasMovel" style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Vantagem Satisfação Móvel</span>
                  </div>
                </div>
                <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(movelAdvStatus).valueColor, whiteSpace: 'nowrap', flexShrink: 0 }">{{ movelAdvLabel }}</div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(movelAdvStatus).diagColor, marginTop: '6px', paddingLeft: '26px' }">{{ movelAdvDiag }}</div>
            </div>

            <!-- Tabela Concorrência -->
            <div v-if="g.diagnostico.concorrentes && g.diagnostico.concorrentes.length > 0" style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                </span>
                <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #1C1C1E;">Comparativo de Concorrência</span>
              </div>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr>
                      <th rowspan="2" style="text-align: left; padding: 4px 4px 4px 0; color: #8E8E93; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.08); vertical-align: bottom; width: 20%;">Operadora</th>
                      <th colspan="2" style="text-align: center; padding: 4px 4px 2px; color: #0369A1; font-weight: 700; background: rgba(3,105,161,0.05);">Fibra</th>
                      <th colspan="2" style="text-align: center; padding: 4px 4px 2px; color: #660099; font-weight: 700; background: rgba(102,0,153,0.05);">Móvel</th>
                    </tr>
                    <tr>
                      <th style="text-align: center; padding: 2px 4px 4px; color: #8E8E93; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(3,105,161,0.03);">Cob.</th>
                      <th style="text-align: right; padding: 2px 4px 4px; color: #8E8E93; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(3,105,161,0.03);">Preço</th>
                      <th style="text-align: center; padding: 2px 4px 4px; color: #8E8E93; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(102,0,153,0.03);">Cob.</th>
                      <th style="text-align: right; padding: 2px 4px 4px; color: #8E8E93; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.08); background: rgba(102,0,153,0.03);">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in g.diagnostico.concorrentes" :key="c.nome" style="border-bottom: 1px solid rgba(0,0,0,0.04);">
                      <td style="padding: 5px 4px 5px 0; font-weight: 700;" :style="{ color: getOperatorColor(c.nome) }">{{ c.nome }}</td>
                      <td style="text-align: center; padding: 5px 4px;">
                        <span :style="{ display: 'inline-block', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, color: c.coberturaFibra ? '#15803D' : '#8E8E93', background: c.coberturaFibra ? 'rgba(21,128,61,0.1)' : 'rgba(0,0,0,0.04)' }">{{ c.coberturaFibra ? 'Sim' : 'Não' }}</span>
                      </td>
                      <td style="text-align: right; padding: 5px 4px;">
                        <template v-if="c.coberturaFibra && c.precoFibra > 0">
                          <div style="font-weight: 700; color: #1C1C1E;">R$ {{ c.precoFibra.toFixed(0) }}</div>
                          <div style="color: #8E8E93; font-size: 9px; white-space: nowrap;">{{ c.planoFibra }}</div>
                        </template>
                        <span v-else style="color: #C7C7CC;">—</span>
                      </td>
                      <td style="text-align: center; padding: 5px 4px;">
                        <span :style="{ display: 'inline-block', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, color: c.coberturaMovel ? '#15803D' : '#8E8E93', background: c.coberturaMovel ? 'rgba(21,128,61,0.1)' : 'rgba(0,0,0,0.04)' }">{{ c.coberturaMovel ? 'Sim' : 'Não' }}</span>
                      </td>
                      <td style="text-align: right; padding: 5px 4px;">
                        <template v-if="c.coberturaMovel && c.precoMovel > 0">
                          <div style="font-weight: 700; color: #1C1C1E;">R$ {{ c.precoMovel.toFixed(0) }}</div>
                          <div style="color: #8E8E93; font-size: 9px; white-space: nowrap;">{{ c.planoMovel }}</div>
                        </template>
                        <span v-else style="color: #C7C7CC;">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- INFRAESTRUTURA -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px;">Infraestrutura</div>
            <div v-if="hasFibra && fibraClassRow" style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Fibra (Status)</span>
                  </div>
                </div>
                <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(fibraClassRow.status).valueColor, whiteSpace: 'nowrap', flexShrink: 0 }">{{ fibraClassRow.label }}</div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(fibraClassRow.status).diagColor, marginTop: '6px', paddingLeft: '26px' }">{{ fibraClassRow.diag }}</div>
            </div>
            <div v-if="hasMovel && movelClassRow" style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Móvel (Status)</span>
                  </div>
                </div>
                <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(movelClassRow.status).valueColor, whiteSpace: 'nowrap', flexShrink: 0 }">{{ movelClassRow.label }}</div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(movelClassRow.status).diagColor, marginTop: '6px', paddingLeft: '26px' }">{{ movelClassRow.diag }}</div>
            </div>
          </div>

          <!-- COMPORTAMENTO -->
          <div>
            <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 4px;">Comportamento</div>
            <!-- Sensibilidade a Preço -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Sensibilidade a Preço</span>
                  </div>
                </div>
                <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(arpuStatus).valueColor, whiteSpace: 'nowrap', flexShrink: 0 }">{{ arpuRel.toFixed(2) }}</div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(arpuStatus).diagColor, marginTop: '6px', paddingLeft: '26px' }">{{ arpuDiag }}</div>
            </div>
            <!-- Afinidade de Canal -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 6px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: rgba(102,0,153,0.07); color: #660099; flex-shrink: 0;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                    </span>
                    <span style="font-size: 12px; font-weight: 700; color: #1C1C1E; line-height: 1.3;">Afinidade de Canal</span>
                  </div>
                </div>
                <div :style="{ fontSize: '13px', fontWeight: 700, color: statusStyle(canalStatus).valueColor, whiteSpace: 'nowrap', flexShrink: 0 }">{{ g.diagnostico.canalDominante }} ({{ g.diagnostico.canalPct }}%)</div>
              </div>
              <div :style="{ fontSize: '10px', fontWeight: 600, color: statusStyle(canalStatus).diagColor, marginTop: '6px', paddingLeft: '26px' }">{{ canalDiag }}</div>
            </div>

            <!-- Decisão Integrada -->
            <div v-if="g.camada2.decisaoIntegrada" style="background: #fff; border-radius: 10px; border: 1px solid rgba(102,0,153,0.15); padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <span style="font-size: 11px; font-weight: 800; color: #660099; text-transform: uppercase; letter-spacing: 0.06em;">Decisão Integrada</span>
              </div>
              <p style="font-size: 10px; color: #3C1A5E; line-height: 1.5; margin: 0 0 8px 0; font-weight: 500;">{{ g.camada2.decisaoIntegrada }}</p>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div
                  v-for="(h, i) in highlights"
                  :key="i"
                  :style="{
                    display: 'flex', alignItems: 'flex-start', gap: '6px',
                    background: hlBg[h.type], border: `1px solid ${hlBorder[h.type]}`,
                    borderRadius: '6px', padding: '5px 8px',
                  }"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" :stroke="hlColor[h.type]" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 1px; flex-shrink: 0;">
                    <template v-if="h.type === 'positive'"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></template>
                    <template v-else-if="h.type === 'negative'"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></template>
                    <template v-else><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/><circle cx="12" cy="12" r="10"/></template>
                  </svg>
                  <span :style="{ fontSize: '9px', fontWeight: 500, color: hlColor[h.type], lineHeight: 1.4 }">{{ h.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RECOMENDAÇÃO IA removida conforme protótipo React final -->
        <div v-else-if="activeSubTab === 'ia'" style="display:none;">
          <!-- Estado: não gerado -->
          <div v-if="!iaGerada" style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 32px 16px;">
            <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(102,0,153,0.08); display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 14px; font-weight: 700; color: #1C1C1E; margin-bottom: 4px;">Recomendação IA</div>
              <div style="font-size: 12px; color: #8E8E93; line-height: 1.5;">Análise automatizada de Móvel e Fibra com recomendação de ação comercial para este geohash.</div>
            </div>
            <button
              :disabled="iaLoading"
              :style="{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 24px', borderRadius: '10px',
                background: '#660099', color: '#ffffff',
                border: 'none', cursor: iaLoading ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: 700,
                opacity: iaLoading ? 0.7 : 1,
                transition: 'opacity 0.2s',
                fontFamily: 'inherit',
              }"
              @click="handleGerarIA"
            >
              <span v-if="iaLoading" style="display: inline-block; animation: spin 1s linear infinite; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%;"></span>
              {{ iaLoading ? 'Gerando...' : 'Gerar' }}
            </button>
          </div>

          <!-- Estado: gerado -->
          <div v-else-if="ia" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <span style="font-size: 12px; font-weight: 700; color: #660099;">Recomendação IA</span>
              </div>
              <span style="font-size: 10px; color: #8E8E93;">Gerado automaticamente</span>
            </div>

            <!-- Fibra + Móvel cards -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div
                v-for="item in [
                  { label: 'FIBRA', decisao: ia.fibra.decisao, prioridade: ia.fibra.prioridade, score: scoreFibraIA },
                  { label: 'MÓVEL', decisao: ia.movel.decisao, prioridade: ia.movel.prioridade, score: scoreMovelIA },
                ]"
                :key="item.label"
                style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);"
              >
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                  <span style="font-size: 10px; font-weight: 700; color: #8E8E93; letter-spacing: 0.06em;">{{ item.label }}</span>
                </div>
                <div style="font-size: 8px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 2px;">Score de Priorização</div>
                <div style="font-size: 22px; font-weight: 800; color: #1C1C1E; line-height: 1; margin-bottom: 8px;">{{ item.score }}</div>
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 6px;">
                  <span :style="{ fontSize: '12px', fontWeight: 800, color: DECISAO_CONFIG[item.decisao].color }">{{ DECISAO_CONFIG[item.decisao].label }}</span>
                </div>
                <span :style="{ display: 'inline-block', fontSize: '9px', fontWeight: 700, color: PRIORIDADE_CONFIG[item.prioridade].color, border: `1px solid ${PRIORIDADE_CONFIG[item.prioridade].color}`, padding: '2px 7px', borderRadius: '5px' }">{{ PRIORIDADE_CONFIG[item.prioridade].label }}</span>
              </div>
            </div>

            <!-- Totalização -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="font-size: 10px; font-weight: 700; color: #8E8E93; letter-spacing: 0.06em; margin-bottom: 8px;">TOTALIZAÇÃO (MÓVEL + FIBRA)</div>
              <div style="font-size: 8px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #8E8E93; margin-bottom: 2px;">Score de Priorização</div>
              <div style="font-size: 28px; font-weight: 800; color: #1C1C1E; line-height: 1; margin-bottom: 8px;">{{ scoreTotalIA }}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span :style="{ fontSize: '20px', fontWeight: 800, color: DECISAO_CONFIG[ia.total.decisao].color }">{{ DECISAO_CONFIG[ia.total.decisao].label }}</span>
              </div>
            </div>

            <!-- Canal Recomendado -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Canal Recomendado</span>
              </div>
              <div style="font-size: 13px; color: #1C1C1E; line-height: 1.4;">{{ ia.canalRecomendado }}</div>
            </div>

            <!-- Abordagem Comercial -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #8E8E93;">Abordagem Comercial</span>
              </div>
              <div style="font-size: 13px; color: #1C1C1E; line-height: 1.4;">{{ ia.abordagemComercial }}</div>
            </div>

            <!-- Raciocínio -->
            <div style="background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.07); padding: 6px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 5px; background: rgba(102,0,153,0.08); color: #660099; flex-shrink: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </span>
                <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #660099;">Raciocínio</span>
              </div>
              <div style="font-size: 12px; color: #3D0066; line-height: 1.5;">{{ ia.raciocinio }}</div>
            </div>
          </div>
        </div>

      </div><!-- fim scroll -->
    </template>

    <!-- Estado vazio -->
    <div v-else style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #8E8E93; padding: 32px;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      <div style="font-size: 13px; text-align: center; line-height: 1.5;">Passe o cursor sobre um geohash no mapa para ver os dados</div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
