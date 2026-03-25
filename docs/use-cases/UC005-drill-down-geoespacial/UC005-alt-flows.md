# UC005 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

---

## FA01 — Zoom Sem Mudanca de Precisao {#fa01}

**Condicao de Desvio:** No passo 3, o novo zoom esta na mesma faixa da precisao atual.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Mantem poligonos existentes |
| 2 | Sistema | Nao envia nova subscription |

> **Retorno:** Nao aplicavel — UC encerra sem acao.

---

## FA02 — Pan Sem Zoom {#fa02}

**Condicao de Desvio:** O analista arrasta o mapa (pan) sem alterar zoom.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Arrasta o mapa |
| 2 | Sistema | Detecta mudanca de viewport (bounding box) com debounce 300ms |
| 3 | Sistema | Envia subscription atualizada com novo viewport, mesma precisao |
| 4 | Sistema | Backend retorna geohashes do novo viewport |
| 5 | Sistema | Adiciona novos poligonos, remove os que sairam do viewport |

> **Retorno:** Passo 9 do fluxo principal.

---

## FE01 — Sem Dados na Precisao {#fe01}

**Condicao de Desvio:** No passo 6, nao existem dados pre-agregados para a precisao solicitada.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Backend retorna dados da precisao mais proxima disponivel |
| 2 | Sistema | Exibe toast informativo: "Exibindo dados em precisao [X] (mais proxima disponivel)" |
| 3 | Sistema | Renderiza poligonos na precisao disponivel |

> **Retorno:** Passo 8 do fluxo principal.
