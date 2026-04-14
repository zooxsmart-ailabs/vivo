<script setup lang="ts">
import { ref } from "vue";
import { Lock, User, AlertCircle, LogIn } from "lucide-vue-next";

definePageMeta({ layout: "fullscreen" });

const { login } = useAuth();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const showPassword = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;

  const ok = await login(username.value, password.value);
  loading.value = false;

  if (ok) {
    await navigateTo("/");
  } else {
    error.value = "Usuário ou senha incorretos.";
    password.value = "";
  }
}
</script>

<template>
  <div
    class="flex-1 flex items-center justify-center p-6"
    style="
      background: linear-gradient(
        160deg,
        #0f0a1e 0%,
        #1a0533 35%,
        #0f172a 70%,
        #0a0a1a 100%
      );
    "
  >
    <!-- Glow decorativo -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden" style="z-index: 0">
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style="
          background: radial-gradient(
            circle,
            rgba(192, 132, 252, 0.07) 0%,
            transparent 70%
          );
        "
      />
    </div>

    <div class="relative w-full max-w-sm" style="z-index: 1">
      <!-- Card -->
      <div
        class="rounded-2xl overflow-hidden"
        style="
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
        "
      >
        <!-- Cabeçalho do card -->
        <div
          class="px-8 pt-8 pb-6 text-center"
          style="border-bottom: 1px solid rgba(255, 255, 255, 0.06)"
        >
          <div class="flex justify-center mb-4">
            <div
              class="w-14 h-14 rounded-2xl flex items-center justify-center"
              style="
                background: linear-gradient(
                  135deg,
                  rgba(129, 140, 248, 0.2),
                  rgba(192, 132, 252, 0.2)
                );
                border: 1px solid rgba(192, 132, 252, 0.25);
              "
            >
              <Lock class="w-6 h-6" style="color: #c084fc" />
            </div>
          </div>
          <h1
            class="text-lg font-bold text-white mb-1"
            style="
              font-family: 'Space Grotesk', sans-serif;
              letter-spacing: -0.02em;
            "
          >
            Acesso Restrito
          </h1>
          <p class="text-xs" style="color: rgba(255, 255, 255, 0.35)">
            Informe suas credenciais para continuar
          </p>
        </div>

        <!-- Formulário -->
        <form class="px-8 py-6 space-y-4" @submit.prevent="handleSubmit">
          <!-- Usuário -->
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-semibold uppercase tracking-wider"
              style="color: rgba(255, 255, 255, 0.45)"
            >
              Usuário
            </label>
            <div class="relative">
              <User
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style="color: rgba(255, 255, 255, 0.25)"
              />
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                required
                placeholder="usuário"
                class="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                style="
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  color: rgba(255, 255, 255, 0.9);
                  caret-color: #c084fc;
                "
                @focus="
                  ($event.target as HTMLElement).style.borderColor =
                    'rgba(192,132,252,0.5)'
                "
                @blur="
                  ($event.target as HTMLElement).style.borderColor =
                    'rgba(255,255,255,0.1)'
                "
              />
            </div>
          </div>

          <!-- Senha -->
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-semibold uppercase tracking-wider"
              style="color: rgba(255, 255, 255, 0.45)"
            >
              Senha
            </label>
            <div class="relative">
              <Lock
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style="color: rgba(255, 255, 255, 0.25)"
              />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                style="
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  color: rgba(255, 255, 255, 0.9);
                  caret-color: #c084fc;
                "
                @focus="
                  ($event.target as HTMLElement).style.borderColor =
                    'rgba(192,132,252,0.5)'
                "
                @blur="
                  ($event.target as HTMLElement).style.borderColor =
                    'rgba(255,255,255,0.1)'
                "
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider transition-colors"
                style="color: rgba(255, 255, 255, 0.25)"
                @mouseenter="
                  ($event.target as HTMLElement).style.color =
                    'rgba(192,132,252,0.8)'
                "
                @mouseleave="
                  ($event.target as HTMLElement).style.color =
                    'rgba(255,255,255,0.25)'
                "
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "ocultar" : "ver" }}
              </button>
            </div>
          </div>

          <!-- Erro -->
          <div
            v-if="error"
            class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
            style="
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.2);
              color: #fca5a5;
            "
          >
            <AlertCircle class="w-3.5 h-3.5 shrink-0" />
            {{ error }}
          </div>

          <!-- Botão -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 mt-2"
            style="
              background: linear-gradient(135deg, #818cf8, #c084fc);
              color: white;
              letter-spacing: -0.01em;
              box-shadow: 0 4px 16px rgba(192, 132, 252, 0.3);
            "
          >
            <span
              v-if="loading"
              class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            />
            <LogIn v-else class="w-4 h-4" />
            {{ loading ? "Verificando..." : "Entrar" }}
          </button>
        </form>
      </div>

      <!-- Rodapé -->
      <p
        class="text-center text-[10px] mt-5"
        style="color: rgba(255, 255, 255, 0.18)"
      >
        GeoIntelligence · Zoox Smart Data × Vivo
      </p>
    </div>
  </div>
</template>
