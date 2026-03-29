<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-4">
      Frentes Estratégicas
    </h1>
    <p class="text-gray-600">
      4 estratégias (Retenção, Upsell, Growth, Expansão) com fluxos de 3
      colunas e ranking de geohashes.
    </p>
    <div
      class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <div
        v-for="strategy in strategies"
        :key="strategy"
        class="p-6 bg-white rounded-lg shadow text-center"
      >
        <h2 class="text-lg font-semibold text-gray-800">{{ strategy }}</h2>
        <p class="text-sm text-gray-500 mt-2">Em construção</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const strategies = ["Retenção", "Upsell", "Growth", "Expansão"];
</script>
