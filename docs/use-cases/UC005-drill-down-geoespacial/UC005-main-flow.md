# UC005 — Realizar Drill-down Geoespacial

| Campo | Valor |
|-------|-------|
| **ID** | UC005 |
| **Nome** | Realizar Drill-down Geoespacial |
| **Ator Primário** | Analista |
| **Atores Secundários** | NestJS Backend (tRPC/WS), PostgreSQL + PostGIS |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referências** | UC001, RN001-03 |

## Objetivo

O Analista altera o zoom do mapa, disparando automaticamente uma mudança na precisão do geohash e carregando dados mais granulares (zoom in) ou mais agregados (zoom out) via WebSocket.

## Pré-condições

- PC01: O mapa está renderizado (UC001)
- PC02: Conexão WebSocket ativa

## Pós-condições (Sucesso)

- PS01: Polígonos re-renderizados na nova precisão de geohash
- PS02: Dados recalculados (quadrantes, scores) para a nova granularidade
- PS03: Filtros ativos mantidos na transição
- PS04: Estado do zoom persistido (UC011)

## Pós-condições (Falha)

- PF01: Se não existem dados na precisão solicitada, mapa exibe polígonos da precisão mais próxima disponível

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Altera zoom do mapa (scroll, pinch, botões +/-) |
| 2 | Sistema | Detecta mudança de zoom com debounce (300ms) |
| 3 | Sistema | Calcula nova precisão de geohash: clamp para 6 (zoom <= 13) ou 7 (zoom >= 14) — RN001-03 |
| 4 | Sistema | Se precisão mudou: cancela subscription anterior |
| 5 | Sistema | Envia nova subscription: `geohash.subscribe({ viewport, período, localização, precisão })` |
| 6 | Sistema | Backend consulta `vw_geohash_summary WHERE precision = ?` que consome os continuous aggregates correspondentes (`cagg_*_gh6` ou `cagg_*_gh7`) — RN005-02 |
| 7 | Sistema | Remove polígonos anteriores do mapa |
| 8 | Sistema | Renderiza novos polígonos com animação de transição (fade) |
| 9 | Sistema | Recalcula contadores e legenda |
| 10 | Sistema | Se havia geohash fixado e ele não existe na nova precisão: desfixa |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC005-alt-flows.md#fa01) | Zoom muda mas precisão não (mesma faixa) |
| Alternativo | [FA02](./UC005-alt-flows.md#fa02) | Pan sem zoom (viewport muda, precisão não) |
| Exceção | [FE01](./UC005-alt-flows.md#fe01) | Sem dados na precisão solicitada |

## Regras de Negócio Aplicadas

Veja [UC005-business-rules.md](./UC005-business-rules.md)

## Pontos de Função

Veja [UC005-function-points.md](./UC005-function-points.md)
