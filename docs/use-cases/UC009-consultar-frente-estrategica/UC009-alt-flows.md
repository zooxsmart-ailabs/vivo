# UC009 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC009-main-flow.md)

---

## FA01 — Frente EXPANSAO (Expansao) {#fa01}

**Condicao de Desvio:** A frente EXPANSAO nao aparece como aba, mas sim como painel complementar quando um geohash EXPANSAO e selecionado via mapa (UC001/UC004).

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Detecta que geohash selecionado e EXPANSAO |
| 2 | Sistema | Substitui FlowPanel padrao pelo ExpansaoPanel |
| 3 | Sistema | Exibe 4 cards de metricas + foco infraestrutura + Camada 2 |

> **Retorno:** Nao aplicavel — painel alternativo completo.

---

## FA02 — Geohash com Camada 2 {#fa02}

**Condicao de Desvio:** O geohash selecionado possui dados de camada2.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe secao adicional abaixo do FlowPanel |
| 2 | Sistema | Mostra classificacoes Fibra e Movel com scores |
| 3 | Sistema | Mostra Decisao Integrada |

> **Retorno:** Passo 10 do fluxo principal (complemento).

---

## FA03 — Lista Vazia Apos Busca {#fa03}

**Condicao de Desvio:** A busca por bairro nao retorna resultados.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe "Nenhum geohash encontrado" na lista |
| 2 | Sistema | FlowPanel mantem ultimo geohash exibido |

> **Retorno:** Analista limpa busca para voltar a lista completa.
