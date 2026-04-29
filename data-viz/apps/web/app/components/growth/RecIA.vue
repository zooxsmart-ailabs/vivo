<template>
  <div class="space-y-3">
    <!-- Linha 1: Móvel + Fibra lado a lado -->
    <div class="grid grid-cols-2 gap-3">
      <!-- Móvel -->
      <div
        class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-blue-50"
        >
          <span
            class="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-700"
          >M</span>
          <span
            class="text-[10px] font-black text-blue-700 uppercase tracking-wide"
          >
            Móvel
          </span>
        </div>
        <div class="px-3 py-2.5">
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Score de Priorização
          </p>
          <div class="flex items-center gap-2 mb-2">
            <span
              class="text-[18px] font-black leading-none"
              :style="{ color: PRIO_STYLE[rec.prioMovel].color }"
            >{{ (scoreMovel ?? 0).toFixed(1) }}</span>
            <span
              class="text-[8px] font-black px-1.5 py-0.5 rounded-full"
              :style="{
                color: PRIO_STYLE[rec.prioMovel].color,
                backgroundColor: PRIO_STYLE[rec.prioMovel].bg,
                border: '1px solid ' + PRIO_STYLE[rec.prioMovel].border,
              }"
            >{{ rec.prioMovel }} PRIORIDADE</span>
          </div>
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Decisão
          </p>
          <div
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
            :style="techStyle(rec.decisaoMovel)"
          >
            <component
              :is="DECISION_ICONS[rec.decisaoMovel]"
              class="w-3.5 h-3.5"
              :style="{ color: techColor(rec.decisaoMovel) }"
            />
            <span
              class="text-[10px] font-black"
              :style="{ color: techColor(rec.decisaoMovel) }"
            >{{ rec.decisaoMovel }}</span>
          </div>
        </div>
      </div>

      <!-- Fibra -->
      <div
        class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div
          class="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-green-50"
        >
          <span
            class="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[8px] font-black text-green-700"
          >F</span>
          <span
            class="text-[10px] font-black text-green-700 uppercase tracking-wide"
          >
            Fibra
          </span>
        </div>
        <div class="px-3 py-2.5">
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Score de Priorização
          </p>
          <div class="flex items-center gap-2 mb-2">
            <template v-if="(scoreFibra ?? 0) > 0">
              <span
                class="text-[18px] font-black leading-none"
                :style="{ color: PRIO_STYLE[rec.prioFibra].color }"
              >{{ scoreFibra!.toFixed(1) }}</span>
              <span
                class="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                :style="{
                  color: PRIO_STYLE[rec.prioFibra].color,
                  backgroundColor: PRIO_STYLE[rec.prioFibra].bg,
                  border: '1px solid ' + PRIO_STYLE[rec.prioFibra].border,
                }"
              >{{ rec.prioFibra }} PRIORIDADE</span>
            </template>
            <span v-else class="text-[11px] text-slate-400">Sem cobertura</span>
          </div>
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Decisão
          </p>
          <div
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
            :style="techStyle(rec.decisaoFibra)"
          >
            <component
              :is="DECISION_ICONS[rec.decisaoFibra]"
              class="w-3.5 h-3.5"
              :style="{ color: techColor(rec.decisaoFibra) }"
            />
            <span
              class="text-[9px] font-black"
              :style="{ color: techColor(rec.decisaoFibra) }"
            >{{ rec.decisaoFibra }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Linha 2: Totalização -->
    <div
      class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div
        class="flex items-center gap-2 px-3 py-2 border-b border-slate-100"
        :style="{
          background: `linear-gradient(135deg, ${rec.decisaoColor}15, ${rec.decisaoColor}05)`,
        }"
      >
        <BarChart3 class="w-4 h-4" :style="{ color: rec.decisaoColor }" />
        <span
          class="text-[10px] font-black uppercase tracking-wide"
          :style="{ color: rec.decisaoColor }"
        >
          Totalização (Móvel + Fibra)
        </span>
      </div>
      <div class="px-3 py-2.5">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p
              class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
            >
              Score de Priorização
            </p>
            <div class="flex items-center gap-2">
              <span
                class="text-[22px] font-black leading-none"
                :style="{ color: PRIO_STYLE[rec.prioTotal].color }"
              >{{ rec.scoreTotal.toFixed(1) }}</span>
              <span
                class="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                :style="{
                  color: PRIO_STYLE[rec.prioTotal].color,
                  backgroundColor: PRIO_STYLE[rec.prioTotal].bg,
                  border: '1px solid ' + PRIO_STYLE[rec.prioTotal].border,
                }"
              >{{ rec.prioTotal }} PRIORIDADE</span>
            </div>
          </div>
          <div>
            <p
              class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
            >
              Decisão
            </p>
            <div
              class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
              :style="{
                backgroundColor: rec.decisaoColor + '12',
                borderColor: rec.decisaoColor + '40',
              }"
            >
              <component
                :is="DECISION_ICONS[rec.decisao]"
                class="w-4 h-4"
                :style="{ color: rec.decisaoColor }"
              />
              <span
                class="text-[12px] font-black"
                :style="{ color: rec.decisaoColor }"
              >{{ rec.decisao }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Linha 3: Recomendação AI -->
    <div
      class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div
        class="px-3 py-2 border-b border-slate-100 flex items-center gap-2"
        :style="{ background: 'linear-gradient(135deg, #7C3AED15, #7C3AED05)' }"
      >
        <Brain class="w-4 h-4 text-purple-600" />
        <span
          class="text-[10px] font-black text-purple-700 uppercase tracking-wide"
        >
          Recomendação AI
        </span>
        <span class="ml-auto text-[7px] text-slate-400">Gerado automaticamente</span>
      </div>
      <div class="px-3 py-2 space-y-2">
        <div>
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Canal Recomendado
          </p>
          <div
            class="flex items-start gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"
          >
            <ShoppingBag class="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
            <p class="text-[9px] text-slate-700 leading-snug">{{ rec.canal }}</p>
          </div>
        </div>
        <div>
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Abordagem Comercial
          </p>
          <div
            class="flex items-start gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"
          >
            <Zap class="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <p class="text-[9px] text-slate-700 leading-snug">{{ rec.abordagem }}</p>
          </div>
        </div>
        <div>
          <p
            class="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-1"
          >
            Raciocínio
          </p>
          <div
            class="flex items-start gap-2 bg-purple-50 rounded-lg px-2.5 py-1.5 border border-purple-100"
          >
            <Brain class="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
            <p class="text-[9px] text-purple-700 leading-snug">{{ rec.raciocinio }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Brain,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Zap,
} from "lucide-vue-next";
import {
  PRIO_STYLE,
  type AIRec,
  type DecisaoTech,
} from "../../composables/useDiagnostico";

defineProps<{
  rec: AIRec;
  scoreMovel?: number | null;
  scoreFibra?: number | null;
}>();

const DECISION_ICONS: Record<string, any> = {
  ATACAR: CheckCircle2,
  AGUARDAR: AlertTriangle,
};

function techColor(d: DecisaoTech): string {
  return d === "ATACAR" ? "#16A34A" : "#D97706";
}

function techStyle(d: DecisaoTech) {
  const color = techColor(d);
  return { backgroundColor: color + "12", borderColor: color + "40" };
}
</script>
