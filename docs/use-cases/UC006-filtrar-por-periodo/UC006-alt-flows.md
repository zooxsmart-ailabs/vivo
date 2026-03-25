# UC006 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC006-main-flow.md)

---

## FA01 — Periodo Sem Dados {#fa01}

**Condicao de Desvio:** No passo 7, a query retorna 0 resultados para o periodo selecionado.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Nao ha dados disponiveis para o periodo selecionado" |
| 2 | Sistema | Todas as visualizacoes mostram estado vazio |
| 3 | Sistema | Seletor de periodo permanece aberto para ajuste |
| 4 | Analista | Seleciona outro periodo |

> **Retorno:** Passo 3 do fluxo principal.
