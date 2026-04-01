# UC008 — Pontos de Função

[<- Voltar ao fluxo principal](./UC008-main-flow.md)

## Funções de Transação

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Listar estados disponíveis | SE | 3 | 1 | Simples | 4 |
| T02 | Listar cidades do estado | SE | 4 | 1 | Simples | 4 |
| T03 | Listar bairros da cidade | SE | 4 | 1 | Simples | 4 |
| T04 | Selecionar localização (estado+cidade+bairro) | EE | 6 | 3 | Médio | 4 |
| T05 | Centralizar mapa na localização | SE | 4 | 1 | Simples | 4 |
| T06 | Propagar localização para subscriptions | SE | 6 | 2 | Médio | 5 |
| T07 | Geocoding reverso do centro do mapa | EE | 4 | 1 | Simples | 3 |
| T08 | Sincronizar seletor com mapa | EE | 4 | 2 | Simples | 3 |
| T09 | Persistir localização na sessão | EE | 4 | 1 | Simples | 3 |

**Subtotal Transações:** 34 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transações | 34 |
| **Total UC008** | **34** |

> PF efetivo no INDEX: 13.
