# UC011 — Pontos de Função

[<- Voltar ao fluxo principal](./UC011-main-flow.md)

## Funções de Dados

| ID | Nome | Tipo | DET | RET | Complexidade | PF |
|----|------|------|-----|-----|--------------|-----|
| D01 | user_session | ALI | 12 | 3 | Medio | 10 |

**Subtotal Dados:** 10 PF

## Funções de Transacao

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Serializar estado em SessionState | SE | 12 | 3 | Medio | 5 |
| T02 | Persistir em Redis (write) | EE | 12 | 1 | Medio | 4 |
| T03 | Persistir em PostgreSQL (upsert) | EE | 12 | 1 | Medio | 4 |
| T04 | Restaurar de Redis (read) | CE | 12 | 1 | Medio | 4 |
| T05 | Restaurar de PostgreSQL (fallback) | CE | 12 | 1 | Medio | 4 |
| T06 | Aplicar estado restaurado ao frontend | SE | 12 | 5 | Complexo | 7 |
| T07 | Debounce de mudanças (2s) | EE | 2 | 1 | Simples | 3 |
| T08 | Identificar usuário (cookie/token) | CE | 3 | 1 | Simples | 3 |

**Subtotal Transacoes:** 34 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 10 |
| Transacoes | 34 |
| **Total UC011** | **44** |

> PF efetivo no INDEX: 13.
