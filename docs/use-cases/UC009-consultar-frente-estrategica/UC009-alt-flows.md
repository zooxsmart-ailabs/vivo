# UC009 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC009-main-flow.md)

---

## FA01 — Frente EXPANSAO (Expansão) {#fa01}

**Condição de Desvio:** A frente EXPANSAO não aparece como aba, mas sim como painel complementar quando um geohash EXPANSAO é selecionado via mapa (UC001/UC004).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Detecta que geohash selecionado é EXPANSAO |
| 2 | Sistema | Substitui FlowPanel padrão pelo ExpansaoPanel |
| 3 | Sistema | Exibe 4 cards de métricas + foco infraestrutura + Camada 2 |

> **Retorno:** Não aplicável — painel alternativo completo.

---

## FA02 — Geohash com Camada 2 {#fa02}

**Condição de Desvio:** O geohash selecionado possui dados de camada2.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe seção adicional abaixo do FlowPanel |
| 2 | Sistema | Mostra classificações Fibra e Móvel com scores |
| 3 | Sistema | Mostra Decisão Integrada |

> **Retorno:** Passo 10 do fluxo principal (complemento).

---

## FA03 — Lista Vazia Após Busca {#fa03}

**Condição de Desvio:** A busca por bairro não retorna resultados.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe "Nenhum geohash encontrado" na lista |
| 2 | Sistema | FlowPanel mantém último geohash exibido |

> **Retorno:** Analista limpa busca para voltar à lista completa.
