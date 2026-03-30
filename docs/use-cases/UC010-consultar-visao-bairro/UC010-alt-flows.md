# UC010 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC010-main-flow.md)

---

## FA01 — Bairro Sem Dados de Camada 2 {#fa01}

**Condição de Desvio:** Nenhum geohash do bairro possui dados de camada2.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Seção Camada 2 e omitida do painel de detalhamento |
| 2 | Sistema | Demais secoes renderizam normalmente |

> **Retorno:** Nao aplicavel.

---

## FA02 — Busca Sem Resultados {#fa02}

**Condição de Desvio:** A busca por nome de bairro nao retorna resultados.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Lista mostra "Nenhum bairro encontrado" |
| 2 | Sistema | Painel de detalhamento mantem ultimo bairro exibido |

> **Retorno:** Analista limpa busca.
