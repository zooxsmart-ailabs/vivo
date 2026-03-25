# UC012 — Autenticar Usuario (Guard Plugavel)

| Campo | Valor |
|-------|-------|
| **ID** | UC012 |
| **Nome** | Autenticar Usuario (Guard Plugavel) |
| **Ator Primario** | Sistema de Auth (externo) |
| **Atores Secundarios** | Analista, NestJS Backend |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC011, todos os UCs |

## Objetivo

O sistema valida a autenticacao e autorizacao do usuario de forma plugavel, aceitando diferentes provedores de identidade sem expor rotas abertas.

## Pre-condicoes

- PC01: Um provedor de auth esta configurado (ou modo bypass em dev)

## Pos-condicoes (Sucesso)

- PS01: Usuario autenticado com token valido
- PS02: Sessao iniciada (UC011)
- PS03: Todas as rotas (HTTP e WS) protegidas pelo guard

## Pos-condicoes (Falha)

- PF01: Usuario redirecionado para pagina de auth externo
- PF02: Nenhum dado e exposto sem autenticacao

## Fluxo Principal

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aplicacao |
| 2 | Sistema | NestJS Guard intercepta a requisicao |
| 3 | Sistema | Verifica presenca de token (header, cookie, ou query param) |
| 4 | Sistema | Valida token com o provedor configurado (RN012-01) |
| 5 | Sistema | Extrai claims do token: userId, roles, permissions |
| 6 | Sistema | Cria/atualiza sessao interna (UC011) |
| 7 | Sistema | Permite acesso a aplicacao |
| 8 | Sistema | Para conexao WS: valida token no handshake e mantem associacao userId <-> socket |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC012-alt-flows.md#fa01) | Modo bypass (desenvolvimento) |
| Excecao | [FE01](./UC012-alt-flows.md#fe01) | Token invalido ou expirado |
| Excecao | [FE02](./UC012-alt-flows.md#fe02) | Provedor de auth indisponivel |

## Regras de Negocio Aplicadas

Veja [UC012-business-rules.md](./UC012-business-rules.md)

## Pontos de Funcao

Veja [UC012-function-points.md](./UC012-function-points.md)
