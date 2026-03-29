export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  if (!config.public.otelEndpoint) return;

  // Browser OpenTelemetry will be initialized here when SigNoz
  // collector is configured. Requires:
  //   @opentelemetry/sdk-trace-web
  //   @opentelemetry/exporter-trace-otlp-http
  //
  // Example setup:
  //   const provider = new WebTracerProvider({ resource });
  //   provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  //   provider.register();
});
