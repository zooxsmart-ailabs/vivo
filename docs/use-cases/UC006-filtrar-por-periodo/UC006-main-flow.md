# UC006 — Filtrar por Periodo Temporal

| Campo | Valor |
|-------|-------|
| **ID** | UC006 |
| **Nome** | Filtrar por Periodo Temporal |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL + TimescaleDB |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC001, UC007, UC009, UC010, UC011 |

## Objetivo

O Analista define o periodo temporal (intervalo de meses) para analise, afetando todas as abas da aplicacao. Default: ultimos 3 meses.

## Pre-condicoes

- PC01: O Analista esta autenticado (UC012)
- PC02: Existem dados carregados no banco

## Pos-condicoes (Sucesso)

- PS01: Todas as visualizacoes (mapa, frentes, bairros) refletem o periodo selecionado
- PS02: Benchmarks recalculados para o periodo
- PS03: Periodo persistido na sessao (UC011)

## Pos-condicoes (Falha)

- PF01: Se nao existem dados no periodo: mensagem informativa, visualizacoes vazias

## Fluxo Principal

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Abre o seletor de periodo (componente global no header) |
| 2 | Sistema | Exibe date range picker com meses disponiveis (RN006-01) |
| 3 | Analista | Seleciona mes inicio e mes fim |
| 4 | Sistema | Valida intervalo (RN006-02) |
| 5 | Sistema | Atualiza contexto global de periodo |
| 6 | Sistema | Reenvia subscriptions WS com novo periodo para todas as abas ativas |
| 7 | Sistema | Backend reconsulta views filtradas por `periodDate BETWEEN inicio AND fim` |
| 8 | Sistema | Frontend re-renderiza visualizacoes com novos dados |
| 9 | Sistema | Atualiza label do seletor: "Jan 2026 — Mar 2026" |
| 10 | Sistema | Persiste periodo na sessao (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC006-alt-flows.md#fa01) | Periodo sem dados |
| Extend | [UC007](../UC007-comparar-periodos/UC007-main-flow.md) | Analista ativa comparacao |

## Regras de Negocio Aplicadas

Veja [UC006-business-rules.md](./UC006-business-rules.md)

## Pontos de Funcao

Veja [UC006-function-points.md](./UC006-function-points.md)
