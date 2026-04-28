<script setup lang="ts">
// pages/bairros.vue — Visão de Bairros
// Migrado fielmente de VisaoBairros.tsx (React) para Vue/Nuxt 3
import { GEOHASH_DATA, QUADRANT_CONFIG, TECH_CONFIG, PRIORITY_CONFIG } from "~/utils/goiania";
import type { GeohashEntry, Quadrant } from "~/utils/goiania";

definePageMeta({ layout: "default" });

const OPERATOR_COLORS: Record<string, string> = {
  VIVO: "#660099", TIM: "#0060AE", CLARO: "#E30613",
  "LINQ TELECOM": "#F5A623", LINQ: "#F5A623",
};

interface BairroData {
  name: string;
  geohashes: GeohashEntry[];
  totalPopulation: number;
  totalClients: number;
  avgShare: number;
  avgVivoScore: number;
  avgTimScore: number;
  avgClaroScore: number;
  avgIncome: number | null;
  trendUp: number; trendDown: number; trendStable: number;
  dominantTrend: "UP" | "DOWN" | "STABLE";
  trendDelta: number;
  quadrantCounts: Record<string, number>;
  dominantQuadrant: Quadrant;
  hasFibra: boolean; hasMovel: boolean;
}

type RankingTab = "GROWTH" | "UPSELL" | "RETENCAO" | "GROWTH_RETENCAO";
const RANKING_TABS: { key: RankingTab; label: string }[] = [
  { key: "GROWTH", label: "Growth" },
  { key: "UPSELL", label: "Upsell" },
  { key: "RETENCAO", label: "Retenção" },
  { key: "GROWTH_RETENCAO", label: "Growth + Retenção" },
];
const QUADRANT_ORDER: Quadrant[] = ["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"];
const QUADRANT_LABELS: Record<Quadrant, string> = {
  GROWTH: "Growth", UPSELL: "Upsell", RETENCAO: "Retenção", GROWTH_RETENCAO: "Growth + Retenção",
};
const FIBRA_LABELS: Record<string, string> = {
  AUMENTO_CAPACIDADE: "Aumento de Capacidade",
  EXPANSAO_NOVA_AREA: "Expansão Nova Área",
  SAUDAVEL: "Saudável",
};
const MOVEL_LABELS: Record<string, string> = {
  MELHORA_QUALIDADE: "Melhora na Qualidade",
  SAUDAVEL: "Rede Saudável",
  EXPANSAO_5G: "Expansão 5G",
  EXPANSAO_4G: "Expansão 4G",
};
const FIBRA_COLORS: Record<string, string> = {
  AUMENTO_CAPACIDADE: "#EF4444", EXPANSAO_NOVA_AREA: "#F97316", SAUDAVEL: "#22C55E",
};
const MOVEL_COLORS: Record<string, string> = {
  MELHORA_QUALIDADE: "#EF4444", SAUDAVEL: "#22C55E", EXPANSAO_5G: "#7C3AED", EXPANSAO_4G: "#3B82F6",
};

function trendColor(t: "UP" | "DOWN" | "STABLE") {
  return t === "UP" ? "#16a34a" : t === "DOWN" ? "#dc2626" : "#64748b";
}
function trendLabel(t: "UP" | "DOWN" | "STABLE") {
  return t === "UP" ? "Crescendo" : t === "DOWN" ? "Caindo" : "Estável";
}
function trendArrow(t: "UP" | "DOWN" | "STABLE") {
  return t === "UP" ? "↗" : t === "DOWN" ? "↘" : "→";
}
function fmt(n: number) { return n.toLocaleString("pt-BR"); }
function quadrantLabelShort(q: string) {
  return ({ RETENCAO: "Ret.", UPSELL: "Up.", GROWTH: "Gr.", GROWTH_RETENCAO: "G+R" } as Record<string, string>)[q] ?? q;
}

