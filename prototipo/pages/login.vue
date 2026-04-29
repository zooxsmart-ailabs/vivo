<script setup lang="ts">
// Login — GeoIntelligence Vivo × Zoox
// Design: Vivo Brand × Apple iOS Clean Light
definePageMeta({ layout: "fullscreen" });

import { Eye, EyeOff, Lock, User } from "lucide-vue-next";
const { login, isAuthenticated } = useAuth();

if (isAuthenticated.value) navigateTo("/");

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;
  await new Promise((r) => setTimeout(r, 200));
  const ok = login(username.value, password.value);
  if (ok) {
    navigateTo("/");
  } else {
    error.value = "Usuário ou senha incorretos. Tente novamente.";
    loading.value = false;
  }
}
</script>

<template>
  <div
    style="
      min-height: 100vh;
      background: #F2F2F7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Nunito Sans', 'DM Sans', -apple-system, sans-serif;
      padding: 24px;
    "
  >
    <!-- Background subtle pattern -->
    <div
      style="
        position: fixed;
        inset: 0;
        background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(102,0,153,0.07) 0%, transparent 70%);
        pointer-events: none;
      "
    />

    <!-- Login card -->
    <div
      style="
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
        border: 1px solid rgba(0,0,0,0.06);
        width: 100%;
        max-width: 380px;
        padding: 40px 36px 36px;
        position: relative;
        z-index: 1;
      "
    >
      <!-- Logo + Brand -->
      <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 32px; gap: 12px;">
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031821263/FMooUMezwbYNuWlt.png"
          alt="Vivo"
          style="height: 32px; width: auto; object-fit: contain;"
        />
        <div style="width: 32px; height: 1px; background: rgba(0,0,0,0.1);" />
        <div style="text-align: center;">
          <div style="font-size: 15px; font-weight: 700; color: #1C1C1E; letter-spacing: 0.06em;">GEOINTELLIGENCE</div>
          <div style="font-size: 11px; color: #8E8E93; margin-top: 2px;">by Zoox Smart Data</div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Username -->
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8E8E93; display: flex; align-items: center;">
            <User :size="15" />
          </div>
          <input
            v-model="username"
            type="text"
            placeholder="Usuário"
            autocomplete="username"
            class="geo-input"
            style="
              width: 100%;
              padding: 11px 12px 11px 36px;
              background: #F2F2F7;
              border: 1px solid rgba(0,0,0,0.1);
              border-radius: 10px;
              font-size: 14px;
              color: #1C1C1E;
              outline: none;
              transition: border-color 0.15s ease, box-shadow 0.15s ease;
              box-sizing: border-box;
              font-family: inherit;
            "
            @focus="($event.target as HTMLInputElement).style.borderColor = '#660099'; ($event.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(102,0,153,0.1)'; ($event.target as HTMLInputElement).style.background = '#fff';"
            @blur="($event.target as HTMLInputElement).style.borderColor = 'rgba(0,0,0,0.1)'; ($event.target as HTMLInputElement).style.boxShadow = 'none'; ($event.target as HTMLInputElement).style.background = '#F2F2F7';"
          />
        </div>

        <!-- Password -->
        <div style="position: relative;">
          <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #8E8E93; display: flex; align-items: center;">
            <Lock :size="15" />
          </div>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Digite sua senha"
            autocomplete="current-password"
            style="
              width: 100%;
              padding: 11px 40px 11px 36px;
              background: #F2F2F7;
              border: 1px solid rgba(0,0,0,0.1);
              border-radius: 10px;
              font-size: 14px;
              color: #1C1C1E;
              outline: none;
              transition: border-color 0.15s ease, box-shadow 0.15s ease;
              box-sizing: border-box;
              font-family: inherit;
            "
            @focus="($event.target as HTMLInputElement).style.borderColor = '#660099'; ($event.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(102,0,153,0.1)'; ($event.target as HTMLInputElement).style.background = '#fff';"
            @blur="($event.target as HTMLInputElement).style.borderColor = 'rgba(0,0,0,0.1)'; ($event.target as HTMLInputElement).style.boxShadow = 'none'; ($event.target as HTMLInputElement).style.background = '#F2F2F7';"
          />
          <button
            type="button"
            style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #8E8E93; cursor: pointer; display: flex; align-items: center; padding: 2px;"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" :size="15" />
            <Eye v-else :size="15" />
          </button>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          style="
            background: rgba(255,59,48,0.08);
            border: 1px solid rgba(255,59,48,0.2);
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 13px;
            color: #D70015;
            text-align: center;
          "
        >
          {{ error }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading || !username || !password"
          :style="{
            marginTop: '8px',
            width: '100%',
            padding: '13px',
            background: (loading || !username || !password) ? '#C7A3D9' : '#660099',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: (loading || !username || !password) ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
            letterSpacing: '0.01em',
            fontFamily: 'inherit',
          }"
        >
          <span v-if="loading" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin-icon">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Entrando...
          </span>
          <span v-else>Entrar</span>
        </button>
      </form>

      <!-- Footer -->
      <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #C7C7CC;">
        Vivo × Zoox Smart Data · Uso interno
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-icon { animation: spin 0.8s linear infinite; }
</style>
