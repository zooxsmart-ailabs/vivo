<script setup lang="ts">
import { Map as MapIcon, BarChart3, Building2, LogOut } from "lucide-vue-next";
const route = useRoute();
const { logout } = useAuth();
const tabs = [
  { path: "/", label: "Mapa Estratégico", icon: MapIcon },
  { path: "/frentes", label: "Estratégias Growth", icon: BarChart3 },
  { path: "/bairros", label: "Visão por Bairro", icon: Building2 },
];
</script>

<template>
  <div
    class="h-screen flex flex-col overflow-hidden"
    style="font-family: 'DM Sans', sans-serif"
  >
    <header
      class="shrink-0 relative overflow-hidden"
      style="
        background: linear-gradient(135deg, #0f0a1e 0%, #1a0533 40%, #2d0a5c 70%, #1a0533 100%);
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 24px rgba(0, 0, 0, 0.4);
      "
    >
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px opacity-30"
        style="background: linear-gradient(90deg, transparent, #c084fc, #818cf8, transparent)"
      />

      <div class="relative flex items-center justify-between px-6 pt-3 pb-2">
        <div class="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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
          <div class="flex flex-col leading-none">
            <div class="flex items-baseline gap-0">
              <span
                style="
                  font-family: 'Space Grotesk', sans-serif;
                  font-size: 16px;
                  font-weight: 700;
                  letter-spacing: -0.02em;
                  color: rgba(255, 255, 255, 0.95);
                "
                >Geo</span
              >
              <span
                style="
                  font-family: 'Space Grotesk', sans-serif;
                  font-size: 16px;
                  font-weight: 300;
                  letter-spacing: -0.01em;
                  color: rgba(255, 255, 255, 0.55);
                "
                >Intelligence</span
              >
            </div>
            <span
              style="
                font-size: 8px;
                font-weight: 600;
                letter-spacing: 0.15em;
                text-transform: uppercase;
                color: rgba(192, 132, 252, 0.6);
                margin-top: 1px;
              "
              >by Zoox Smart Data</span
            >
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase"
            style="
              background: rgba(192, 132, 252, 0.12);
              border: 1px solid rgba(192, 132, 252, 0.2);
              color: #c084fc;
            "
          >
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live Data
          </div>
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031821263/FMooUMezwbYNuWlt.png"
            alt="Vivo"
            class="h-8 w-auto"
            style="object-fit: contain; filter: brightness(0) invert(1)"
          />
          <button
            class="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150"
            style="
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: rgba(255, 255, 255, 0.35);
            "
            title="Sair"
            @click="logout(); navigateTo('/login')"
            @mouseenter="($event.currentTarget as HTMLElement).style.color = '#fca5a5'; ($event.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; ($event.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'"
          >
            <LogOut class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div class="relative flex gap-0 px-4">
        <NuxtLink v-for="tab in tabs" :key="tab.path" :to="tab.path">
          <button
            class="relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all duration-200"
            :style="{
              color: route.path === tab.path ? '#fff' : 'rgba(255,255,255,0.38)',
            }"
          >
            <span
              :style="{
                color: route.path === tab.path ? '#C084FC' : 'rgba(255,255,255,0.3)',
              }"
            >
              <component :is="tab.icon" class="w-3.5 h-3.5" />
            </span>
            {{ tab.label }}
            <span
              v-if="route.path === tab.path"
              class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
              style="
                background: linear-gradient(90deg, #818cf8, #c084fc);
                box-shadow: 0 0 8px rgba(192, 132, 252, 0.8);
              "
            />
          </button>
        </NuxtLink>
      </div>
    </header>

    <div class="flex-1 overflow-hidden min-h-0">
      <slot />
    </div>
  </div>
</template>
