<template>
  <div
    class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm"
  >
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
          <span class="text-[11px] font-black uppercase tracking-wide">{{
            pilar.title
          }}</span>
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
        :style="{
          backgroundColor: SIG_STYLES[m.signal].bg,
          borderColor: SIG_STYLES[m.signal].border,
        }"
      >
        <div class="flex items-start justify-between gap-2 mb-1">
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-700 leading-tight">
              {{ m.label }}
            </p>
            <p class="text-[8px] text-slate-400 leading-tight mt-0.5">
              {{ m.formula }}
            </p>
          </div>
          <p
            class="text-[11px] font-black shrink-0"
            :style="{ color: SIG_STYLES[m.signal].text }"
          >
            {{ INFRA_LABELS[m.value] ?? m.value }}
          </p>
        </div>
        <p
          class="text-[8.5px] font-medium leading-tight"
          :style="{ color: SIG_STYLES[m.signal].text }"
        >
          {{ m.detail }}
        </p>
      </div>

      <!-- Tabela comparativa de concorrentes (apenas no pilar 02) -->
      <div
        v-if="pilar.id === '02' && concorrentes && concorrentes.length"
        class="rounded-lg border border-slate-200 overflow-hidden"
      >
        <div
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-200"
        >
          <TrendingUp class="w-3 h-3 text-slate-400" />
          <span
            class="text-[8px] font-bold text-slate-500 uppercase tracking-wider"
          >
            Comparativo de Concorrência
          </span>
        </div>
        <table class="w-full text-[8px]">
          <thead>
            <tr class="border-b border-slate-100">
              <th
                class="text-left px-3 py-1.5 font-bold text-slate-500"
                rowspan="2"
              >
                Operadora
              </th>
              <th
                colspan="2"
                class="text-center px-2 py-1 font-bold text-green-700 bg-green-50 border-b border-green-100 border-l border-green-100"
              >
                <span class="flex items-center justify-center gap-1">
                  <span
                    class="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center text-[6px] font-black text-green-700"
                  >F</span>
                  Fibra
                </span>
              </th>
              <th
                colspan="2"
                class="text-center px-2 py-1 font-bold text-blue-700 bg-blue-50 border-b border-blue-100 border-l border-blue-100"
              >
                <span class="flex items-center justify-center gap-1">
                  <span
                    class="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center text-[6px] font-black text-blue-700"
                  >M</span>
                  Móvel
                </span>
              </th>
            </tr>
            <tr class="border-b border-slate-100 bg-slate-50">
              <th
                class="text-center px-2 py-1.5 font-bold text-slate-500 border-l border-slate-100"
              >
                Cobertura
              </th>
              <th class="text-right px-2 py-1.5 font-bold text-slate-500">
                Valor
              </th>
              <th
                class="text-center px-2 py-1.5 font-bold text-slate-500 border-l border-slate-100"
              >
                Cobertura
              </th>
              <th class="text-right px-3 py-1.5 font-bold text-slate-500">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(c, ci) in concorrentes"
              :key="ci"
              class="border-b border-slate-50 last:border-0"
              :class="ci % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'"
            >
              <td class="px-3 py-1.5 font-black text-slate-700">{{ c.nome }}</td>
              <td
                class="px-2 py-1.5 text-center border-l border-slate-100"
              >
                <span
                  class="inline-block px-1.5 py-0.5 rounded-full text-[7px] font-bold"
                  :class="
                    c.coberturaFibra
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-400'
                  "
                >{{ c.coberturaFibra ? "Sim" : "Não" }}</span>
              </td>
              <td class="px-2 py-1.5 text-right font-bold text-slate-700">
                <template v-if="c.coberturaFibra && c.precoFibra">
                  <span class="block text-[8px] font-black text-slate-700">
                    R$ {{ c.precoFibra.toFixed(2).replace(".", ",") }}
                  </span>
                  <span class="block text-[7px] text-slate-400">{{ c.planoFibra }}</span>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-2 py-1.5 text-center border-l border-slate-100">
                <span
                  class="inline-block px-1.5 py-0.5 rounded-full text-[7px] font-bold"
                  :class="
                    c.coberturaMovel
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-400'
                  "
                >{{ c.coberturaMovel ? "Sim" : "Não" }}</span>
              </td>
              <td class="px-3 py-1.5 text-right font-bold text-slate-700">
                <template v-if="c.coberturaMovel && c.precoMovel">
                  <span class="block text-[8px] font-black text-slate-700">
                    R$ {{ c.precoMovel.toFixed(2).replace(".", ",") }}
                  </span>
                  <span class="block text-[7px] text-slate-400">{{ c.planoMovel }}</span>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star, TrendingUp, Layers, ShoppingBag } from "lucide-vue-next";
import {
  SIG_STYLES,
  INFRA_LABELS,
  type PilarResult,
} from "../../composables/useDiagnostico";

export interface ConcorrenteRow {
  nome: string;
  coberturaFibra: boolean;
  precoFibra?: number | null;
  planoFibra?: string | null;
  coberturaMovel: boolean;
  precoMovel?: number | null;
  planoMovel?: string | null;
}

const props = defineProps<{
  pilar: PilarResult;
  concorrentes?: ConcorrenteRow[] | null;
}>();

const ICONS: Record<string, any> = {
  "01": Star,
  "02": TrendingUp,
  "03": Layers,
  "04": ShoppingBag,
};

const style = computed(() => SIG_STYLES[props.pilar.signal]);
</script>
