# UC004 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC004-main-flow.md)

**Versao**: 3.0 | **Data**: 2026-03-30 | **Fonte**: ZooxMap_Indicadores_Unificado_v2.pdf (Fev 2026)

## RN004-01 — Calculo de Prioridade por Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN004-01 |
| **Tipo** | Calculo |
| **Passos** | Card Camada 1, secao Prioridade |

**Descricao:**
Formulas de prioridade ponderadas por quadrante (Levantamento v2 sec. Score de Priorizacao).
Todas as variaveis normalizadas 0-10 antes de aplicar os pesos. Score final: 0-10.

**RETENCAO** (share >= 35% + QoE < 5.0) — *Prioriza geohashes com MAIOR base em risco:*

`Score = (10-Sat)x0.30 + Sharex0.25 + (10-Delta)x0.25 + Popx0.10 + Crescx0.10`

| Variavel | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Satisfacao (invertida) | - direto | 30% | Qualidade baixa = maior risco de churn. Invertida: quanto pior, maior o score |
| Share Atual | + direto | 25% | Quanto mais share, mais clientes em risco de perder |
| Delta de Share (invertido) | - delta | 25% | Perda de share = deterioracao acelerada, urgencia maior |
| Populacao | + direto | 10% | Mais habitantes = mais clientes impactados pela ma experiencia |
| Cresc. Pop. | + direto | 10% | Regiao crescendo = perda futura amplificada |

**UPSELL** (share >= 35% + QoE >= 7.01) — *Prioriza geohashes com MAIOR potencial de receita incremental:*

`Score = Sharex0.30 + Satx0.25 + Rendax0.25 + Deltax0.10 + Popx0.10`

| Variavel | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Share Atual | + direto | 30% | Maior a base, maior o potencial de upsell incremental |
| Satisfacao | + direto | 25% | Clientes satisfeitos tem maior propensao a upgrade e menor churn |
| Renda Media | + direto | 25% | Proxy de ARPU. Renda alta = maior ticket medio por cliente |
| Delta de Share | + direto | 10% | Momentum positivo reforca a oportunidade de capitalizacao |
| Populacao | + direto | 10% | Mais habitantes = maior mercado endereçavel para upsell |

**GROWTH** (share < 35% + QoE >= 7.01) — *Prioriza geohashes com MAIOR gap de share + retorno esperado:*

`Score = (10-Share)x0.25 + Satx0.20 + Rendax0.20 + Crescx0.20 + Deltax0.15`

| Variavel | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Share Atual (invertido) | - direto | 25% | Quanto menor o share, maior o gap a conquistar. Invertido: share baixo = score alto |
| Satisfacao | + direto | 20% | Qualidade tecnica elevada facilita a conversao de novos clientes |
| Renda Media | + direto | 20% | Renda alta = clientes com maior valor potencial (ARPU) |
| Cresc. Pop. | + direto | 20% | Regioes crescendo rapidamente terao mais clientes a adquirir nos proximos 12-24 meses |
| Delta de Share | + direto | 15% | Momentum positivo indica que a estrategia de captacao ja esta funcionando |

**GROWTH_RETENCAO** (zona intermediaria) — *Prioriza geohashes com MAIOR potencial futuro:*

`Score = Deltax0.30 + Crescx0.25 + Rendax0.20 + Satx0.15 + Sharex0.10`

| Variavel | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Delta de Share | + direto | 30% | Crescimento de share = estrategia funcionando, investir no momentum |
| Cresc. Pop. | + direto | 25% | Demanda futura: regioes crescendo rapidamente |
| Renda Media | + direto | 20% | Potencial de ARPU. Crescimento em regioes de alta renda = maior retorno |
| Satisfacao | + direto | 15% | Qualidade crescente facilita retencao dos clientes adquiridos |
| Share Atual | + direto | 10% | Base existente como ponto de partida para crescimento incremental |

**Labels de prioridade (Levantamento v2 — score normalizado 0-10):**

