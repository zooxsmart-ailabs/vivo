# UC008 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC008-main-flow.md)

---

## FA01 — Localização Sem Dados no Período {#fa01}

**Condição de Desvio:** A localização selecionada não possui dados no período ativo (UC006).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Sem dados para [Cidade] no período selecionado" |
| 2 | Sistema | Mapa mostra viewport vazio |
| 3 | Sistema | Sugere: "Tente ampliar o período ou selecionar outra cidade" |

> **Retorno:** Passo 1 do fluxo principal (ou UC006 para ajuste de período).

---

## FE01 — Geocoding Reverso Falha {#fe01}

**Condição de Desvio:** O geocoding reverso não consegue identificar a cidade do centro do mapa.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Mantém última localização conhecida no seletor |
| 2 | Sistema | Dados continuam filtrados pela última localização válida |
| 3 | Sistema | Log do erro no SigNoz |

> **Retorno:** Não aplicável — operação silenciosa.
