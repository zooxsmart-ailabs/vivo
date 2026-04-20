<script setup lang="ts">
// MapLegend.vue — Legenda inferior do mapa (layout HORIZONTAL)
// Quadrante em linha horizontal com tooltips de Diagnóstico Bivariado ao clicar
import { QUADRANT_CONFIG, DIAGNOSTICO_BIVARIADO } from "~/utils/goiania";
import type { Quadrant } from "~/utils/goiania";

interface Props {
  activeQuadrants: Quadrant[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  toggleQuadrant: [q: Quadrant];
}>();

const QUADRANT_ORDER: Quadrant[] = ["GROWTH", "UPSELL", "RETENCAO", "GROWTH_RETENCAO"];
const openTooltip = ref<Quadrant | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

function handleClick(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    openTooltip.value = null;
  }
}

onMounted(() => document.addEventListener("mousedown", handleClick));
onUnmounted(() => document.removeEventListener("mousedown", handleClick));

function toggleItem(q: Quadrant) {
  emit("toggleQuadrant", q);
  openTooltip.value = openTooltip.value === q ? null : q;
}
</script>

<template>
  <div
    ref="containerRef"
    style="
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      pointer-events: all;
    "
  >
    <div
      style="
        background: rgba(255,255,255,0.96);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 10px;
        padding: 8px 14px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 4px;
      "
    >
      <span
        style="
          font-size: 10px; font-weight: 700; color: #8E8E93;
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-right: 8px; white-space: nowrap;
        "
      >
        Quadrante
      </span>

      <div
        v-for="q in QUADRANT_ORDER"
        :key="q"
        style="position: relative;"
      >
        <!-- Tooltip de Diagnóstico Bivariado -->
        <div
          v-if="openTooltip === q"
          :style="{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            border: `1px solid ${QUADRANT_CONFIG[q].color}55`,
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#1C1C1E',
            zIndex: 200,
            boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
            pointerEvents: 'none',
            width: '240px',
            whiteSpace: 'normal',
          }"
        >
          <div
            :style="{
              fontSize: '10px', fontWeight: 700,
              color: QUADRANT_CONFIG[q].color, letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: '5px',
            }"
          >
            Diagnóstico Bivariado
          </div>
          <div style="font-size: 12px; color: #3C3C43; line-height: 1.5;">
            <span :style="{ fontWeight: 700, color: QUADRANT_CONFIG[q].color, display: 'block', marginBottom: '3px' }">
              {{ DIAGNOSTICO_BIVARIADO[q].title }}
            </span>
            <span>{{ DIAGNOSTICO_BIVARIADO[q].subtitle }}</span>
          </div>
          <!-- Seta -->
          <div
            :style="{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${QUADRANT_CONFIG[q].color}55`,
            }"
          />
        </div>

        <!-- Item da legenda — pill sólido com dot branco -->
        <button
          :style="{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: activeQuadrants.includes(q) ? QUADRANT_CONFIG[q].color : 'transparent',
            border: activeQuadrants.includes(q) ? 'none' : `1px solid ${QUADRANT_CONFIG[q].color}`,
            cursor: 'pointer', padding: '3px 10px 3px 8px', borderRadius: '20px',
            opacity: activeQuadrants.includes(q) ? 1 : 0.5,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }"
          title="Clique para ver o Diagnóstico Bivariado"
          @click="toggleItem(q)"
        >
          <span
            :style="{
              width: '7px', height: '7px', borderRadius: '50%',
              background: activeQuadrants.includes(q) ? 'rgba(255,255,255,0.8)' : QUADRANT_CONFIG[q].color,
              flexShrink: 0, display: 'inline-block',
            }"
          />
          <span
            :style="{
              fontSize: '12px',
              color: activeQuadrants.includes(q) ? '#fff' : QUADRANT_CONFIG[q].color,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }"
          >
            {{ QUADRANT_CONFIG[q].label }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
