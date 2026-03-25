# UC007 — Pontos de Funcao

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

## Funcoes de Transacao

| ID | Descricao | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Ativar/desativar modo comparacao | EE | 2 | 1 | Simples | 3 |
| T02 | Selecionar periodo de comparacao | EE | 4 | 1 | Simples | 3 |
| T03 | Validar nao sobreposicao de periodos | EE | 4 | 2 | Simples | 3 |
| T04 | Calcular diff de share por geohash | SE | 6 | 2 | Medio | 5 |
| T05 | Calcular diff de satisfacao por geohash | SE | 6 | 2 | Medio | 5 |
| T06 | Calcular diff de metricas tecnicas | SE | 8 | 3 | Medio | 5 |
| T07 | Renderizar indicadores de diff nos cards | SE | 10 | 3 | Medio | 5 |
| T08 | Alternar cores mapa (quadrante vs variacao) | SE | 4 | 1 | Simples | 4 |
| T09 | Exibir badge "Novo"/"Removido" | SE | 3 | 1 | Simples | 4 |
| T10 | Subscription dupla compare | EE | 8 | 3 | Medio | 4 |
| T11 | Exibir mudanca de quadrante | SE | 4 | 2 | Simples | 4 |

**Subtotal Transacoes:** 45 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 0 (compartilhados) |
| Transacoes | 45 |
| **Total UC007** | **45** |

> PF efetivo no INDEX: 16.
