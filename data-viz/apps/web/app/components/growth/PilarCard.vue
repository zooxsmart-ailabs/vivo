<template>
  <div class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-2 border-b border-slate-100"
      :style="{ backgroundColor: style.bg }"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black"
          :style="{ backgroundColor: style.dot }"
        >
          {{ pilar.id }}
        </div>
        <div class="flex items-center gap-1.5" :style="{ color: style.text }">
          <component :is="ICONS[pilar.id]" class="w-3.5 h-3.5" />
          <span class="text-[11px] font-black uppercase tracking-wide">{{ pilar.title }}</span>
        </div>
      </div>
      <span
        class="text-[8px] font-bold px-2 py-0.5 rounded-full text-white"
        :style="{ backgroundColor: style.dot }"
      >
        {{ style.label }}
      </span>
    </div>

    <!-- Métricas -->
    <div class="p-2 space-y-1.5">
      <div
        v-for="(m, i) in pilar.metricas"
        :key="i"
        class="rounded-lg border px-3 py-2"
        :style="{ backgroundColor: SIG_STYLES[m.signal].bg, borderColor: SIG_STYLES[m.signal].border }"
      >
        <div class="flex items-start justify-between gap-2 mb-1">
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-700 leading-tight">{{ m.label }}</p>
            <p class="text-[8px] text-slate-400 leading-tight mt-0.5">{{ m.formula }}</p>
          </div>
          <p class="text-[11px] font-black shrink-0" :style="{ color: SIG_STYLES[m.signal].text }">
            {{ INFRA_LABELS[m.value] ?? m.value }}
          </p>
        </div>
        <p class="text-[8.5px] font-medium leading-tight" :style="{ color: SIG_STYLES[m.signal].text }">
          {{ m.detail }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star, TrendingUp, Layers, ShoppingBag } from "lucide-vue-next";
import { SIG_STYLES, type PilarResult } from "../../composables/useDiagnostico";

const props = defineProps<{ pilar: PilarResult }>();

const ICONS: Record<string, any> = {
  "01": Star,
  "02": TrendingUp,
  "03": Layers,
  "04": ShoppingBag,
};

const INFRA_LABELS: Record<string, string> = {
  SAUDAVEL: "Saudável",
  AUMENTO_CAPACIDADE: "Aumento de Capacidade",
  EXPANSAO_NOVA_AREA: "Expansão Nova Área",
  MELHORA_QUALIDADE: "Melhora na Qualidade",
  EXPANSAO_5G: "Expansão 5G",
  EXPANSAO_4G: "Expansão 4G",
};

const style = computed(() => SIG_STYLES[props.pilar.signal]);
</script>
