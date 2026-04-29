/**
 * Carregamento singleton do Google Maps API.
 * Garante que o script é inserido apenas uma vez, mesmo com HMR ou múltiplas chamadas.
 *
 * Estratégia:
 *  1. Se runtimeConfig.public.googleMapsKey está setado → usa direto a API do Google.
 *  2. Senão → cai pro proxy Manus/Forge (útil em dev, espelha o protótipo).
 */

const FORGE_API_KEY = "F8LqzcZRQzDZYMiNishE9a";
const FORGE_BASE_URL = "https://forge.manus.ai";

let _promise: Promise<void> | null = null;

export function useGoogleMaps() {
  const config = useRuntimeConfig();

  function load(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.google?.maps?.Map) return Promise.resolve();
    if (_promise) return _promise;

    const existing = document.querySelector('script[src*="maps/api/js"]');
    if (existing) {
      _promise = new Promise<void>((resolve) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        if (window.google?.maps?.Map) resolve();
      });
      return _promise;
    }

    const directKey = (config.public.googleMapsKey as string) || "";
    const url = directKey
      ? `https://maps.googleapis.com/maps/api/js?key=${directKey}&v=weekly&libraries=marker,geometry`
      : `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/js?key=${FORGE_API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;

    _promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        _promise = null;
        reject(new Error("Falha ao carregar o Google Maps"));
      };
      document.head.appendChild(script);
    });

    return _promise;
  }

  return { load };
}
