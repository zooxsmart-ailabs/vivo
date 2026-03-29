<template>
  <header class="bg-[var(--vivo-purple)] text-white shadow-md">
    <nav class="container mx-auto px-4 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="text-xl font-bold tracking-tight">
        Vivo GeoIntelligence
      </NuxtLink>

      <div class="flex gap-6">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="text-sm font-medium text-white/80 hover:text-white transition-colors"
          active-class="!text-white underline underline-offset-4"
        >
          {{ link.label }}
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
const links = [
  { to: "/", label: "Mapa Estratégico" },
  { to: "/frentes", label: "Frentes Estratégicas" },
  { to: "/bairros", label: "Visão por Bairro" },
];
</script>
