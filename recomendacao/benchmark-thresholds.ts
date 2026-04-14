export interface BenchmarkThresholds {
  satisfacaoAlta: number;
  satisfacaoBaixa: number;
  shareAlto: number;
  shareBaixo: number;
  rendaAlta: number;
  rendaBaixa: number;
  trendUp: number;
  trendDown: number;
}

export const DEFAULT_BENCHMARKS: BenchmarkThresholds = {
  satisfacaoAlta: 7.5,
  satisfacaoBaixa: 6.0,
  shareAlto: 40,
  shareBaixo: 30,
  rendaAlta: 10_000,
  rendaBaixa: 3_500,
  trendUp: 1.0,
  trendDown: -1.0,
};