| Label | Score | Prazo | Acao |
|-------|-------|-------|------|
| P1 — Critica | > 7.5 | Acao imediata | Task force ou retencao urgente |
| P2 — Alta | 6.0-7.4 | Curto prazo (30-60 dias) | Plano de acao estruturado |
| P3 — Media | 4.5-5.9 | Medio prazo (60-90 dias) | Monitorar e agir no medio prazo |
| P4 — Baixa | < 4.5 | Baixa urgencia (> 90 dias) | Monitoramento continuo |

---

## RN004-02 — Classificacao de Qualidade SpeedTest

| Campo | Valor |
|-------|-------|
| **ID** | RN004-02 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao SpeedTest |

Sem alteracao. Mesmos thresholds da v2: EXCELENTE (DL>=100Mbps e latencia<=20ms),
BOM (DL>=50 e lat<=40), REGULAR, RUIM.

---

## RN004-03 — Geracao Automatica de Insights

| Campo | Valor |
|-------|-------|
| **ID** | RN004-03 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 1, secao Insights |

**Descricao (thresholds v2):**

1. **Satisfacao vs Threshold**: vivoScore >= 7.01 = "Satisfacao alta" | < 5.0 = "Satisfacao critica"
2. **Share vs Nacional**: |share - 32%| >= 3 pp — exibe comparativo com media nacional
3. **Gap Competitivo**: vivoScore - MAX(tim, claro). Exibe posicao competitiva (RN004-07)
4. **Tendencia**: delta share > +1.0 pp (ganhando mercado) ou < -1.0 pp (perdendo mercado)

---

## RN004-04 — Classificacao Fibra (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-04 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 2, secao Fibra |

**Motor de decisao (Levantamento v2 — arvore de decisao Fibra):**

```
Tem fibra Vivo na area? (presenca de FTTH no geohash)
  NAO → SEM_FIBRA (area sem infraestrutura de fibra optica)
  SIM → (2) Ocupacao Critica? (taxa_ocupacao > 85% OU portas_disponiveis < 5)
    SIM → AUMENTO_CAPACIDADE (rede saturada, expansao urgente)
    NAO → SAUDAVEL (infra em bom estado, monitorar)
```

**Score AUMENTO_CAPACIDADE (0-100):**
`Score = (Taxa_Ocupacao, n=0.60) + (Valor_Area, n=0.40)`
- Taxa de Ocupacao (60%): nivel de utilizacao da fibra instalada. >= 85% = max urgencia
- Valor da Area (40%): Renda Media (Zoox) + Densidade Pop (IBGE) + ARPU (CRM). Normalizado 0-100

**Score EXPANSAO_NOVA_AREA (0-100):**
`Score = (Potencial_Mercado, n=0.50) + (Sinergia_Movel, n=0.50)`
- Potencial de Mercado (50%): combinacao de Renda Media x Densidade Populacional (Zoox/IBGE)
- Sinergia com Movel (50%): share movel Vivo no geohash — base movel facilita cross-sell fibra

**Alerta de Saturacao**: taxa_ocupacao > 85% OU score_label movel = CRITICO
- Gera alerta automatico no dashboard ZooxMap (flag `alerta_saturacao = TRUE`)

---

## RN004-05 — Classificacao Movel (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-05 |
| **Tipo** | Derivacao |
| **Passos** | Card Camada 2, secao Movel |

**Motor de decisao (Levantamento v2 — arvore de decisao Movel):**

```
Tem cobertura? (ERB Vivo no geohash)
  NAO → Expansao de Cobertura (White Spot)
    → Separacao 4G/5G (ver criterio abaixo)
       SG_PREMIUM → EXPANSAO_COBERTURA_5G
       4G_MASS    → EXPANSAO_COBERTURA_4G
  SIM → Qualidade Ruim? (SpeedTest < benchmark 4.0/10)
    SIM → Melhora de Qualidade
      → Separacao 4G/5G (ver criterio abaixo)
         SG_PREMIUM → MELHORA_QUALIDADE_5G
         4G_MASS    → MELHORA_QUALIDADE_4G
    NAO → SAUDAVEL (rede em bom estado)
```

