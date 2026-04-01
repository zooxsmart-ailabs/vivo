# UC005 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

---

## FA01 — Zoom Sem Mudança de Precisão {#fa01}

**Condição de Desvio:** No passo 3, o novo zoom está na mesma faixa da precisão atual.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Mantém polígonos existentes |
| 2 | Sistema | Não envia nova subscription |

> **Retorno:** Não aplicável — UC encerra sem ação.

---

## FA02 — Pan Sem Zoom {#fa02}

**Condição de Desvio:** O analista arrasta o mapa (pan) sem alterar zoom.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Arrasta o mapa |
| 2 | Sistema | Detecta mudança de viewport (bounding box) com debounce 300ms |
| 3 | Sistema | Envia subscription atualizada com novo viewport, mesma precisão |
| 4 | Sistema | Backend retorna geohashes do novo viewport |
| 5 | Sistema | Adiciona novos polígonos, remove os que saíram do viewport |

> **Retorno:** Passo 9 do fluxo principal.

---

## FE01 — Sem Dados na Precisão {#fe01}

**Condição de Desvio:** No passo 6, a query retorna 0 geohashes para a precisão solicitada (ex: não existem `geohash_cell` de precisão 6 na região).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Backend tenta a outra precisão suportada (6 ↔ 7) |
| 2 | Sistema | Se encontrou dados: renderiza na precisão alternativa |
| 3 | Sistema | Exibe toast informativo: "Exibindo dados em precisão [X]" |
| 4 | Sistema | Se nenhuma precisão tem dados: exibe mapa vazio (FA01 do UC001) |

> **Retorno:** Passo 8 do fluxo principal.
