export interface GeohashDetailForSummary {
  geohash_id: string;
  neighborhood: string | null;
  city: string;
  quadrant_type: string;
  tech_category: string;
  share_vivo: number;
  trend_direction: string;
  trend_delta: number;
  vivo_score?: number | null;
  download_mbps?: number | null;
  latency_ms?: number | null;
  quality_label?: string | null;
  crm?: {
    avg_income?: number | null;
    income_label?: string | null;
    device_tier?: string | null;
  } | null;
  camada2?: {
    fibra?: { classification: string } | null;
    movel?: { classification: string } | null;
  } | null;
}

export interface IaSummaryResult {
  text: string;
  generatedAt: string;
}

export interface IaSummaryServiceContract {
  getSummary(geohashId: string): Promise<IaSummaryResult | null>;
  generateAndPersist(detail: GeohashDetailForSummary): Promise<IaSummaryResult>;
}
