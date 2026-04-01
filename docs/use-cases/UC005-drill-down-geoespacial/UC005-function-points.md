# UC005 — Pontos de Função

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

## Funções de Transação

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Detectar mudança de zoom com debounce | EE | 3 | 1 | Simples | 3 |
| T02 | Calcular precisão a partir do zoom | SE | 2 | 1 | Simples | 4 |
| T03 | Cancelar subscription anterior e criar nova | EE | 6 | 2 | Médio | 4 |
| T04 | Agregar dados na nova precisão (backend view) | SE | 15 | 4 | Complexo | 7 |
| T05 | Transição visual entre precisões | SE | 4 | 1 | Simples | 4 |
| T06 | Detectar pan e atualizar viewport | EE | 4 | 1 | Simples | 3 |
| T07 | Recalcular contadores pós-transição | SE | 5 | 1 | Simples | 4 |
| T08 | Verificar/desfixar geohash após mudança de precisão | SE | 3 | 1 | Simples | 4 |

**Subtotal Transações:** 33 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transações | 33 |
| **Total UC005** | **33** |

> PF efetivo no INDEX: 15.
