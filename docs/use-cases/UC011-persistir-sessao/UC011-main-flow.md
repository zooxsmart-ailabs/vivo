# UC011 — Persistir e Restaurar Estado da Sessão

| Campo | Valor |
|-------|-------|
| **ID** | UC011 |
| **Nome** | Persistir e Restaurar Estado da Sessão |
| **Ator Primário** | Analista |
| **Atores Secundários** | NestJS Backend (tRPC/WS), Redis, PostgreSQL |
| **Prioridade** | Media |
| **Versão** | 1.0 |
| **Referencias** | UC001-UC010, UC012 |

## Objetivo

O sistema persiste automaticamente o estado da aplicação para cada usuário, permitindo que retome de onde parou na próxima sessão.

## Pre-condições

- PC01: O usuário possui um identificador único (token de sessão, cookie, ou ID de auth externo)

## Pos-condições (Sucesso)

- PS01: Estado completo persistido no backend (Redis + PostgreSQL fallback)
- PS02: Na próxima sessão, todas as visualizacoes restauradas ao ultimo estado

## Pos-condições (Falha)

- PF01: Se persistência falha: aplicação funciona normalmente com defaults
- PF02: Se restauração falha: aplicação inicia com estado default

## Fluxo Principal — Persistir

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Detecta mudança de estado relevante (filtro, seleção, zoom, aba) |
| 2 | Sistema | Aplica debounce de 2s para agrupar mudanças rápidas |
| 3 | Sistema | Serializa estado em objeto SessionState (RN011-01) |
| 4 | Sistema | Envia via tRPC mutation: `session.save({ userId, state })` |
| 5 | Sistema | Backend persiste em Redis (TTL 30 dias) + PostgreSQL (persistente) |

## Fluxo Principal — Restaurar

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aplicação |
| 2 | Sistema | Identifica usuário (via cookie/token/auth externo) |
| 3 | Sistema | Consulta Redis por estado salvo: `session.load({ userId })` |
| 4 | Sistema | Se encontrado: deserializa SessionState |
| 5 | Sistema | Restaura: aba ativa, centro do mapa, zoom, filtros, período, localização |
| 6 | Sistema | Navega para a aba salva e aplica filtros |
| 7 | Sistema | Se nao encontrado: inicia com defaults (RN011-02) |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC011-alt-flows.md#fa01) | Sessão expirada no Redis (fallback PG) |
| Exceção | [FE01](./UC011-alt-flows.md#fe01) | Redis indisponivel |

## Regras de Negócio Aplicadas

Veja [UC011-business-rules.md](./UC011-business-rules.md)

## Pontos de Função

Veja [UC011-function-points.md](./UC011-function-points.md)
