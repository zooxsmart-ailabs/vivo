/**
 * Carregamento singleton do Google Maps API.
 * Garante que o script é inserido apenas uma vez, mesmo com HMR ou múltiplas chamadas.
 */

let _promise: Promise<void> | null = null;

export function useGoogleMaps() {
  const config = useRuntimeConfig();

  function load(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.google?.maps) return Promise.resolve();
    if (_promise) return _promise;

    const existing = document.querySelector('script[src*="maps/api/js"]');
    if (existing) {
      _promise = new Promise<void>((resolve) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        if (window.google?.maps) resolve();
      });
      return _promise;
    }

    _promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      const key = config.public.googleMapsKey;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=marker,geometry&loading=async`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Falha ao carregar o Google Maps"));
      document.head.appendChild(script);
    });

    return _promise;
  }

  return { load };
}

