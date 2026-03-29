/** Geohash precision levels used in the platform */
export const GEOHASH_PRECISIONS = [6, 7, 8] as const;
export type GeohashPrecision = (typeof GEOHASH_PRECISIONS)[number];

/** Default geohash precision for map display */
export const DEFAULT_GEOHASH_PRECISION: GeohashPrecision = 7;

/** Strategic quadrants */
export const QUADRANTS = [
  "GROWTH",
  "UPSELL",
  "RETENCAO",
  "GROWTH_RETENCAO",
] as const;

/** Technology categories */
export const TECH_CATEGORIES = ["FIBRA", "MOVEL", "AMBOS"] as const;

/** Redis key prefixes */
export const REDIS_PREFIXES = {
  CACHE: "cache:",
  SESSION: "session:",
  WS_CHANNEL: "ws:channel:",
} as const;

/** OpenTelemetry service names */
export const OTEL_SERVICE_NAMES = {
  API: "vivo-api",
  WEB: "vivo-web",
} as const;
