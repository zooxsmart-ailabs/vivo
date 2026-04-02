<template>
  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
    <!-- Header -->
    <div
      class="px-4 py-3 border-b border-slate-100 flex items-center gap-2"
      :style="{ background: `linear-gradient(135deg, ${rec.decisaoColor}15, ${rec.decisaoColor}05)` }"
    >
      <Brain class="w-4 h-4 text-purple-600" />
      <span class="text-[11px] font-black text-slate-700 uppercase tracking-wide">Recomendação IA</span>
      <span class="ml-auto text-[8px] text-slate-400">Gerado automaticamente</span>
    </div>

    <!-- Decisão -->
    <div class="px-4 py-3 border-b border-slate-100">
      <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decisão</p>
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-lg border"
        :style="{ backgroundColor: rec.decisaoColor + '12', borderColor: rec.decisaoColor + '40' }"
      >
        <component :is="DECISION_ICONS[rec.decisao]" class="w-5 h-5" :style="{ color: rec.decisaoColor }" />
        <span class="text-[14px] font-black" :style="{ color: rec.decisaoColor }">{{ rec.decisao }}</span>
      </div>
    </div>

    <!-- Canal Recomendado -->
    <div class="px-4 py-3 border-b border-slate-100">
      <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Canal Recomendado</p>
      <div class="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
        <ShoppingBag class="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
        <p class="text-[10px] text-slate-700 leading-snug">{{ rec.canal }}</p>
      </div>
    </div>

    <!-- Abordagem Comercial -->
    <div class="px-4 py-3 border-b border-slate-100">
      <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Abordagem Comercial</p>
      <div class="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
        <Zap class="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
        <p class="text-[10px] text-slate-700 leading-snug">{{ rec.abordagem }}</p>
      </div>
    </div>

    <!-- Raciocínio -->
    <div class="px-4 py-3 flex-1">
      <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Raciocínio</p>
      <div class="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
        <Brain class="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
        <p class="text-[10px] text-purple-700 leading-snug">{{ rec.raciocinio }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  ShoppingBag,
  Zap,
} from "lucide-vue-next";
import type { AIRec } from "../../composables/useDiagnostico";

defineProps<{ rec: AIRec }>();

const DECISION_ICONS: Record<string, any> = {
  ATIVAR: CheckCircle2,
  AGUARDAR: AlertTriangle,
  BLOQUEADO: TrendingDown,
};
</script>
