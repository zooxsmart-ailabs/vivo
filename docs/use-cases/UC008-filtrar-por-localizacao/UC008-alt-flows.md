# UC008 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC008-main-flow.md)

---

## FA01 — Localizacao Sem Dados no Periodo {#fa01}

**Condicao de Desvio:** A localizacao selecionada nao possui dados no periodo ativo (UC006).

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Sem dados para [Cidade] no periodo selecionado" |
| 2 | Sistema | Mapa mostra viewport vazio |
| 3 | Sistema | Sugere: "Tente ampliar o periodo ou selecionar outra cidade" |

> **Retorno:** Passo 1 do fluxo principal (ou UC006 para ajuste de periodo).

---

## FE01 — Geocoding Reverso Falha {#fe01}

**Condicao de Desvio:** O geocoding reverso nao consegue identificar a cidade do centro do mapa.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Mantem ultima localizacao conhecida no seletor |
| 2 | Sistema | Dados continuam filtrados pela ultima localizacao valida |
| 3 | Sistema | Log do erro no SigNoz |

> **Retorno:** Nao aplicavel — operacao silenciosa.
