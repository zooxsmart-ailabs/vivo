<script setup lang="ts">
import { AlertCircle, Home } from "lucide-vue-next";
</script>

<template>
  <div
    class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
  >
    <div
      class="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-xl"
    >
      <div class="pt-8 pb-8 px-6 text-center">
        <div class="flex justify-center mb-6">
          <div class="relative">
            <div class="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
            <AlertCircle class="relative h-16 w-16 text-red-500" />
          </div>
        </div>
        <h1 class="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <h2 class="text-xl font-semibold text-slate-700 mb-4">
          Página não encontrada
        </h2>
        <p class="text-slate-600 mb-8 leading-relaxed">
          A página que você procura não existe.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink
            to="/"
            class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Home class="w-4 h-4 mr-2" />
            Ir para o início
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
