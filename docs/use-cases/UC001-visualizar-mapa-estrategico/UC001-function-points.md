# UC001 — Pontos de Função

[<- Voltar ao fluxo principal](./UC001-main-flow.md)

## Funções de Dados

| ID | Nome | Tipo | DET | RET | Complexidade | PF |
|----|------|------|-----|-----|--------------|-----|
| D01 | vw_geohash_summary | ALI | 35 | 5 | Complexo | 15 |
| D02 | benchmark_config | ALI | 8 | 1 | Simples | 7 |
| D03 | file_transfer (via view) | AIE | 182 | 8 | Complexo | 10 |
| D04 | satisfactionScore (via view) | AIE | 6 | 1 | Simples | 5 |

**Subtotal Dados:** 37 PF (contados uma vez no INDEX)

## Funções de Transacao

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Renderizar poligonos geohash no mapa | SE | 12 | 3 | Medio | 5 |
| T02 | Calcular quadrante estratégico | SE | 4 | 2 | Simples | 4 |
| T03 | Exibir legenda de quadrantes | SE | 8 | 1 | Simples | 4 |
| T04 | Calcular contadores de resumo | SE | 5 | 1 | Simples | 4 |
| T05 | Subscription WS geohash.subscribe | SE | 6 | 2 | Medio | 5 |
| T06 | Consultar benchmarks regionais | CE | 8 | 1 | Medio | 4 |
| T07 | Consultar viewport bounding box | CE | 4 | 1 | Simples | 3 |
| T08 | Exibir badge "em risco" (RISCO) | SE | 3 | 1 | Simples | 4 |
| T09 | Exibir hint flutuante | SE | 2 | 1 | Simples | 4 |
| T10 | Consultar estado da sessão | CE | 6 | 2 | Medio | 4 |

**Subtotal Transacoes:** 41 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 37 |
| Transacoes | 41 |
| **Total UC001** | **78** |

> Nota: Funções de dados compartilhadas (D01-D04) sao contadas uma única vez no INDEX.md.
> O PF efetivo de transacoes deste UC e 28 (descontando dados compartilhados).
