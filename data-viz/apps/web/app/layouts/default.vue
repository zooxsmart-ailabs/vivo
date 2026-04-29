<script setup lang="ts">
import { Map as MapIcon, MapPin, BarChart3, Building2, LogOut } from "lucide-vue-next";

const route = useRoute();
const { logout } = useAuth();

const tabs = [
  { path: "/", label: "Mapa Estratégico", icon: MapIcon },
  { path: "/frentes", label: "Estratégias Growth", icon: BarChart3 },
  { path: "/bairros", label: "Visão por Bairro", icon: Building2 },
];

async function handleLogout() {
  await logout();
  await navigateTo("/login");
}
</script>

<template>
  <div
    class="h-screen flex flex-col overflow-hidden"
    style="font-family: 'Nunito Sans', 'DM Sans', -apple-system, sans-serif; background: #F2F2F7"
  >
    <header
      style="
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(0,0,0,0.08);
        height: 52px;
        display: flex;
        align-items: center;
        padding-left: 16px;
        padding-right: 16px;
        position: sticky;
        top: 0;
        z-index: 50;
        gap: 0;
        flex-shrink: 0;
      "
    >
      <!-- Brand -->
      <div
        style="display:flex;align-items:center;gap:10px;margin-right:20px;flex-shrink:0;"
      >
        <span
          style="font-size:13px;font-weight:700;color:#660099;font-family:'Nunito Sans',sans-serif;letter-spacing:0.04em;"
        >
          VIVO
        </span>
        <div style="width:1px;height:16px;background:rgba(0,0,0,0.15);" />
        <span
          style="font-size:13px;font-weight:600;color:#1C1C1E;font-family:'Nunito Sans',sans-serif;letter-spacing:0.04em;"
        >
          GEOINTELLIGENCE
        </span>
      </div>

      <nav style="display:flex;align-items:center;gap:2px;flex:1;">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.path"
          :to="tab.path"
          :data-cy="`nav-${tab.path === '/' ? 'mapa' : tab.path.slice(1)}`"
          style="text-decoration:none;"
        >
          <button
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: route.path === tab.path ? '600' : '400',
              color: route.path === tab.path ? '#660099' : '#6E6E73',
              background: route.path === tab.path ? 'rgba(102,0,153,0.08)' : 'transparent',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              border: 'none',
              outline: 'none',
              fontFamily: '\'Nunito Sans\', sans-serif',
            }"
          >
            <component :is="tab.icon" :size="14" />
            {{ tab.label }}
          </button>
        </NuxtLink>
      </nav>

      <div
        style="display:flex;align-items:center;gap:5px;padding:5px 12px;background:rgba(102,0,153,0.06);border-radius:8px;border:1px solid rgba(102,0,153,0.12);flex-shrink:0;"
      >
        <MapPin :size="12" color="#660099" />
        <span style="font-size:12px;font-weight:600;color:#660099;">Goiânia - GO</span>
      </div>

      <button
        title="Sair da plataforma"
        style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:transparent;border:none;cursor:pointer;color:#8E8E93;flex-shrink:0;margin-left:6px;transition:all 0.15s ease;"
        @click="handleLogout"
      >
        <LogOut :size="15" />
      </button>
    </header>

    <div class="flex-1 overflow-hidden min-h-0">
      <slot />
    </div>
  </div>
</template>
