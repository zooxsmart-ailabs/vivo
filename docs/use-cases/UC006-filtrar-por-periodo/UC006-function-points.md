# UC006 — Pontos de Funcao

[<- Voltar ao fluxo principal](./UC006-main-flow.md)

## Funcoes de Transacao

| ID | Descricao | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Consultar meses disponiveis | SE | 3 | 1 | Simples | 4 |
| T02 | Selecionar intervalo de periodo | EE | 4 | 1 | Simples | 3 |
| T03 | Validar intervalo selecionado | EE | 4 | 1 | Simples | 3 |
| T04 | Propagar periodo para subscriptions ativas | SE | 6 | 3 | Medio | 5 |
| T05 | Reconsultar views com novo periodo | SE | 12 | 4 | Complexo | 7 |
| T06 | Atualizar label do seletor | SE | 3 | 1 | Simples | 4 |
| T07 | Persistir periodo na sessao | EE | 3 | 1 | Simples | 3 |
| T08 | Recalcular benchmarks para o periodo | SE | 8 | 2 | Medio | 5 |

**Subtotal Transacoes:** 34 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transacoes | 34 |
| **Total UC006** | **34** |

> PF efetivo no INDEX: 13.
