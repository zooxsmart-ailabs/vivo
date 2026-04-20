/// <reference types="@types/google.maps" />
// useGoogleMaps.ts — GeoIntelligence Vivo × Zoox
// Usa constantes fixas para evitar problema de criptografia do Nuxt SSG
// que substitui valores de runtimeConfig.public no bundle.

const FORGE_API_KEY = "F8LqzcZRQzDZYMiNishE9a";
const FORGE_BASE_URL = "https://forge.manus.ai";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

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

    _mapScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${FORGE_API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
      script.crossOrigin = "anonymous";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        console.error("Failed to load Google Maps script");
        _mapScriptPromise = null;
        reject(new Error("Google Maps script failed to load"));
      };
      document.head.appendChild(script);
    });
    return _mapScriptPromise;
  }

  return { loadMapScript };
}
