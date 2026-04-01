# UC012 — Autenticar Usuário (Guard Plugável)

| Campo | Valor |
|-------|-------|
| **ID** | UC012 |
| **Nome** | Autenticar Usuário (Guard Plugável) |
| **Ator Primário** | Sistema de Auth (externo) |
| **Atores Secundários** | Analista, NestJS Backend |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referências** | UC011, todos os UCs |

## Objetivo

O sistema valida a autenticação e autorização do usuário de forma plugável, aceitando diferentes provedores de identidade sem expor rotas abertas.

## Pré-condições

- PC01: Um provedor de auth está configurado (ou modo bypass em dev)

## Pós-condições (Sucesso)

- PS01: Usuário autenticado com token válido
- PS02: Sessão iniciada (UC011)
- PS03: Todas as rotas (HTTP e WS) protegidas pelo guard

## Pós-condições (Falha)

- PF01: Usuário redirecionado para página de auth externo
- PF02: Nenhum dado é exposto sem autenticação

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aplicação |
| 2 | Sistema | NestJS Guard intercepta a requisição |
| 3 | Sistema | Verifica presença de token (header, cookie, ou query param) |
| 4 | Sistema | Valida token com o provedor configurado (RN012-01) |
| 5 | Sistema | Extrai claims do token: userId, roles, permissions |
| 6 | Sistema | Cria/atualiza sessão interna (UC011) |
| 7 | Sistema | Permite acesso a aplicação |
| 8 | Sistema | Para conexão WS: valida token no handshake e mantém associação userId <-> socket |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC012-alt-flows.md#fa01) | Modo bypass (desenvolvimento) |
| Exceção | [FE01](./UC012-alt-flows.md#fe01) | Token inválido ou expirado |
| Exceção | [FE02](./UC012-alt-flows.md#fe02) | Provedor de auth indisponível |

## Regras de Negócio Aplicadas

Veja [UC012-business-rules.md](./UC012-business-rules.md)

## Pontos de Função

Veja [UC012-function-points.md](./UC012-function-points.md)
