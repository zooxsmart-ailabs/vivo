# UC012 — Pontos de Funcao

[<- Voltar ao fluxo principal](./UC012-main-flow.md)

## Funcoes de Transacao

| ID | Descricao | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Interceptar requisicao (Guard global) | EE | 3 | 1 | Simples | 3 |
| T02 | Validar token com provedor | SE | 6 | 2 | Medio | 5 |
| T03 | Extrair claims do token | SE | 5 | 1 | Simples | 4 |
| T04 | Validar token no handshake WS | EE | 4 | 1 | Simples | 3 |
| T05 | Redirecionar para login externo | SE | 3 | 1 | Simples | 4 |
| T06 | Cache de validacao (Redis) | CE | 4 | 1 | Simples | 3 |
| T07 | Retornar user mock (bypass) | SE | 4 | 1 | Simples | 4 |
| T08 | Consultar cache de token no Redis | CE | 3 | 1 | Simples | 3 |
| T09 | Associar userId ao socket WS | EE | 3 | 1 | Simples | 3 |
| T10 | Registrar evento de auth no SigNoz | CE | 5 | 1 | Simples | 3 |

**Subtotal Transacoes:** 35 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (user_session compartilhado com UC011) |
| Transacoes | 35 |
| **Total UC012** | **35** |

> PF efetivo no INDEX: 13.
