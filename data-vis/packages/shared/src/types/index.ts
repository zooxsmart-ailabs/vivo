import { z } from "zod";

/** Quadrant classification for geohash cells */
export type Quadrant = "GROWTH" | "UPSELL" | "RETENCAO" | "GROWTH_RETENCAO";

/** Technology categories */
export type TechCategory = "FIBRA" | "MOVEL" | "AMBOS";

/** Health check response */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  timestamp: z.string().datetime(),
  services: z.record(z.enum(["up", "down"])).optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** WebSocket event types */
export type WsEventType =
  | "geohash:updated"
  | "metric:refreshed"
  | "connection:established";

/** Base message shape for WebSocket events */
export interface WsMessage<T = unknown> {
  event: WsEventType;
  data: T;
  timestamp: string;
}
