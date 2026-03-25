# UC010 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC010-main-flow.md)

## RN010-01 — Agregacao por Bairro (BairroData)

| Campo | Valor |
|-------|-------|
| **ID** | RN010-01 |
| **Tipo** | Calculo |
| **Passos** | Passo 3 |

**Descricao:**
Geohashes sao agrupados por `neighborhood`. Para cada bairro, calcula-se:

| Campo Agregado | Formula |
|----------------|---------|
| totalPopulation | SUM(totalPopulation) de todos geohashes |
| totalClients | SUM(activeClients) |
| avgShare | AVG(marketShare.percentage) |
| avgVivoScore | AVG(satisfactionScores[VIVO].score) — arredondado 1 decimal |
| avgTimScore | AVG(satisfactionScores[TIM].score) |
| avgClaroScore | AVG(satisfactionScores[CLARO].score) |
| avgIncome | AVG(demographics.avgIncome) — somente geohashes com dado |
| totalDomicilios | SUM(shareTrend.fibra.totalDomicilios) — somente com fibra |
| trendUp/Down/Stable | COUNT por direcao de trend |
| dominantTrend | Moda (trend com mais geohashes) |
| trendDelta | AVG(shareTrend.delta) |
| quadrantCounts | COUNT por quadrante (ex: {GROWTH: 2, RETENCAO: 3}) |
| dominantQuadrant | Quadrante com maior contagem |

A lista de bairros e ordenada por `totalClients DESC`.

---

## RN010-02 — Ranking por Categoria

| Campo | Valor |
|-------|-------|
| **ID** | RN010-02 |
| **Tipo** | Derivacao |
| **Passos** | Passo 6-7 |

**Descricao:**
Ao selecionar uma categoria (ex: GROWTH), a lista mostra apenas bairros que possuem >= 1 geohash no quadrante GROWTH, ordenados pela contagem de geohashes nesse quadrante.

**Badges de posicao:**
- #1, #2, #3: background colorido (opacidade decrescente)
- Demais: background 10% com texto colorido

---

## RN010-03 — Cores de Satisfacao

| Campo | Valor |
|-------|-------|
| **ID** | RN010-03 |
| **Tipo** | Derivacao |
| **Passos** | Painel de Detalhamento |

**Descricao:**

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
| **Tipo** | Calculo |
| **Passos** | Painel KPIs |

**Descricao:**
```
bestCompetitor = MAX(avgTimScore, avgClaroScore)
delta = avgVivoScore - bestCompetitor
```

| Delta | Icone | Cor |
|-------|-------|-----|
| > 0 | TrendingUp | #16A34A |
| < 0 | TrendingDown | #DC2626 |
| = 0 | Minus | #64748B |

---

## RN010-05 — Labels Estrategicos por Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN010-05 |
| **Tipo** | Derivacao |
| **Passos** | Secao Camada 1 |

**Descricao:**

| Quadrante | Label |
|-----------|-------|
| RETENCAO | "Risco de churn" |
| UPSELL | "Upsell" |
| GROWTH | "Aquisicao" |
| GROWTH_RETENCAO | "Dupla frente" |

---

## RN010-06 — Score de Infraestrutura Agregado

| Campo | Valor |
|-------|-------|
| **ID** | RN010-06 |
| **Tipo** | Calculo |
| **Passos** | Secao Camada 2 |

**Descricao:**
Para Camada 2 do bairro, agregar geohashes com dados de infraestrutura:

**Fibra:**
- Filtrar geohashes com `camada2.fibra`
- Score medio: `AVG(camada2.fibra.score)`
- Contagem por classificacao: {AUMENTO_CAPACIDADE: N, EXPANSAO_NOVA_AREA: M, SAUDAVEL: K}

**Movel:**
- Filtrar geohashes com `camada2.movel`
- Score medio: `AVG(camada2.movel.score)`
- Contagem por classificacao: {MELHORA_QUALIDADE: N, SAUDAVEL: M, EXPANSAO_5G: K, EXPANSAO_4G: J}

**Cores do score medio (threshold diferente do UC004):**

| Score | Cor |
|-------|-----|
| >= 70 | #EF4444 (vermelho) |
| >= 40 | #F97316 (laranja) |
| < 40 | #22C55E (verde) |
