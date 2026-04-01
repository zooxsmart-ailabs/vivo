# UC007 — Pontos de Função

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

## Funções de Transação

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Ativar/desativar modo comparação | EE | 2 | 1 | Simples | 3 |
| T02 | Selecionar período de comparação | EE | 4 | 1 | Simples | 3 |
| T03 | Validar não sobreposição de períodos | EE | 4 | 2 | Simples | 3 |
| T04 | Calcular diff de share por geohash | SE | 6 | 2 | Médio | 5 |
| T05 | Calcular diff de satisfação por geohash | SE | 6 | 2 | Médio | 5 |
| T06 | Calcular diff de métricas técnicas | SE | 8 | 3 | Médio | 5 |
| T07 | Renderizar indicadores de diff nos cards | SE | 10 | 3 | Médio | 5 |
| T08 | Alternar cores mapa (quadrante vs variação) | SE | 4 | 1 | Simples | 4 |
| T09 | Exibir badge "Novo"/"Removido" | SE | 3 | 1 | Simples | 4 |
| T10 | Subscription dupla compare | EE | 8 | 3 | Médio | 4 |
| T11 | Exibir mudança de quadrante | SE | 4 | 2 | Simples | 4 |

**Subtotal Transações:** 45 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transações | 45 |
| **Total UC007** | **45** |

> PF efetivo no INDEX: 16.