function buildBairroData(): BairroData[] {
  const map = new Map<string, GeohashEntry[]>();
  for (const gh of GEOHASH_DATA) {
    const arr = map.get(gh.neighborhood) ?? [];
    arr.push(gh);
    map.set(gh.neighborhood, arr);
  }
  const result: BairroData[] = [];
  for (const [name, ghs] of Array.from(map.entries())) {
    const totalPopulation = ghs.reduce((s, g) => s + g.marketShare.totalPopulation, 0);
    const totalClients = ghs.reduce((s, g) => s + g.marketShare.activeClients, 0);
    const avgShare = Math.round(ghs.reduce((s, g) => s + g.marketShare.percentage, 0) / ghs.length);
    const avgVivoScore = parseFloat((ghs.reduce((s, g) => s + (g.satisfactionScores.find((x: any) => x.name === "VIVO")?.score ?? 0), 0) / ghs.length).toFixed(1));
    const avgTimScore = parseFloat((ghs.reduce((s, g) => s + (g.satisfactionScores.find((x: any) => x.name === "TIM")?.score ?? 0), 0) / ghs.length).toFixed(1));
    const avgClaroScore = parseFloat((ghs.reduce((s, g) => s + (g.satisfactionScores.find((x: any) => x.name === "CLARO")?.score ?? 0), 0) / ghs.length).toFixed(1));
    const withIncome = ghs.filter(g => g.demographics?.avgIncome);
    const avgIncome = withIncome.length ? Math.round(withIncome.reduce((s, g) => s + g.demographics.avgIncome, 0) / withIncome.length) : null;
    const trendUp = ghs.filter(g => g.shareTrend?.direction === "UP").length;
    const trendDown = ghs.filter(g => g.shareTrend?.direction === "DOWN").length;
    const trendStable = ghs.filter(g => g.shareTrend?.direction === "STABLE").length;
    const dominantTrend: "UP" | "DOWN" | "STABLE" =
      trendUp > trendDown && trendUp > trendStable ? "UP" :
      trendDown > trendUp && trendDown > trendStable ? "DOWN" : "STABLE";
    const trendDelta = parseFloat((ghs.reduce((s, g) => s + (g.shareTrend?.delta ?? 0), 0) / ghs.length).toFixed(1));
    const quadrantCounts: Record<string, number> = {};
    for (const gh of ghs) {
      quadrantCounts[gh.quadrant] = (quadrantCounts[gh.quadrant] ?? 0) + 1;
    }
    const dominantQuadrant = Object.entries(quadrantCounts).sort((a, b) => b[1] - a[1])[0][0] as Quadrant;
    const hasFibra = ghs.some(g => g.technology === "FIBRA" || g.technology === "AMBOS");
    const hasMovel = ghs.some(g => g.technology === "MOVEL" || g.technology === "AMBOS");
    result.push({
      name, geohashes: ghs, totalPopulation, totalClients, avgShare,
      avgVivoScore, avgTimScore, avgClaroScore, avgIncome,
      trendUp, trendDown, trendStable, dominantTrend, trendDelta,
      quadrantCounts, dominantQuadrant, hasFibra, hasMovel,
    });
  }
  return result.sort((a, b) => b.totalClients - a.totalClients);
}

const BAIRROS_DATA = buildBairroData();

const selectedBairro = ref<BairroData | null>(null);
const rankingTab = ref<RankingTab>("GROWTH");
const search = ref("");

const tabColor = computed(() => QUADRANT_CONFIG[rankingTab.value].color);

const rankingList = computed(() => {
  let list = BAIRROS_DATA.filter(b => (b.quadrantCounts[rankingTab.value] ?? 0) > 0);
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(b => b.name.toLowerCase().includes(q));
  }
  return [...list].sort((a, b) => b.avgShare - a.avgShare);
});

