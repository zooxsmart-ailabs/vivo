# UC003 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC003-main-flow.md)

---

## FA01 — Nenhum Geohash Visivel {#fa01}

**Condicao de Desvio:** No passo 3, a combinacao de filtros (quadrante + tecnologia) resulta em 0 geohashes visiveis.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Oculta todos os poligonos |
| 2 | Sistema | Contadores mostram "0/Y visiveis" |
| 3 | Sistema | Card lateral mostra: "Nenhum geohash corresponde aos filtros selecionados" |
| 4 | Analista | Ajusta filtros de quadrante (UC002) ou tecnologia |

> **Retorno:** Passo 2 do fluxo principal.
