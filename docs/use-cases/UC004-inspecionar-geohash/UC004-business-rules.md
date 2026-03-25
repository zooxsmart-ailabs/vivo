# UC004 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC004-main-flow.md)

## RN004-01 — Calculo de Prioridade por Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN004-01 |
| **Tipo** | Calculo |
| **Passos** | Card Camada 1, secao Prioridade |

**Descricao:**
Cada quadrante possui formula de score de prioridade especifica:

| Quadrante | Formula | Logica |
|-----------|---------|--------|
| RETENCAO | `share * 0.5 + (10 - vivoScore) * 5` | Alto share + baixa satisfacao = urgente |
| UPSELL | `vivoScore * 5 + share * 0.5` | Alta satisfacao + alto share = receita |
| GROWTH | `(10 - share) * 0.5 + vivoScore * 5` | Baixo share + alta satisfacao = oportunidade |
| GROWTH_RETENCAO | `(avgIncome/1000)*3 + popGrowth*5 + density/100` | Potencial demografico |

**Ranking e Percentil:**
- Geohashes sao rankeados dentro do mesmo quadrante por score decrescente
- Percentil: `((total - rank) / (total - 1)) * 100`
- Labels:

| Percentil | Label | Cor |
|-----------|-------|-----|
| >= 75 | Critico | #DC2626 |
| >= 50 | Alto | #D97706 |
| >= 25 | Medio | #2563EB |
| < 25 | Baixo | #64748B |

**Exemplo:**
- Geohash RETENCAO, share=45%, vivoScore=5.2: score = 45*0.5 + (10-5.2)*5 = 22.5+24 = 46.5
- Rank 1 de 8 geohashes RETENCAO: percentil = ((8-1)/(8-1))*100 = 100% -> Critico

---

## RN004-02 — Classificacao de Qualidade SpeedTest

| Campo | Valor |
|-------|-------|
| **ID** | RN004-02 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao SpeedTest Tecnico |

**Descricao:**

| Label | Cor | Criterio (inferido) |
|-------|-----|---------------------|
| Excelente | #16A34A | Download >= 100 Mbps AND latencia <= 20ms |
| Bom | #2563EB | Download >= 50 Mbps AND latencia <= 40ms |
| Regular | #D97706 | Download >= 20 Mbps OR latencia <= 60ms |
| Ruim | #DC2626 | Demais casos |

---

## RN004-03 — Geracao Automatica de Insights

| Campo | Valor |
|-------|-------|
| **ID** | RN004-03 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao Insights |

**Descricao:**
O sistema gera ate 2 insights automaticos por geohash, priorizados na ordem:

1. **Satisfacao vs Media Estadual**
   - Trigger: |vivoScore - 6.8| >= 0.2
   - Tipo: positive se acima, negative se abaixo
   - Texto: "Satisfacao X% [acima|abaixo] da media estadual (6.8)"

2. **Share vs Media Nacional**
   - Trigger: |share - 32| >= 3 pp
   - Tipo: positive se acima, negative se abaixo
   - Texto: "+/-X pp [acima|abaixo] da media nacional"

3. **Gap Competitivo**
   - Trigger: |vivoScore - max(timScore, claroScore)| >= 0.3
   - Tipo: positive se Vivo lidera, warning se atras
   - Texto: "Vivo lidera +X pts vs [TIM|CLARO]" ou "Vivo atras -X pts de [TIM|CLARO]"

4. **Share vs Media da Cidade** (fallback se < 2 insights)
   - Trigger: |share - 38| >= 3 pp

**Estilos de Insight:**

| Tipo | Background | Borda | Texto |
|------|-----------|-------|-------|
| positive | #F0FDF4 | #BBF7D0 | #15803D |
| negative | #FEF2F2 | #FECACA | #DC2626 |
| warning | #FFFBEB | #FDE68A | #B45309 |
| neutral | #F8FAFC | #E2E8F0 | #475569 |

---

## RN004-04 — Classificacao Fibra (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-04 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 2, secao Fibra |

**Descricao:**

| Classificacao | Cor | Condicao | Campos Adicionais |
|---------------|-----|----------|-------------------|
| AUMENTO_CAPACIDADE | #EF4444 | Fibra presente, ocupacao > 85% | taxaOcupacao (%), portasDisponiveis (%) |
| EXPANSAO_NOVA_AREA | #F97316 | Sem cobertura fibra (greenfield) | potencialMercado (%), sinergiaMovel (%) |
| SAUDAVEL | #22C55E | Fibra presente, ocupacao <= 85% | — |

**Score 0-100 (saude da infra):**

| Score | Label | Cor |
|-------|-------|-----|
| >= 80 | Critico | #DC2626 |
| >= 60 | Alto | #D97706 |
| >= 40 | Medio | #2563EB |
| < 40 | Baixo | #16A34A |

---

## RN004-05 — Classificacao Movel (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-05 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 2, secao Movel |

**Descricao:**

| Classificacao | Cor | Condicao | Campos Adicionais |
|---------------|-----|----------|-------------------|
| MELHORA_QUALIDADE | #EF4444 | Cobertura existe, qualidade ruim | speedtestScore (/100) |
| SAUDAVEL | #22C55E | Cobertura e qualidade OK | — |
| EXPANSAO_5G | #7C3AED | Sem 5G, segmento premium | concentracaoRenda (%) |
| EXPANSAO_4G | #3B82F6 | Sem 4G (legacy 2G/3G) | concentracaoRenda (%) |

Score e labels identicos a RN004-04.

---

## RN004-06 — Prioridade de Exibicao: Pin > Hover > Vazio

| Campo | Valor |
|-------|-------|
| **ID** | RN004-06 |
| **Tipo** | Validacao |
| **Passos** | Fluxo Principal e Alternativo |

**Descricao:**
O card lateral exibe o geohash determinado por:

```
displayedGeohash = pinnedGeohash ?? hoveredGeohash ?? null
```

- Se pinnedGeohash != null: card mostra pin, hover NAO atualiza
- Se pinnedGeohash == null: card segue hover
- Se ambos null: card mostra estado vazio "Territorios de Acao"

Apenas 1 geohash pode estar fixado por vez.
