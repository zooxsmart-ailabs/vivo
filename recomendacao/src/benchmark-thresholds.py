from dataclasses import dataclass


@dataclass(frozen=True)
class BenchmarkThresholds:
    satisfacaoAlta: float
    satisfacaoBaixa: float
    shareAlto: float
    shareBaixo: float
    rendaAlta: float
    rendaBaixa: float
    trendUp: float
    trendDown: float


DEFAULT_BENCHMARKS = BenchmarkThresholds(
    satisfacaoAlta=7.5,
    satisfacaoBaixa=6.0,
    shareAlto=40,
    shareBaixo=30,
    rendaAlta=10000,
    rendaBaixa=3500,
    trendUp=1.0,
    trendDown=-1.0,
)
