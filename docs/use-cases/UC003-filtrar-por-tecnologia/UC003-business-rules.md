# UC003 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC003-main-flow.md)

## RN003-01 — Cores Independentes de Tecnologia

| Campo | Valor |
|-------|-------|
| **ID** | RN003-01 |
| **Tipo** | Validação |
| **Passos** | Passo 4 |

**Descrição:**
O filtro de tecnologia NUNCA altera as cores dos poligonos. Cores sao sempre derivadas do quadrante (RN001-02). O filtro apenas mostra/oculta poligonos.

**Exemplo:**
- Filtro FIBRA ativo: geohash OPORTUNIDADE com tech=FIBRA aparece verde (nao azul)
- Filtro MOVEL ativo: geohash RISCO com tech=MOVEL aparece vermelho (nao laranja)

---

## RN003-02 — Nota de Filtro na Legenda

| Campo | Valor |
|-------|-------|
| **ID** | RN003-02 |
| **Tipo** | Derivação |
| **Passos** | Passo 7 |

**Descrição:**
Quando techFilter != "TODOS", a legenda exibe nota informativa:

> "Exibindo apenas geohashes de [TECNOLOGIA] — cores mantidas por quadrante estratégico"

Com dot colorido da tecnologia ativa.

---

## RN003-03 — Categorias de Tecnologia

| Campo | Valor |
|-------|-------|
| **ID** | RN003-03 |
| **Tipo** | Derivação |
| **Passos** | Passo 1 |

**Descrição:**

| Categoria | Filtro | Cor | Ícone |
|-----------|--------|-----|-------|
| TODOS | Todos os geohashes | #64748B | Sliders |
| FIBRA | technology === "FIBRA" OR "AMBOS" | #0EA5E9 | Wifi |
| MOVEL | technology === "MOVEL" OR "AMBOS" | #F97316 | Signal |
| AMBOS | technology === "AMBOS" | #8B5CF6 | F+M |

Nota: geohashes com technology="AMBOS" aparecem nos filtros FIBRA, MOVEL e AMBOS.
