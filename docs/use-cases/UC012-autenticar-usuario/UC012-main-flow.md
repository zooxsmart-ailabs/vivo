# UC012 — Autenticar Usuário (Guard Plugavel)

| Campo | Valor |
|-------|-------|
| **ID** | UC012 |
| **Nome** | Autenticar Usuário (Guard Plugavel) |
| **Ator Primario** | Sistema de Auth (externo) |
| **Atores Secundarios** | Analista, NestJS Backend |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC011, todos os UCs |

## Objetivo

O sistema valida a autenticação e autorização do usuário de forma plugavel, aceitando diferentes provedores de identidade sem expor rotas abertas.

## Pre-condições

- PC01: Um provedor de auth esta configurado (ou modo bypass em dev)

## Pos-condições (Sucesso)

- PS01: Usuário autenticado com token valido
- PS02: Sessão iniciada (UC011)
- PS03: Todas as rotas (HTTP e WS) protegidas pelo guard

## Pos-condições (Falha)

- PF01: Usuário redirecionado para página de auth externo
- PF02: Nenhum dado e exposto sem autenticação

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aplicação |
| 2 | Sistema | NestJS Guard intercepta a requisição |
| 3 | Sistema | Verifica presenca de token (header, cookie, ou query param) |
| 4 | Sistema | Valida token com o provedor configurado (RN012-01) |
| 5 | Sistema | Extrai claims do token: userId, roles, permissions |
| 6 | Sistema | Cria/atualiza sessão interna (UC011) |
| 7 | Sistema | Permite acesso a aplicação |
| 8 | Sistema | Para conexão WS: valida token no handshake e mantem associação userId <-> socket |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC012-alt-flows.md#fa01) | Modo bypass (desenvolvimento) |
| Exceção | [FE01](./UC012-alt-flows.md#fe01) | Token invalido ou expirado |
| Exceção | [FE02](./UC012-alt-flows.md#fe02) | Provedor de auth indisponivel |

## Regras de Negócio Aplicadas

Veja [UC012-business-rules.md](./UC012-business-rules.md)

## Pontos de Função

Veja [UC012-function-points.md](./UC012-function-points.md)