const detail = computed(() => {
  if (!selectedBairro.value) return null;
  const b = selectedBairro.value;
  const dominantColor = QUADRANT_CONFIG[b.dominantQuadrant]?.color ?? "#660099";
  const bestCompetitor = Math.max(b.avgTimScore, b.avgClaroScore);
  const deltaVsCompetitor = parseFloat((b.avgVivoScore - bestCompetitor).toFixed(1));
  const deltaColor = deltaVsCompetitor > 0 ? "#16a34a" : deltaVsCompetitor < 0 ? "#dc2626" : "#64748b";
  const ghsWithC2 = b.geohashes.filter(g => g.camada2);
  const avgFibraScore = ghsWithC2.length ? Math.round(ghsWithC2.reduce((s, g) => s + (g.camada2?.fibra.score ?? 0), 0) / ghsWithC2.length) : null;
  const avgMovelScore = ghsWithC2.length ? Math.round(ghsWithC2.reduce((s, g) => s + (g.camada2?.movel.score ?? 0), 0) / ghsWithC2.length) : null;
  const fibraClassCounts: Record<string, number> = {};
  const movelClassCounts: Record<string, number> = {};
  for (const g of ghsWithC2) {
    if (g.camada2) {
      fibraClassCounts[g.camada2.fibra.classification] = (fibraClassCounts[g.camada2.fibra.classification] ?? 0) + 1;
      movelClassCounts[g.camada2.movel.classification] = (movelClassCounts[g.camada2.movel.classification] ?? 0) + 1;
    }
  }
  return { dominantColor, deltaVsCompetitor, deltaColor, ghsWithC2, avgFibraScore, avgMovelScore, fibraClassCounts, movelClassCounts };
});

const sortedFrentes = computed(() => {
  return [...GEOHASH_DATA]
    .filter(g => g.quadrant === rankingTab.value)
    .sort((a, b) => b.priorityScore - a.priorityScore);
});
</script>

