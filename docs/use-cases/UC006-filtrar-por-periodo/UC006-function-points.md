# UC006 — Pontos de Função

[<- Voltar ao fluxo principal](./UC006-main-flow.md)

## Funções de Transação

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Consultar meses disponíveis | SE | 3 | 1 | Simples | 4 |
| T02 | Selecionar intervalo de período | EE | 4 | 1 | Simples | 3 |
| T03 | Validar intervalo selecionado | EE | 4 | 1 | Simples | 3 |
| T04 | Propagar período para subscriptions ativas | SE | 6 | 3 | Médio | 5 |
| T05 | Reconsultar views com novo período | SE | 12 | 4 | Complexo | 7 |
| T06 | Atualizar label do seletor | SE | 3 | 1 | Simples | 4 |
| T07 | Persistir período na sessão | EE | 3 | 1 | Simples | 3 |
| T08 | Recalcular benchmarks para o período | SE | 8 | 2 | Médio | 5 |

**Subtotal Transações:** 34 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transações | 34 |
| **Total UC006** | **34** |

> PF efetivo no INDEX: 13.
