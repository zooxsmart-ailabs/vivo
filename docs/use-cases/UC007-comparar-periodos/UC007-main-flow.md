# UC007 — Comparar Períodos (Diff)

| Campo | Valor |
|-------|-------|
| **ID** | UC007 |
| **Nome** | Comparar Períodos (Diff) |
| **Ator Primário** | Analista |
| **Atores Secundários** | NestJS Backend (tRPC/WS), PostgreSQL + TimescaleDB |
| **Prioridade** | Média |
| **Versão** | 1.0 |
| **Referências** | UC006, UC001, UC009, UC010 |

## Objetivo

O Analista compara dois períodos temporais lado a lado, visualizando o diff (delta) de todas as métricas para identificar evolução ou regressão.

## Pré-condições

- PC01: Período base está selecionado (UC006)
- PC02: Existem dados em pelo menos 2 períodos distintos

## Pós-condições (Sucesso)

- PS01: Todas as visualizações exibem indicadores de diff (setas, deltas, cores)
- PS02: Mapa pode exibir polígonos com cores de variação (RN007-01)
- PS03: Cards e rankings mostram delta entre períodos

## Pós-condições (Falha)

- PF01: Se período de comparação sem dados: diff não calculado, mostra apenas período base

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Ativa modo de comparação no seletor de período |
| 2 | Sistema | Exibe segundo date range picker para "período de comparação" |
| 3 | Analista | Seleciona período de comparação (ex: 3 meses anteriores) |
| 4 | Sistema | Valida que períodos não se sobrepõem (RN007-02) |
| 5 | Sistema | Envia subscription dupla: `geohash.compare({ periodoBase, periodoComparacao, viewport, precisão })` |
| 6 | Sistema | Backend calcula diff para cada métrica por geohash (RN007-03) |
| 7 | Sistema | Frontend exibe indicadores de diff em todas as visualizações |
| 8 | Sistema | No mapa: polígonos podem alternar entre cor por quadrante e cor por variação |
| 9 | Sistema | Nos cards: cada métrica exibe valor atual + delta + seta direcional |
| 10 | Sistema | Persiste modo de comparação na sessão (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC007-alt-flows.md#fa01) | Geohash existe apenas em um dos períodos |
| Alternativo | [FA02](./UC007-alt-flows.md#fa02) | Analista desativa modo comparação |
| Exceção | [FE01](./UC007-alt-flows.md#fe01) | Período de comparação sem dados |

## Regras de Negócio Aplicadas

Veja [UC007-business-rules.md](./UC007-business-rules.md)

## Pontos de Função

Veja [UC007-function-points.md](./UC007-function-points.md)