<template>
  <div style="height:100%;display:flex;flex-direction:column;overflow:hidden;background:#F2F2F7;">

    <!-- Cabeçalho -->
    <div style="background:white;border-bottom:1px solid rgba(0,0,0,0.07);padding:10px 16px;display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;">
      <span style="font-size:11px;font-weight:700;color:#8E8E93;letter-spacing:0.06em;text-transform:uppercase;margin-right:4px;white-space:nowrap;">Categoria</span>
      <button
        v-for="t in RANKING_TABS" :key="t.key"
        @click="rankingTab = t.key; selectedBairro = null"
        :style="{
          display:'flex', alignItems:'center', gap:'5px',
          padding:'5px 12px', borderRadius:'20px', cursor:'pointer',
          fontSize:'14px', fontWeight:600, transition:'all 0.15s ease',
          border: `1.5px solid ${rankingTab===t.key ? QUADRANT_CONFIG[t.key].color : QUADRANT_CONFIG[t.key].color+'40'}`,
          background: rankingTab===t.key ? QUADRANT_CONFIG[t.key].color : 'transparent',
          color: rankingTab===t.key ? 'white' : QUADRANT_CONFIG[t.key].color,
          height:'28px', fontFamily:'inherit'
        }"
      >{{ t.label }}</button>
      <div style="flex:1;min-width:160px;max-width:260px;position:relative;margin-left:8px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="search" type="text" placeholder="Buscar bairro..."
          style="width:100%;padding-left:28px;padding-right:10px;padding-top:6px;padding-bottom:6px;font-size:14px;border:1px solid rgba(0,0,0,0.1);border-radius:20px;outline:none;background:#F2F2F7;color:#1C1C1E;box-sizing:border-box;height:28px;font-family:inherit;"
        />
      </div>
      <span style="margin-left:auto;font-size:12px;color:#8E8E93;white-space:nowrap;">
        {{ BAIRROS_DATA.length }} bairros · {{ GEOHASH_DATA.length }} geohashes
      </span>
    </div>

    <!-- Corpo: sidebar + painel -->
    <div style="flex:1;display:flex;overflow:hidden;">

      <!-- Sidebar -->
      <aside style="width:260px;flex-shrink:0;border-right:1px solid rgba(0,0,0,0.07);background:white;overflow-y:auto;">
        <div v-if="rankingList.length===0" style="padding:32px;text-align:center;color:#8E8E93;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 8px;display:block;">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <p style="font-size:13px;">Nenhum bairro encontrado</p>
        </div>
        <button
          v-else v-for="(bairro, idx) in rankingList" :key="bairro.name"
          @click="selectedBairro = bairro"
          :style="{
            width:'100%', textAlign:'left', padding:'11px 14px',
            borderBottom:'1px solid rgba(0,0,0,0.04)', transition:'all 0.15s ease',
            cursor:'pointer', fontFamily:'inherit',
            backgroundColor: selectedBairro?.name===bairro.name ? tabColor+'0C' : 'transparent',
            borderLeft: selectedBairro?.name===bairro.name ? `3px solid ${tabColor}` : '3px solid transparent',
          }"
        >
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <div :style="{
              width:'22px', height:'22px', borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              fontSize:'14px', fontWeight:700,
              backgroundColor: idx===0 ? tabColor : idx===1 ? tabColor+'CC' : idx===2 ? tabColor+'99' : tabColor+'18',
              color: idx<3 ? 'white' : tabColor,
            }">{{ idx+1 }}</div>
            <div style="flex:1;min-width:0;">
              <p style="font-size:13px;font-weight:700;color:#1C1C1E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0;">{{ bairro.name }}</p>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <p :style="{fontSize:'14px',fontWeight:700,color:tabColor,margin:0}">{{ bairro.avgShare }}%</p>
              <p style="font-size:12px;color:#8E8E93;margin:0;">share</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:5px;margin-left:30px;flex-wrap:wrap;">
            <span :style="{fontSize:'14px',fontWeight:600,padding:'1px 6px',borderRadius:'20px',border:`1px solid ${tabColor}40`,color:tabColor}">
              {{ bairro.quadrantCounts[rankingTab]??0 }} gh
            </span>
            <span :style="{display:'inline-flex',alignItems:'center',gap:'2px',fontSize:'14px',fontWeight:600,color:trendColor(bairro.dominantTrend)}">
              {{ trendArrow(bairro.dominantTrend) }} {{ Math.abs(bairro.trendDelta).toFixed(1) }} pp
            </span>
          </div>
        </button>
      </aside>

      <!-- Painel principal -->
      <main style="flex:1;overflow:hidden;display:flex;flex-direction:column;min-width:0;">

        <!-- Estado vazio: Tabela Frentes de Atuação -->
        <div v-if="!selectedBairro" style="height:100%;overflow-y:auto;padding:20px 24px;background:#F2F2F7;">
          <div style="margin-bottom:16px;">
            <h1 style="font-size:17px;font-weight:700;color:#1C1C1E;margin:0;">Frentes de Atuação</h1>
            <p style="font-size:12px;color:#8E8E93;margin:3px 0 0;">
              Goiânia — {{ GEOHASH_DATA.length }} geohashes analisados · Selecione um bairro à esquerda para ver o detalhe
            </p>
          </div>
          <div style="background:white;border:1px solid rgba(0,0,0,0.07);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background:#F9F9FB;border-bottom:1px solid rgba(0,0,0,0.07);">
                    <th v-for="h in ['Bairro','Geohash','Quadrante','Tecnologia','Share','Ookla','ARPU','Tendência','Score','Prioridade']" :key="h"
                      style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#8E8E93;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">
                      {{ h }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(g, i) in sortedFrentes" :key="g.id"
                    :style="{background: i%2===0 ? 'transparent' : '#FAFAFA', borderBottom:'1px solid rgba(0,0,0,0.04)'}">
                    <td style="padding:6px 10px;font-size:13px;font-weight:600;color:#1C1C1E;white-space:nowrap;">{{ g.neighborhood }}</td>
                    <td style="padding:6px 10px;"><span style="font-family:monospace;font-size:12px;color:#8E8E93;">{{ g.id }}</span></td>
                    <td style="padding:6px 10px;">
                      <span :style="{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'14px',fontWeight:600,color:'#fff',background:QUADRANT_CONFIG[g.quadrant].color,padding:'3px 10px 3px 8px',borderRadius:'20px',whiteSpace:'nowrap'}">
                        <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.8);flex-shrink:0;display:inline-block;"/>
                        {{ QUADRANT_CONFIG[g.quadrant].label }}
                      </span>
                    </td>
                    <td style="padding:6px 10px;">
                      <span :style="{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'14px',fontWeight:600,padding:'3px 10px',borderRadius:'20px',whiteSpace:'nowrap',color:TECH_CONFIG[g.technology]?.color??'#660099',background:(TECH_CONFIG[g.technology]?.color??'#660099')+'15',border:`1px solid ${(TECH_CONFIG[g.technology]?.color??'#660099')}40`}">
                        {{ TECH_CONFIG[g.technology]?.label??g.technology }}
                      </span>
                    </td>
                    <td style="padding:6px 10px;">
                      <span :style="{fontSize:'14px',fontWeight:700,color:g.marketShare.percentage>=35?'#16a34a':'#d97706'}">{{ g.marketShare.percentage }}%</span>
                    </td>
                    <td style="padding:6px 10px;">
                      <span :style="{fontSize:'14px',fontWeight:700,color:g.diagnostico.scoreOokla>=7.5?'#16a34a':g.diagnostico.scoreOokla>=6.5?'#d97706':'#dc2626'}">{{ g.diagnostico.scoreOokla.toFixed(1) }}</span>
                    </td>
                    <td style="padding:6px 10px;font-size:13px;color:#1C1C1E;">{{ g.crm?.arpuFibra ? `R$ ${g.crm.arpuFibra}` : "—" }}</td>
                    <td style="padding:6px 10px;">
                      <span :style="{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'14px',fontWeight:600,color:trendColor(g.shareTrend?.direction??'STABLE')}">
                        {{ trendArrow(g.shareTrend?.direction??'STABLE') }} {{ Math.abs(g.shareTrend?.delta??0).toFixed(1) }} pp
                      </span>
                    </td>
                    <td style="padding:6px 10px;"><span style="font-size:13px;font-weight:700;color:#660099;">{{ g.priorityScore.toFixed(1) }}</span></td>
                    <td style="padding:6px 10px;">
                      <span :style="{fontSize:'14px',fontWeight:600,color:PRIORITY_CONFIG[g.priority]?.color??'#660099',border:`1px solid ${(PRIORITY_CONFIG[g.priority]?.color??'#660099')}40`,padding:'2px 7px',borderRadius:'20px'}">
                        {{ PRIORITY_CONFIG[g.priority]?.label??g.priority }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Detalhe do bairro selecionado -->
        <div v-else style="flex:1;overflow-y:auto;padding:18px;background:#F2F2F7;">

          <!-- Header do bairro -->
          <div style="background:white;border-radius:14px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 4px rgba(0,0,0,0.04);padding:16px;margin-bottom:12px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
              <div>
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" :stroke="detail!.dominantColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h2 style="font-size:18px;font-weight:700;color:#1C1C1E;margin:0;">{{ selectedBairro.name }}</h2>
                </div>
                <p style="font-size:12px;color:#8E8E93;margin:0 0 8px;">
                  {{ selectedBairro.geohashes.length }} geohashes ·
                  {{ selectedBairro.hasFibra ? 'Fibra' : '' }}{{ selectedBairro.hasFibra && selectedBairro.hasMovel ? ' + ' : '' }}{{ selectedBairro.hasMovel ? 'Móvel' : '' }}
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">
                  <template v-for="(c, q) in selectedBairro.quadrantCounts" :key="q">
                    <span v-if="QUADRANT_CONFIG[q as Quadrant]"
                      :style="{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'14px',fontWeight:700,padding:'2px 8px 2px 6px',borderRadius:'20px',background:QUADRANT_CONFIG[q as Quadrant].color,color:'#fff'}">
                      <span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.8);display:inline-block;flex-shrink:0;"/>
                      {{ quadrantLabelShort(q) }} {{ c }}
                    </span>
                  </template>
                  <span :style="{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'14px',fontWeight:700,padding:'2px 6px',borderRadius:'20px',border:`1px solid ${trendColor(selectedBairro.dominantTrend)}40`,color:trendColor(selectedBairro.dominantTrend)}">
                    {{ trendArrow(selectedBairro.dominantTrend) }}
                    {{ Math.abs(selectedBairro.trendDelta).toFixed(1) }} pp · {{ trendLabel(selectedBairro.dominantTrend) }}
                  </span>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <p :style="{fontSize:'28px',fontWeight:700,color:detail!.dominantColor,margin:0}">{{ selectedBairro.avgShare }}%</p>
                <p style="font-size:12px;color:#8E8E93;margin:0;">Share Médio Vivo</p>
              </div>
            </div>

            <!-- MiniCards -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <div style="background:#F9F9FB;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:90px;">
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.05em;">População</span>
                <span style="font-size:13px;font-weight:700;color:#1C1C1E;">{{ selectedBairro.totalPopulation ? fmt(selectedBairro.totalPopulation) : "—" }}</span>
              </div>
              <div style="background:#F9F9FB;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:90px;">
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.05em;">Clientes Vivo</span>
                <span style="font-size:13px;font-weight:700;color:#1C1C1E;">{{ fmt(selectedBairro.totalClients) }}</span>
              </div>
              <div style="background:#F9F9FB;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:90px;">
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.05em;">Renda Média</span>
                <span style="font-size:13px;font-weight:700;color:#1C1C1E;">{{ selectedBairro.avgIncome ? `R$ ${fmt(selectedBairro.avgIncome)}` : "—" }}</span>
              </div>
              <div style="background:#F9F9FB;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:90px;">
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.05em;">Satisfação Vivo</span>
                <span style="font-size:13px;font-weight:700;color:#1C1C1E;">{{ selectedBairro.avgVivoScore.toFixed(1) }}</span>
              </div>
              <div style="background:#F9F9FB;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-width:90px;">
                <span style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.05em;">Delta vs. Concorrente</span>
                <span :style="{fontSize:'14px',fontWeight:700,color:detail!.deltaColor}">{{ detail!.deltaVsCompetitor > 0 ? '+' : '' }}{{ detail!.deltaVsCompetitor }}</span>
              </div>
            </div>
          </div>

          <!-- Grid 3 colunas -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">

            <!-- Satisfação SpeedTest -->
            <div style="background:white;border-radius:14px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 4px rgba(0,0,0,0.04);padding:16px;">
              <p style="font-size:13px;font-weight:700;color:#1C1C1E;margin:0 0 12px;">Satisfação SpeedTest (0–10)</p>
              <div
                v-for="row in [{name:'VIVO',score:selectedBairro.avgVivoScore},{name:'TIM',score:selectedBairro.avgTimScore},{name:'CLARO',score:selectedBairro.avgClaroScore}]"
                :key="row.name"
                style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-top:2px;padding-bottom:2px;"
              >
                <span style="font-size:12px;font-weight:700;width:40px;flex-shrink:0;color:#1C1C1E;">{{ row.name }}</span>
                <div style="flex:1;height:7px;background:rgba(0,0,0,0.07);border-radius:4px;overflow:hidden;">
                  <div :style="{height:'100%',borderRadius:'4px',width:`${row.score*10}%`,backgroundColor:OPERATOR_COLORS[row.name]??'#660099',transition:'width 0.4s ease'}" />
                </div>
                <span :style="{fontSize:'14px',fontWeight:700,width:'28px',textAlign:'right',color:OPERATOR_COLORS[row.name]??'#660099'}">{{ row.score }}</span>
              </div>
            </div>

            <!-- Distribuição Comercial -->
            <div style="background:white;border-radius:14px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 4px rgba(0,0,0,0.04);padding:16px;">
              <div style="display:flex;align-items:center;margin-bottom:12px;">
                <p style="font-size:13px;font-weight:700;color:#1C1C1E;margin:0;">Distribuição Comercial</p>
                <span style="margin-left:auto;font-size:12px;color:#8E8E93;">{{ selectedBairro.geohashes.length }} geohashes</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <template v-for="q in QUADRANT_ORDER" :key="q">
                  <div v-if="(selectedBairro.quadrantCounts[q]??0) > 0">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                      <div style="display:flex;align-items:center;gap:5px;">
                        <span :style="{width:'7px',height:'7px',borderRadius:'50%',backgroundColor:QUADRANT_CONFIG[q].color,display:'inline-block'}" />
                        <span :style="{fontSize:'14px',fontWeight:600,color:QUADRANT_CONFIG[q].color}">{{ QUADRANT_LABELS[q] }}</span>
                      </div>
                      <span style="font-size:13px;font-weight:700;color:#1C1C1E;">
                        {{ selectedBairro.quadrantCounts[q] }}
                        <span style="font-size:12px;color:#8E8E93;font-weight:400;">({{ Math.round((selectedBairro.quadrantCounts[q]/selectedBairro.geohashes.length)*100) }}%)</span>
                      </span>
                    </div>
                    <div style="height:5px;background:rgba(0,0,0,0.07);border-radius:3px;overflow:hidden;">
                      <div :style="{height:'100%',borderRadius:'3px',width:`${Math.round((selectedBairro.quadrantCounts[q]/selectedBairro.geohashes.length)*100)}%`,backgroundColor:QUADRANT_CONFIG[q].color,transition:'width 0.4s ease'}" />
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Infraestrutura -->
            <div v-if="detail!.ghsWithC2.length > 0" style="background:white;border-radius:14px;border:1px solid rgba(0,0,0,0.06);box-shadow:0 1px 4px rgba(0,0,0,0.04);padding:16px;">
              <div style="display:flex;align-items:center;margin-bottom:12px;">
                <p style="font-size:13px;font-weight:700;color:#1C1C1E;margin:0;">Infraestrutura</p>
                <span style="margin-left:auto;font-size:12px;color:#8E8E93;">{{ detail!.ghsWithC2.length }}/{{ selectedBairro.geohashes.length }} gh</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <div v-if="selectedBairro.hasFibra && detail!.avgFibraScore !== null">
                  <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
                    </svg>
                    <span style="font-size:13px;font-weight:700;color:#1C1C1E;">Fibra</span>
                    <span style="margin-left:auto;font-size:13px;font-weight:700;color:#1C1C1E;">{{ detail!.avgFibraScore }}<span style="font-size:12px;color:#8E8E93;font-weight:400;">/100</span></span>
                  </div>
                  <div v-for="(cnt, cls) in detail!.fibraClassCounts" :key="cls" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                    <div style="display:flex;align-items:center;gap:5px;">
                      <span :style="{width:'5px',height:'5px',borderRadius:'50%',backgroundColor:FIBRA_COLORS[cls]??'#8E8E93',display:'inline-block'}" />
                      <span style="font-size:13px;color:#3C3C43;">{{ FIBRA_LABELS[cls]??cls }}</span>
                    </div>
                    <span :style="{fontSize:'14px',fontWeight:700,color:FIBRA_COLORS[cls]??'#8E8E93'}">{{ cnt }}</span>
                  </div>
                </div>
                <div v-if="selectedBairro.hasMovel && detail!.avgMovelScore !== null">
                  <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#660099" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    <span style="font-size:13px;font-weight:700;color:#1C1C1E;">Móvel</span>
                    <span style="margin-left:auto;font-size:13px;font-weight:700;color:#1C1C1E;">{{ detail!.avgMovelScore }}<span style="font-size:12px;color:#8E8E93;font-weight:400;">/100</span></span>
                  </div>
                  <div v-for="(cnt, cls) in detail!.movelClassCounts" :key="cls" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                    <div style="display:flex;align-items:center;gap:5px;">
                      <span :style="{width:'5px',height:'5px',borderRadius:'50%',backgroundColor:MOVEL_COLORS[cls]??'#8E8E93',display:'inline-block'}" />
                      <span style="font-size:13px;color:#3C3C43;">{{ MOVEL_LABELS[cls]??cls }}</span>
                    </div>
                    <span :style="{fontSize:'14px',fontWeight:700,color:MOVEL_COLORS[cls]??'#8E8E93'}">{{ cnt }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- fim grid -->
        </div>
      </main>
    </div>
  </div>
</template>
