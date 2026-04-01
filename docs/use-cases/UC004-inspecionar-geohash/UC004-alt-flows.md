# UC004 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC004-main-flow.md)

---

## FA01 — Geohash Sem Dados de Camada 2 {#fa01}

**Condição de Desvio:** O geohash inspecionado não possui dados de infraestrutura (camada2 === null).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Aba Camada 2 exibe mensagem: "Dados de infraestrutura não disponíveis para este geohash" |
| 2 | Sistema | Aba Camada 1 funciona normalmente |

> **Retorno:** Não aplicável — card continua funcional.

---

## FA02 — Geohash Sem Dados de CRM {#fa02}

**Condição de Desvio:** O geohash não possui dados de CRM (crm === null).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Seção CRM é omitida do card Camada 1 |
| 2 | Sistema | Demais seções renderizam normalmente |

> **Retorno:** Não aplicável.

---

## FA03 — Hover Bloqueado por Pin Ativo {#fa03}

**Condição de Desvio:** Analista move cursor sobre polígono enquanto há geohash fixado.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Move cursor sobre outro polígono |
| 2 | Sistema | Polígono NÃO recebe destaque visual de hover |
| 3 | Sistema | Card lateral permanece mostrando dados do geohash fixado |
| 4 | Analista | Para ver outro geohash: clica nele (substitui pin) ou clica no pin atual (desfixa) |

> **Retorno:** Fluxo alternativo Click — Fixar.
