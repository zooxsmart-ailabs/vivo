# UC002 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC002-main-flow.md)

---

## FA01 — Todos os Quadrantes Desativados {#fa01}

**Condição de Desvio:** No passo 2, após o toggle, o Set de filtros ativos fica vazio.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Oculta todos os polígonos do mapa |
| 2 | Sistema | Contadores mostram "0/Y visíveis" |
| 3 | Sistema | Card lateral mostra estado vazio: "Nenhum quadrante selecionado" |
| 4 | Analista | Reativa ao menos um quadrante |

> **Retorno:** Passo 2 do fluxo principal.
