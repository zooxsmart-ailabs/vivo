# UC007 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

---

## FA01 — Geohash Existe Apenas em Um Periodo {#fa01}

**Condicao de Desvio:** No passo 6, um geohash tem dados em apenas um dos periodos.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe o geohash com badge "Novo" (so no base) ou "Removido" (so na comparacao) |
| 2 | Sistema | Diff mostra N/A para metricas do periodo ausente |
| 3 | Sistema | No mapa: poligono com borda tracejada para indicar dados parciais |

> **Retorno:** Passo 7 do fluxo principal.

---

## FA02 — Desativar Modo Comparacao {#fa02}

**Condicao de Desvio:** O Analista desativa o modo comparacao.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica no toggle para desativar comparacao |
| 2 | Sistema | Remove indicadores de diff de todas as visualizacoes |
| 3 | Sistema | Restaura cores de quadrante no mapa |
| 4 | Sistema | Mantem apenas o periodo base selecionado |

> **Retorno:** Fluxo normal do UC006.

---

## FE01 — Periodo de Comparacao Sem Dados {#fe01}

**Condicao de Desvio:** No passo 5, o periodo de comparacao nao possui dados.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast: "Nao ha dados para o periodo de comparacao selecionado" |
| 2 | Sistema | Mantem modo comparacao ativo, picker aberto |
| 3 | Analista | Seleciona outro periodo de comparacao |

> **Retorno:** Passo 3 do fluxo principal.
