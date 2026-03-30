# UC006 — Filtrar por Período Temporal

| Campo | Valor |
|-------|-------|
| **ID** | UC006 |
| **Nome** | Filtrar por Período Temporal |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL + TimescaleDB |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC001, UC007, UC009, UC010, UC011 |

## Objetivo

O Analista define o período temporal (intervalo de meses) para análise, afetando todas as abas da aplicacao. Default: ultimos 3 meses.

## Pre-condições

- PC01: O Analista esta autenticado (UC012)
- PC02: Existem dados carregados no banco

## Pos-condições (Sucesso)

- PS01: Todas as visualizacoes (mapa, frentes, bairros) refletem o período selecionado
- PS02: Benchmarks recalculados para o período
- PS03: Período persistido na sessão (UC011)

## Pos-condições (Falha)

- PF01: Se nao existem dados no período: mensagem informativa, visualizacoes vazias

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Abre o seletor de período (componente global no header) |
| 2 | Sistema | Exibe date range picker com meses disponíveis (RN006-01) |
| 3 | Analista | Seleciona mes inicio e mes fim |
| 4 | Sistema | Valida intervalo (RN006-02) |
| 5 | Sistema | Atualiza contexto global de período |
| 6 | Sistema | Reenvia subscriptions WS com novo período para todas as abas ativas |
| 7 | Sistema | Backend reconsulta views filtradas por `periodDate BETWEEN inicio AND fim` |
| 8 | Sistema | Frontend re-renderiza visualizacoes com novos dados |
| 9 | Sistema | Atualiza label do seletor: "Jan 2026 — Mar 2026" |
| 10 | Sistema | Persiste período na sessão (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC006-alt-flows.md#fa01) | Período sem dados |
| Extend | [UC007](../UC007-comparar-periodos/UC007-main-flow.md) | Analista ativa comparação |

## Regras de Negócio Aplicadas

Veja [UC006-business-rules.md](./UC006-business-rules.md)

## Pontos de Função

Veja [UC006-function-points.md](./UC006-function-points.md)
