# UC010 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC010-main-flow.md)

## RN010-01 — Agregação por Bairro (BairroData)

| Campo | Valor |
|-------|-------|
| **ID** | RN010-01 |
| **Tipo** | Cálculo |
| **Passos** | Passo 3 |

**Descrição:**
Geohashes são agrupados por `neighborhood`. Para cada bairro, calcula-se:

| Campo Agregado | Fórmula |
|----------------|---------|
| totalPopulation | SUM(totalPopulation) de todos geohashes |
| totalClients | SUM(activeClients) |
| avgShare | AVG(marketShare.percentage) |
| avgVivoScore | AVG(satisfactionScores[VIVO].score) — arredondado 1 decimal |
| avgTimScore | AVG(satisfactionScores[TIM].score) |
| avgClaroScore | AVG(satisfactionScores[CLARO].score) |
| avgIncome | AVG(demographics.avgIncome) — somente geohashes com dado |
| totalDomicilios | SUM(shareTrend.fibra.totalDomicilios) — somente com fibra |
| trendUp/Down/Stable | COUNT por direção de trend |
| dominantTrend | Moda (trend com mais geohashes) |
| trendDelta | AVG(shareTrend.delta) |
| quadrantCounts | COUNT por quadrante (ex: {OPORTUNIDADE: 2, RISCO: 3}) |
| dominantQuadrant | Quadrante com maior contagem |

A lista de bairros é ordenada por `totalClients DESC`.

---

## RN010-02 — Ranking por Categoria

| Campo | Valor |
|-------|-------|
| **ID** | RN010-02 |
| **Tipo** | Derivação |
| **Passos** | Passo 6-7 |

**Descrição:**
Ao selecionar uma categoria (ex: OPORTUNIDADE), a lista mostra apenas bairros que possuem >= 1 geohash no quadrante OPORTUNIDADE, ordenados pela contagem de geohashes nesse quadrante.

**Badges de posição:**
- #1, #2, #3: background colorido (opacidade decrescente)
- Demais: background 10% com texto colorido

---

## RN010-03 — Cores de Satisfação

| Campo | Valor |
|-------|-------|
| **ID** | RN010-03 |
| **Tipo** | Derivação |
| **Passos** | Painel de Detalhamento |

**Descrição:**

| Score | Cor |
|-------|-----|
| >= 7.0 | #22C55E (verde) |
| >= 6.0 | #EAB308 (amarelo) |
| < 6.0 | #EF4444 (vermelho) |

---

## RN010-04 — Delta vs Melhor Concorrente

| Campo | Valor |
|-------|-------|
| **ID** | RN010-04 |
| **Tipo** | Cálculo |
| **Passos** | Painel KPIs |

**Descrição:**
```
bestCompetitor = MAX(avgTimScore, avgClaroScore)
delta = avgVivoScore - bestCompetitor
```

| Delta | Ícone | Cor |
|-------|-------|-----|
| > 0 | TrendingUp | #16A34A |
| < 0 | TrendingDown | #DC2626 |
| = 0 | Minus | #64748B |

---

## RN010-05 — Labels Estratégicos por Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN010-05 |
| **Tipo** | Derivação |
| **Passos** | Seção Camada 1 |

**Descrição:**

| Quadrante | Label |
|-----------|-------|
| RISCO | "Risco de churn" |
| FORTALEZA | "Upsell" |
| OPORTUNIDADE | "Aquisição" |
| OPORTUNIDADE_RISCO | "Dupla frente" |

---

## RN010-06 — Score de Infraestrutura Agregado

| Campo | Valor |
|-------|-------|
| **ID** | RN010-06 |
| **Tipo** | Cálculo |
| **Passos** | Seção Camada 2 |

**Descrição:**
Para Camada 2 do bairro, agregar geohashes com dados de infraestrutura:

**Fibra:**
- Filtrar geohashes com `camada2.fibra`
- Score médio: `AVG(camada2.fibra.score)`
- Contagem por classificação: {AUMENTO_CAPACIDADE: N, EXPANSAO_NOVA_AREA: M, SAUDAVEL: K}

**Móvel:**
- Filtrar geohashes com `camada2.movel`
- Score médio: `AVG(camada2.movel.score)`
- Contagem por classificação: {MELHORA_QUALIDADE: N, SAUDAVEL: M, EXPANSAO_5G: K, EXPANSAO_4G: J}

**Cores do score médio (threshold diferente do UC004):**

| Score | Cor |
|-------|-----|
| >= 70 | #EF4444 (vermelho) |
| >= 40 | #F97316 (laranja) |
| < 40 | #22C55E (verde) |
