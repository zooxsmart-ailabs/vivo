# UC007 — Comparar Periodos (Diff)

| Campo | Valor |
|-------|-------|
| **ID** | UC007 |
| **Nome** | Comparar Periodos (Diff) |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL + TimescaleDB |
| **Prioridade** | Media |
| **Versao** | 1.0 |
| **Referencias** | UC006, UC001, UC009, UC010 |

## Objetivo

O Analista compara dois periodos temporais lado a lado, visualizando o diff (delta) de todas as metricas para identificar evolucao ou regressao.

## Pre-condicoes

- PC01: Periodo base esta selecionado (UC006)
- PC02: Existem dados em pelo menos 2 periodos distintos

## Pos-condicoes (Sucesso)

- PS01: Todas as visualizacoes exibem indicadores de diff (setas, deltas, cores)
- PS02: Mapa pode exibir poligonos com cores de variacao (RN007-01)
- PS03: Cards e rankings mostram delta entre periodos

## Pos-condicoes (Falha)

- PF01: Se periodo de comparacao sem dados: diff nao calculado, mostra apenas periodo base

## Fluxo Principal

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Ativa modo de comparacao no seletor de periodo |
| 2 | Sistema | Exibe segundo date range picker para "periodo de comparacao" |
| 3 | Analista | Seleciona periodo de comparacao (ex: 3 meses anteriores) |
| 4 | Sistema | Valida que periodos nao se sobrepoem (RN007-02) |
| 5 | Sistema | Envia subscription dupla: `geohash.compare({ periodoBase, periodoComparacao, viewport, precisao })` |
| 6 | Sistema | Backend calcula diff para cada metrica por geohash (RN007-03) |
| 7 | Sistema | Frontend exibe indicadores de diff em todas as visualizacoes |
| 8 | Sistema | No mapa: poligonos podem alternar entre cor por quadrante e cor por variacao |
| 9 | Sistema | Nos cards: cada metrica exibe valor atual + delta + seta direcional |
| 10 | Sistema | Persiste modo comparacao na sessao (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC007-alt-flows.md#fa01) | Geohash existe apenas em um dos periodos |
| Alternativo | [FA02](./UC007-alt-flows.md#fa02) | Analista desativa modo comparacao |
| Excecao | [FE01](./UC007-alt-flows.md#fe01) | Periodo de comparacao sem dados |

## Regras de Negocio Aplicadas

Veja [UC007-business-rules.md](./UC007-business-rules.md)

## Pontos de Funcao

Veja [UC007-function-points.md](./UC007-function-points.md)
