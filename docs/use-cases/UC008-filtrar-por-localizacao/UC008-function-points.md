# UC008 — Pontos de Funcao

[<- Voltar ao fluxo principal](./UC008-main-flow.md)

## Funcoes de Transacao

| ID | Descricao | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Listar estados disponiveis | SE | 3 | 1 | Simples | 4 |
| T02 | Listar cidades do estado | SE | 4 | 1 | Simples | 4 |
| T03 | Listar bairros da cidade | SE | 4 | 1 | Simples | 4 |
| T04 | Selecionar localizacao (estado+cidade+bairro) | EE | 6 | 3 | Medio | 4 |
| T05 | Centralizar mapa na localizacao | SE | 4 | 1 | Simples | 4 |
| T06 | Propagar localizacao para subscriptions | SE | 6 | 2 | Medio | 5 |
| T07 | Geocoding reverso do centro do mapa | EE | 4 | 1 | Simples | 3 |
| T08 | Sincronizar seletor com mapa | EE | 4 | 2 | Simples | 3 |
| T09 | Persistir localizacao na sessao | EE | 4 | 1 | Simples | 3 |

**Subtotal Transacoes:** 34 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transacoes | 34 |
| **Total UC008** | **34** |

> PF efetivo no INDEX: 13.
