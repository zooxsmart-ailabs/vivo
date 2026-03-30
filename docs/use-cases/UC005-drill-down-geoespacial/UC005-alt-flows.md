# UC005 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

---

## FA01 — Zoom Sem Mudança de Precisao {#fa01}

**Condição de Desvio:** No passo 3, o novo zoom esta na mesma faixa da precisao atual.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Mantem poligonos existentes |
| 2 | Sistema | Nao envia nova subscription |

> **Retorno:** Nao aplicavel — UC encerra sem ação.

---

## FA02 — Pan Sem Zoom {#fa02}

**Condição de Desvio:** O analista arrasta o mapa (pan) sem alterar zoom.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Arrasta o mapa |
| 2 | Sistema | Detecta mudança de viewport (bounding box) com debounce 300ms |
| 3 | Sistema | Envia subscription atualizada com novo viewport, mesma precisao |
| 4 | Sistema | Backend retorna geohashes do novo viewport |
| 5 | Sistema | Adiciona novos poligonos, remove os que sairam do viewport |

> **Retorno:** Passo 9 do fluxo principal.

---

## FE01 — Sem Dados na Precisao {#fe01}

**Condição de Desvio:** No passo 6, a query retorna 0 geohashes para a precisao solicitada (ex: nao existem `geohash_cell` de precisao 6 na região).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Backend tenta a outra precisao suportada (6 ↔ 7) |
| 2 | Sistema | Se encontrou dados: renderiza na precisao alternativa |
| 3 | Sistema | Exibe toast informativo: "Exibindo dados em precisao [X]" |
| 4 | Sistema | Se nenhuma precisao tem dados: exibe mapa vazio (FA01 do UC001) |

> **Retorno:** Passo 8 do fluxo principal.