**Criterio de separacao 4G/5G:**

| Criterio | Sinal para 5G (SG_PREMIUM) | Sinal para 4G (4G_MASS) |
|----------|---------------------------|-------------------------|
| Renda Media (Zoox/IBGE) | Alta (>= R$5k-10k) | Media/Baixa (< R$5k) |
| Device Tier (CRM) | Premium ou Mid | Basic |
| Consumo de Dados (CRM) | Alto (GB/mes acima media) | Padrao ou baixo |

Logica: **Alta Renda + Mid/Premium Device → 5G Premium | demais → 4G Mass**

**Score de Intervencao por Trilha (0-100):**

**MELHORA_QUALIDADE_5G** (Perfil Premium, cobertura existe, qualidade ruim):
`Score = (Score_SpeedTest_inv, n=0.40) + (ARPU, n=0.30) + (Consumo_Dados, n=0.30)`
- Score SpeedTest invertido (40%): KPI primario de qualidade/latencia (invertido = gap de performance)
- Valor da Base — ARPU (30%): Renda alta = maior valor em risco
- Consumo de Dados — CRM (30%): volume de GB trafegados, proxy de demanda por capacidade 5G

**EXPANSAO_COBERTURA_5G** (White Spot, sem cobertura 5G, Perfil Premium):
`Score = (Concentracao_Renda, n=0.60) + (Vulnerabilidade_Concorrencia, n=0.40)`
- Concentracao de Renda (60%): prioriza geohashes com alta renda domiciliar (ARPU potencial)
- Vulnerabilidade da Concorrencia (40%): SpeedTest concorrente com baixa satisfacao = janela de ataque

**MELHORA_QUALIDADE_4G** (Perfil Massivo, cobertura existe, qualidade ruim):
`Score = (Gap_Performance, n=0.60) + (Volume_Usuarios, n=0.40)`
- Gap de Performance (60%): diferenca entre benchmark minimo 4G e SpeedTest atual
- Volume de Usuarios (40%): densidade populacional afetada — mais usuarios = maior impacto

**EXPANSAO_COBERTURA_4G** (White Spot, sem cobertura 4G, Perfil Massivo):
`Score = (Densidade_Demografica, n=0.60) + (Vulnerabilidade_Concorrencia, n=0.40)`
- Densidade Demografica (60%): prioriza onde ha mais pessoas sem cobertura (ERB por km2)
- Vulnerabilidade da Concorrencia (40%): SpeedTest concorrente baixo = oportunidade de captura

**Faixas do score_label:**

| Faixa | Label | Cor | Interpretacao |
|-------|-------|-----|---------------|
| 0-39 | BAIXO | #16A34A (Verde) | Intervencao nao prioritaria |
| 40-59 | MEDIO | #2563EB (Azul) | Monitoramento recomendado |
| 60-79 | ALTO | #D97706 (Ambar) | Intervencao recomendada em curto prazo |
| 80-100 | CRITICO | #DC2626 (Vermelho) | Intervencao urgente, degradacao severa |

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

**Descricao (Levantamento v2 sec.4):**
Delta competitivo = Score Vivo - Melhor Score Concorrente no mesmo geohash.
`Delta = Score_Vivo - MAX(Score_TIM, Score_Claro)`

| Posicao | Delta | Risco | Cor | Retencao Estrategica |
|---------|-------|-------|-----|----------------------|
| Lider | > +0.5 | Baixo | Verde Escuro | Baixo — clientes satisfeitos sem motivo para trocar |
| Competitivo | 0 a +0.5 | Medio | Verde | Medio — qualquer queda de qualidade pode inverter |
| Empatado | -0.5 a 0 | Medio-Alto | Amarelo | Medio-Alto — decisao por preco e promocao |
| Abaixo | -1.0 a -0.5 | Alto | Laranja | Alto — clientes expostos a argumentos de venda |
| Critico | < -1.0 | Muito Alto | Vermelho | Muito Alto — churn acelerado e perda de share iminente |

Exibida como badge no card lateral, secao de satisfacao.
