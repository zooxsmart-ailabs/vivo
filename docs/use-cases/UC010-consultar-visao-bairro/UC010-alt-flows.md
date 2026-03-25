# UC010 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC010-main-flow.md)

---

## FA01 — Bairro Sem Dados de Camada 2 {#fa01}

**Condicao de Desvio:** Nenhum geohash do bairro possui dados de camada2.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Secao Camada 2 e omitida do painel de detalhamento |
| 2 | Sistema | Demais secoes renderizam normalmente |

> **Retorno:** Nao aplicavel.

---

## FA02 — Busca Sem Resultados {#fa02}

**Condicao de Desvio:** A busca por nome de bairro nao retorna resultados.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Lista mostra "Nenhum bairro encontrado" |
| 2 | Sistema | Painel de detalhamento mantem ultimo bairro exibido |

> **Retorno:** Analista limpa busca.
