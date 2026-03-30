# UC005 — Realizar Drill-down Geoespacial

| Campo | Valor |
|-------|-------|
| **ID** | UC005 |
| **Nome** | Realizar Drill-down Geoespacial |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL + PostGIS |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC001, RN001-03 |

## Objetivo

O Analista altera o zoom do mapa, disparando automaticamente uma mudança na precisao do geohash e carregando dados mais granulares (zoom in) ou mais agregados (zoom out) via WebSocket.

## Pre-condições

- PC01: O mapa esta renderizado (UC001)
- PC02: Conexão WebSocket ativa

## Pos-condições (Sucesso)

- PS01: Poligonos re-renderizados na nova precisao de geohash
- PS02: Dados recalculados (quadrantes, scores) para a nova granularidade
- PS03: Filtros ativos mantidos na transicao
- PS04: Estado do zoom persistido (UC011)

## Pos-condições (Falha)

- PF01: Se nao existem dados na precisao solicitada, mapa exibe poligonos da precisao mais próxima disponível

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Altera zoom do mapa (scroll, pinch, botoes +/-) |
| 2 | Sistema | Detecta mudança de zoom com debounce (300ms) |
| 3 | Sistema | Calcula nova precisao de geohash: clamp para 6 (zoom <= 13) ou 7 (zoom >= 14) — RN001-03 |
| 4 | Sistema | Se precisao mudou: cancela subscription anterior |
| 5 | Sistema | Envia nova subscription: `geohash.subscribe({ viewport, período, localização, precisao })` |
| 6 | Sistema | Backend consulta `vw_geohash_summary WHERE precision = ?` que consome os continuous aggregates correspondentes (`cagg_*_gh6` ou `cagg_*_gh7`) — RN005-02 |
| 7 | Sistema | Remove poligonos anteriores do mapa |
| 8 | Sistema | Renderiza novos poligonos com animação de transição (fade) |
| 9 | Sistema | Recalcula contadores e legenda |
| 10 | Sistema | Se havia geohash fixado e ele nao existe na nova precisao: desfixa |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC005-alt-flows.md#fa01) | Zoom muda mas precisao nao (mesma faixa) |
| Alternativo | [FA02](./UC005-alt-flows.md#fa02) | Pan sem zoom (viewport muda, precisao nao) |
| Exceção | [FE01](./UC005-alt-flows.md#fe01) | Sem dados na precisao solicitada |

## Regras de Negócio Aplicadas

Veja [UC005-business-rules.md](./UC005-business-rules.md)

## Pontos de Função

Veja [UC005-function-points.md](./UC005-function-points.md)
