<template>
  <header
    class="shrink-0 relative overflow-hidden"
    :style="{
      background: 'linear-gradient(135deg, #0F0A1E 0%, #1A0533 40%, #2D0A5C 70%, #1A0533 100%)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
    }"
  >
    <!-- Noise texture overlay -->
    <div
      class="absolute inset-0 opacity-[0.03] pointer-events-none"
      :style="noiseStyle"
    />

    <!-- Glowing top line -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px opacity-30"
      style="background: linear-gradient(90deg, transparent, #C084FC, #818CF8, transparent)"
    />

    <!-- Top row: wordmark + badge + Vivo logo -->
    <div class="relative flex items-center justify-between px-6 pt-3 pb-2">
      <!-- GeoIntelligence wordmark -->
      <div class="flex items-center gap-3">
        <!-- Hexagonal icon -->
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hex-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#818CF8" />
              <stop offset="100%" stop-color="#C084FC" />
            </linearGradient>
          </defs>
          <path
            d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
            fill="url(#hex-grad)"
            fill-opacity="0.15"
            stroke="url(#hex-grad)"
            stroke-width="1.2"
          />
          <circle cx="16" cy="13" r="3.5" stroke="url(#hex-grad)" stroke-width="1.5" fill="none" />
          <path d="M16 16.5V22" stroke="url(#hex-grad)" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="16" cy="13" r="1.2" fill="url(#hex-grad)" />
        </svg>

        <!-- Text -->
        <div class="flex flex-col leading-none">
          <div class="flex items-baseline gap-0">
            <span
              :style="{
                fontFamily: '\'Space Grotesk\', sans-serif',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'rgba(255,255,255,0.95)',
              }"
            >
              Geo
            </span>
            <span
              :style="{
                fontFamily: '\'Space Grotesk\', sans-serif',
                fontSize: '16px',
                fontWeight: 300,
                letterSpacing: '-0.01em',
                color: 'rgba(255,255,255,0.55)',
              }"
            >
              Intelligence
            </span>
          </div>
          <span
            :style="{
              fontSize: '8px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(192,132,252,0.6)',
              marginTop: '1px',
            }"
          >
            by Zoox Smart Data
          </span>
        </div>
      </div>

      <!-- Right: Live Data badge + logout + Vivo logo -->
      <div class="flex items-center gap-4">
        <div
          v-if="!isLoginPage"
          class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase"
          :style="{
            background: 'rgba(192,132,252,0.12)',
            border: '1px solid rgba(192,132,252,0.2)',
            color: '#C084FC',
          }"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live Data
        </div>
        <button
          v-if="!isLoginPage"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors duration-150"
          :style="{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.45)',
          }"
          title="Sair"
          @click="handleLogout"
        >
          <LogOut class="w-3.5 h-3.5" />
          Sair
        </button>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031821263/FMooUMezwbYNuWlt.png"
          alt="Vivo"
          class="h-8 w-auto"
          :style="{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }"
        />
      </div>
    </div>

    <!-- Tab navigation -->
    <div v-if="!isLoginPage" class="relative flex gap-0 px-4">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        :data-cy="`nav-${tab.path === '/' ? 'mapa' : tab.path.slice(1)}`"
        class="relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all duration-200 no-underline"
        :style="{
          color: isActive(tab.path) ? '#fff' : 'rgba(255,255,255,0.38)',
        }"
      >
        <component
          :is="tab.icon"
          class="w-3.5 h-3.5"
          :style="{ color: isActive(tab.path) ? '#C084FC' : 'rgba(255,255,255,0.3)' }"
        />

        {{ tab.label }}

        <!-- Active indicator bar -->
        <span
          v-if="isActive(tab.path)"
          class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
          :style="{
            background: 'linear-gradient(90deg, #818CF8, #C084FC)',
            boxShadow: '0 0 8px rgba(192,132,252,0.8)',
          }"
        />
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Map, BarChart3, Building2, LogOut } from "lucide-vue-next";

const route = useRoute();
const { logout } = useAuth();

const noiseStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
};

const tabs = [
  { path: "/", label: "Mapa Estratégico", icon: Map },
  { path: "/frentes", label: "Estratégias Growth", icon: BarChart3 },
  { path: "/bairros", label: "Visão por Bairro", icon: Building2 },
];

const isLoginPage = computed(() => route.path === "/login");

function isActive(path: string): boolean {
  return route.path === path;
}

async function handleLogout() {
  logout();
  await navigateTo("/login");
}
</script>
