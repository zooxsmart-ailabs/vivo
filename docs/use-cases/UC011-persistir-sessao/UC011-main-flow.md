# UC011 — Persistir e Restaurar Estado da Sessao

| Campo | Valor |
|-------|-------|
| **ID** | UC011 |
| **Nome** | Persistir e Restaurar Estado da Sessao |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), Redis, PostgreSQL |
| **Prioridade** | Media |
| **Versao** | 1.0 |
| **Referencias** | UC001-UC010, UC012 |

## Objetivo

O sistema persiste automaticamente o estado da aplicacao para cada usuario, permitindo que retome de onde parou na proxima sessao.

## Pre-condicoes

- PC01: O usuario possui um identificador unico (token de sessao, cookie, ou ID de auth externo)

## Pos-condicoes (Sucesso)

- PS01: Estado completo persistido no backend (Redis + PostgreSQL fallback)
- PS02: Na proxima sessao, todas as visualizacoes restauradas ao ultimo estado

## Pos-condicoes (Falha)

- PF01: Se persistencia falha: aplicacao funciona normalmente com defaults
- PF02: Se restauracao falha: aplicacao inicia com estado default

## Fluxo Principal — Persistir

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Detecta mudanca de estado relevante (filtro, selecao, zoom, aba) |
| 2 | Sistema | Aplica debounce de 2s para agrupar mudancas rapidas |
| 3 | Sistema | Serializa estado em objeto SessionState (RN011-01) |
| 4 | Sistema | Envia via tRPC mutation: `session.save({ userId, state })` |
| 5 | Sistema | Backend persiste em Redis (TTL 30 dias) + PostgreSQL (persistente) |

## Fluxo Principal — Restaurar

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aplicacao |
| 2 | Sistema | Identifica usuario (via cookie/token/auth externo) |
| 3 | Sistema | Consulta Redis por estado salvo: `session.load({ userId })` |
| 4 | Sistema | Se encontrado: deserializa SessionState |
| 5 | Sistema | Restaura: aba ativa, centro do mapa, zoom, filtros, periodo, localizacao |
| 6 | Sistema | Navega para a aba salva e aplica filtros |
| 7 | Sistema | Se nao encontrado: inicia com defaults (RN011-02) |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC011-alt-flows.md#fa01) | Sessao expirada no Redis (fallback PG) |
| Excecao | [FE01](./UC011-alt-flows.md#fe01) | Redis indisponivel |

## Regras de Negocio Aplicadas

Veja [UC011-business-rules.md](./UC011-business-rules.md)

## Pontos de Funcao

Veja [UC011-function-points.md](./UC011-function-points.md)
