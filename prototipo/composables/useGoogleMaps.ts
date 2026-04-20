/// <reference types="@types/google.maps" />
// useGoogleMaps.ts — GeoIntelligence Vivo × Zoox
// Estratégia: usa chave direta do Google Maps quando NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
// está disponível (GitHub Pages). Fallback para proxy Manus em dev local.

// Lê a chave do window.__NUXT__ que o Nuxt SSG injeta no HTML
function getGoogleMapsKey(): string {
  if (typeof window !== "undefined") {
    try {
      const nuxtState = (window as any).__NUXT__;
      if (nuxtState?.config?.public?.googleMapsApiKey) {
        return nuxtState.config.public.googleMapsApiKey as string;
      }
    } catch {
      // ignora
    }
  }
  return "";
}

const FORGE_API_KEY = "F8LqzcZRQzDZYMiNishE9a";
const FORGE_BASE_URL = "https://forge.manus.ai";

let _mapScriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: typeof google;
  }
}

export function useGoogleMaps() {
  function loadMapScript(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.google?.maps) return Promise.resolve();
    if (_mapScriptPromise) return _mapScriptPromise;

    const existing = document.querySelector(`script[src*="maps/api/js"]`);
    if (existing) {
      _mapScriptPromise = new Promise<void>((resolve) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        if (window.google?.maps) resolve();
      });
      return _mapScriptPromise;
    }

    // Determina a URL: chave direta do Google ou proxy Manus
    const directKey = getGoogleMapsKey();
    let mapsUrl: string;
    if (directKey) {
      // Chave direta do Google Maps (sem proxy) — para GitHub Pages
      mapsUrl = `https://maps.googleapis.com/maps/api/js?key=${directKey}&v=weekly&libraries=marker,places,geocoding,geometry`;
    } else {
      // Proxy Manus — para dev local e ambientes Manus
      mapsUrl = `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/js?key=${FORGE_API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    }

    _mapScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = mapsUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        console.error("Failed to load Google Maps script:", mapsUrl);
        _mapScriptPromise = null;
        reject(new Error("Google Maps script failed to load"));
      };
      document.head.appendChild(script);
    });

    return _mapScriptPromise;
  }

  return { loadMapScript };
}
