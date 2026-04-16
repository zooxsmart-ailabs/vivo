<script setup lang="ts">
import { Sparkles, RefreshCw } from "lucide-vue-next";

const props = defineProps<{
  geohashId: string;
  period?: string | null;
}>();

const trpc = useTrpc();

const summary = ref<{ text: string; generatedAt: string } | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

watch(
  () => props.geohashId,
  async (id) => {
    if (!id) return;
    error.value = null;
    loading.value = true;
    try {
      summary.value = await trpc.geohash.iaSummary.query({ geohashId: id });
    } catch {
      summary.value = null;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

async function generate() {
  error.value = null;
  loading.value = true;
  try {
    summary.value = await trpc.geohash.iaGenerate.mutate({
      geohashId: props.geohashId,
      period: props.period ?? undefined,
    });
  } catch (e: unknown) {
    error.value =
      e instanceof Error ? e.message : "Erro ao gerar recomendação.";
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div class="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
    <!-- Header -->
    <div
      class="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2"
      style="background: linear-gradient(135deg, #66009910, #66009904)"
    >
      <Sparkles class="w-3.5 h-3.5 shrink-0" style="color: #660099" />
      <span
        class="text-[10px] font-black uppercase tracking-wider"
        style="color: #660099"
      >
        Resumo Executivo IA
      </span>
      <span class="ml-auto text-[8px] text-slate-300 font-mono">GPT-4o mini</span>
    </div>

    <!-- Sem summary -->
    <div
      v-if="!summary && !loading && !error"
      class="px-4 py-5 flex flex-col items-center gap-3"
    >
      <p class="text-[10px] text-slate-400 text-center leading-relaxed">
        Nenhum resumo gerado para este geohash.
      </p>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-opacity hover:opacity-80"
        style="background: #660099"
        @click="generate"
      >
        <Sparkles class="w-3 h-3" />
        Gerar Recomendação IA
      </button>
    </div>

    <!-- Carregando -->
    <div
      v-else-if="loading"
      class="px-4 py-6 flex flex-col items-center gap-2"
    >
      <div
        class="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
        style="border-color: #66009940; border-top-color: #660099"
      />
      <p class="text-[10px] text-slate-400">Gerando resumo executivo...</p>
    </div>

    <!-- Erro -->
    <div
      v-else-if="error"
      class="px-4 py-4 flex flex-col items-center gap-2"
    >
      <p class="text-[10px] text-red-500 font-semibold text-center">
        {{ error }}
      </p>
      <button
        class="text-[10px] font-bold underline"
        style="color: #660099"
        @click="generate"
      >
        Tentar novamente
      </button>
    </div>

    <!-- Summary -->
    <div v-else-if="summary" class="px-3 py-3 flex flex-col gap-2.5">
      <div
        class="rounded-lg px-3 py-2.5 border"
        style="background: #6600990a; border-color: #66009920"
      >
        <p
          class="text-[11px] leading-relaxed"
          style="color: #3b0764"
        >
          {{ summary.text }}
        </p>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[8px] text-slate-300">
          Gerado em {{ formatDate(summary.generatedAt) }}
        </span>
        <button
          class="flex items-center gap-1 text-[9px] font-bold text-slate-400 transition-colors hover:text-purple-700"
          :disabled="loading"
          @click="generate"
        >
          <RefreshCw class="w-2.5 h-2.5" />
          Nova recomendação
        </button>
      </div>
    </div>
  </div>
</template>
