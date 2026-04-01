# UC012 — Pontos de Função

[<- Voltar ao fluxo principal](./UC012-main-flow.md)

## Funções de Transação

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Interceptar requisição (Guard global) | EE | 3 | 1 | Simples | 3 |
| T02 | Validar token com provedor | SE | 6 | 2 | Médio | 5 |
| T03 | Extrair claims do token | SE | 5 | 1 | Simples | 4 |
| T04 | Validar token no handshake WS | EE | 4 | 1 | Simples | 3 |
| T05 | Redirecionar para login externo | SE | 3 | 1 | Simples | 4 |
| T06 | Cache de validação (Redis) | CE | 4 | 1 | Simples | 3 |
| T07 | Retornar user mock (bypass) | SE | 4 | 1 | Simples | 4 |
| T08 | Consultar cache de token no Redis | CE | 3 | 1 | Simples | 3 |
| T09 | Associar userId ao socket WS | EE | 3 | 1 | Simples | 3 |
| T10 | Registrar evento de auth no SigNoz | CE | 5 | 1 | Simples | 3 |

**Subtotal Transações:** 35 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (user_session compartilhado com UC011) |
| Transações | 35 |
| **Total UC012** | **35** |

> PF efetivo no INDEX: 13.
