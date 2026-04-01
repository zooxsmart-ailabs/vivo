/**
 * Carregamento singleton do Google Maps API (padrão Dynamic Library Import).
 * Usa loading=async + importLibrary() conforme recomendado pelo Google.
 * Garante que o script é inserido apenas uma vez, mesmo com HMR ou múltiplas chamadas.
 */

let _promise: Promise<void> | null = null;

export function useGoogleMaps() {
  const config = useRuntimeConfig();

  function load(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.google?.maps?.Map) return Promise.resolve();
    if (_promise) return _promise;

    _promise = (async () => {
      // Carrega o bootstrap se ainda não existe no DOM
      if (!document.querySelector('script[src*="maps/api/js"]')) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          const key = config.public.googleMapsKey;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Falha ao carregar o Google Maps"));
          document.head.appendChild(script);
        });
      }

      // Importa as bibliotecas necessárias (popula google.maps.Map, Polygon, etc.)
      await Promise.all([
        google.maps.importLibrary("maps"),
        google.maps.importLibrary("marker"),
        google.maps.importLibrary("geometry"),
      ]);
    })();

    return _promise;
  }

  return { load };
}
