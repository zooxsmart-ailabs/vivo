# UC007 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

---

## FA01 — Geohash Existe Apenas em Um Período {#fa01}

**Condição de Desvio:** No passo 6, um geohash tem dados em apenas um dos períodos.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe o geohash com badge "Novo" (só no base) ou "Removido" (só na comparação) |
| 2 | Sistema | Diff mostra N/A para métricas do período ausente |
| 3 | Sistema | No mapa: polígono com borda tracejada para indicar dados parciais |

> **Retorno:** Passo 7 do fluxo principal.

---

## FA02 — Desativar Modo de Comparação {#fa02}

**Condição de Desvio:** O Analista desativa o modo de comparação.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica no toggle para desativar comparação |
| 2 | Sistema | Remove indicadores de diff de todas as visualizações |
| 3 | Sistema | Restaura cores de quadrante no mapa |
| 4 | Sistema | Mantém apenas o período base selecionado |

> **Retorno:** Fluxo normal do UC006.

---

## FE01 — Período de Comparação Sem Dados {#fe01}

**Condição de Desvio:** No passo 5, o período de comparação não possui dados.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Não há dados para o período de comparação selecionado" |
| 2 | Sistema | Mantém modo de comparação ativo, picker aberto |
| 3 | Analista | Seleciona outro período de comparação |

> **Retorno:** Passo 3 do fluxo principal.
