/// <reference types="@types/google.maps" />

let _mapScriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: typeof google;
  }
}

export function useGoogleMaps() {
  const config = useRuntimeConfig();
  const apiKey = config.public.googleMapsApiKey as string;

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,places,geocoding,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        console.error("Failed to load Google Maps script");
        reject(new Error("Google Maps script failed to load"));
      };
      document.head.appendChild(script);
    });
    return _mapScriptPromise;
  }

  return { loadMapScript };
}
