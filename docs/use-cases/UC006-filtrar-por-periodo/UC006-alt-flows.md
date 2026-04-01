# UC006 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC006-main-flow.md)

---

## FA01 — Período Sem Dados {#fa01}

**Condição de Desvio:** No passo 7, a query retorna 0 resultados para o período selecionado.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Não há dados disponíveis para o período selecionado" |
| 2 | Sistema | Todas as visualizações mostram estado vazio |
| 3 | Sistema | Seletor de período permanece aberto para ajuste |
| 4 | Analista | Seleciona outro período |

> **Retorno:** Passo 3 do fluxo principal.
