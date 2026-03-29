# UC004 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC004-main-flow.md)

**Versao**: 2.0 | **Data**: 2026-03-29 | **Fonte**: Levantamento v1203

## RN004-01 — Calculo de Prioridade por Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN004-01 |
| **Tipo** | Calculo |
| **Passos** | Card Camada 1, secao Prioridade |

**Descricao:**
Formulas de prioridade ponderadas por quadrante (Levantamento sec.score):

**RISCO** (share alto + satisfacao baixa):

| Variavel | Peso | Descricao |
|----------|------|-----------|
| Share Vivo | 30% | Quanto mais share, mais a perder |
| Risco de Churn | 25% | Baseado na satisfacao vs concorrentes |
| Delta Share | 15% | Se esta caindo, prioridade maior |
| ARPU/Renda | 15% | Valor do cliente (proxy: renda da regiao) |
| QoE/Pontuacao | 15% | Qualidade tecnica da rede |

**FORTALEZA** (share alto + satisfacao alta):

| Variavel | Peso | Descricao |
|----------|------|-----------|
| Margem/Satisfacao | 30% | Clientes satisfeitos propensam a upgrade |
| Share Vivo | 20% | Base instalada |
| Renda da Regiao | 20% | Poder aquisitivo |
| QoE Tecnico | 15% | Qualidade da rede |
| Populacao | 15% | Volume de clientes potenciais |

**OPORTUNIDADE** (share baixo + satisfacao alta):

| Variavel | Peso | Descricao |
|----------|------|-----------|
| Cobertura/QoE | 25% | Qualidade da rede atrai clientes |
| Satisfacao | 20% | Qualidade ja percebida positivamente |
| Renda | 20% | Potencial de receita |
| Populacao | 20% | Volume de leads |
| Delta Share | 15% | Tendencia de crescimento |

**EXPANSAO** (share baixo + satisfacao baixa):

| Variavel | Peso | Descricao |
|----------|------|-----------|
| Renda | 30% | Foco em areas de alto valor |
| Populacao | 25% | Volume justifica investimento |
| Cobertura | 25% | Necessidade de infraestrutura |
| Delta Share | 20% | Tendencia de mercado |

**Labels de prioridade (score absoluto 0-10):**

| Label | Score | Prazo RISCO | Prazo outros |
|-------|-------|-------------|--------------|
| P1 — Critica | >= 8.5 | < 7 dias | < 30 dias |
| P2 — Alta | 6.0-8.4 | < 30 dias | < 30 dias |
| P3 — Media | 4.0-5.9 | 30-60 dias | 30-60 dias |
| P4 — Baixa | < 4.0 | 90 dias | 90 dias |

---

## RN004-02 — Classificacao de Qualidade SpeedTest

| Campo | Valor |
|-------|-------|
| **ID** | RN004-02 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao SpeedTest |

Sem alteracao. Mesmos thresholds da v1.

---

## RN004-03 — Geracao Automatica de Insights

| Campo | Valor |
|-------|-------|
| **ID** | RN004-03 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao Insights |

**Descricao (atualizada com thresholds v1203):**

1. **Satisfacao vs Threshold**: |vivoScore - 7.5| >= 0.5 (threshold alto) ou |vivoScore - 6.0| (threshold baixo)
2. **Share vs Nacional**: |share - 32| >= 3 pp
3. **Gap Competitivo**: |vivoScore - max(tim, claro)| >= 0.3 — agora com posicao competitiva (RN004-07)
4. **Tendencia**: delta share > +1.0 pp (ganhando) ou < -1.0 pp (perdendo)

---

## RN004-04 — Classificacao Fibra (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-04 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 2, secao Fibra |

**Motor de decisao (Levantamento — fluxograma):**

```
Tem Fibra Vivo? (presenca FTTH no geohash)
  SIM → Ocupacao Critica? (>85% ou <5 portas)
    SIM → AUMENTO_CAPACIDADE
    NAO → SAUDAVEL (Monitorar)
  NAO → EXPANSAO_NOVA_AREA (Greenfield)
```

**Score AUMENTO_CAPACIDADE (0-100):**
- 60% Taxa de Ocupacao (nivel de utilizacao da fibra instalada)
- 40% Valor da Area (renda media + ARPU)

**Score EXPANSAO_NOVA_AREA (0-100):**
- 50% Potencial de Mercado (renda media × densidade populacional)
- 50% Sinergia com Movel (share movel Vivo no geohash — base movel facilita cross-sell)

---

## RN004-05 — Classificacao Movel (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-05 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 2, secao Movel |

**Motor de decisao (Levantamento — fluxograma):**

```
Tem Cobertura? (sinal detectado/ERB no geohash)
  SIM → Qualidade Ruim? (SpeedTest < benchmark)
    SIM → MELHORA_QUALIDADE
    NAO → SAUDAVEL (Rede Saudavel)
  NAO → EXPANSAO_COBERTURA (White Spots / sinal fraco)
```

**Trilhas internas de MELHORA_QUALIDADE e EXPANSAO_COBERTURA:**
- **Trilha 5G (Premium)**: areas de alto valor, renda alta
- **Trilha 4G (Mass)**: areas de volume, cobertura basica

---

## RN004-06 — Prioridade de Exibicao: Pin > Hover > Vazio

| Campo | Valor |
|-------|-------|
| **ID** | RN004-06 |
| **Tipo** | Validacao |
| **Passos** | Fluxo Principal e Alternativo |

Sem alteracao. `displayedGeohash = pinnedGeohash ?? hoveredGeohash ?? null`.

---

## RN004-07 — Posicao Competitiva

| Campo | Valor |
|-------|-------|
| **ID** | RN004-07 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao Satisfacao |

**Descricao (Levantamento sec.4):**
Delta competitiva = Score Vivo - Melhor Score Concorrente no mesmo geohash.

| Posicao | Delta | Risco | Cor |
|---------|-------|-------|-----|
| Lider | > +0.5 | Baixo | Verde/Azul |
| Competitivo | 0 a +0.5 | Medio | Verde |
| Emparedada | -0.5 a 0 | Medio-Alto | Amarelo |
| Abaixo | -1.0 a -0.5 | Alto | Vermelho |
| Isolada | < -1.8 | Critico | Vermelho escuro |

Exibida como badge no card lateral, secao de satisfacao.
