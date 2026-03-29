import { registerAs } from "@nestjs/config";

export default registerAs("telemetry", () => ({
  enabled: process.env.OTEL_ENABLED !== "false",
  serviceName: process.env.OTEL_SERVICE_NAME || "vivo-api",
  endpoint:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
}));
