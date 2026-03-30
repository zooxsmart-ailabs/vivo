# UC002 — Pontos de Função

[<- Voltar ao fluxo principal](./UC002-main-flow.md)

## Funções de Transacao

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Toggle quadrante no Set de filtros | EE | 2 | 1 | Simples | 3 |
| T02 | Recalcular visibilidade dos poligonos | SE | 4 | 2 | Simples | 4 |
| T03 | Atualizar contadores de resumo | SE | 3 | 1 | Simples | 4 |
| T04 | Atualizar estilo dos botoes de filtro | SE | 4 | 1 | Simples | 4 |
| T05 | Persistir filtros na sessão | EE | 4 | 1 | Simples | 3 |
| T06 | Exibir contagem por quadrante | SE | 4 | 1 | Simples | 4 |
| T07 | Toggle estado do botao individual | EE | 2 | 1 | Simples | 3 |

**Subtotal Transacoes:** 25 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados com UC001) |
| Transacoes | 25 |
| **Total UC002** | **25** |

> PF efetivo no INDEX: 10 (desconsiderando funções compartilhadas e internas ao frontend).
