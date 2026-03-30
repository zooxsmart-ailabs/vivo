# UC007 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

---

## FA01 — Geohash Existe Apenas em Um Período {#fa01}

**Condição de Desvio:** No passo 6, um geohash tem dados em apenas um dos períodos.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe o geohash com badge "Novo" (so no base) ou "Removido" (so na comparação) |
| 2 | Sistema | Diff mostra N/A para métricas do período ausente |
| 3 | Sistema | No mapa: poligono com borda tracejada para indicar dados parciais |

> **Retorno:** Passo 7 do fluxo principal.

---

## FA02 — Desativar Modo Comparação {#fa02}

**Condição de Desvio:** O Analista desativa o modo comparação.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica no toggle para desativar comparação |
| 2 | Sistema | Remove indicadores de diff de todas as visualizacoes |
| 3 | Sistema | Restaura cores de quadrante no mapa |
| 4 | Sistema | Mantem apenas o período base selecionado |

> **Retorno:** Fluxo normal do UC006.

---

## FE01 — Período de Comparação Sem Dados {#fe01}

**Condição de Desvio:** No passo 5, o período de comparação nao possui dados.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Nao ha dados para o período de comparação selecionado" |
| 2 | Sistema | Mantem modo comparação ativo, picker aberto |
| 3 | Analista | Seleciona outro período de comparação |

> **Retorno:** Passo 3 do fluxo principal.
