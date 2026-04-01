# UC004 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC004-main-flow.md)

**Versão**: 3.0 | **Data**: 2026-03-30 | **Fonte**: ZooxMap_Indicadores_Unificado_v2.pdf (Fev 2026)

## RN004-01 — Cálculo de Prioridade por Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN004-01 |
| **Tipo** | Cálculo |
| **Passos** | Card Camada 1, seção Prioridade |

**Descrição:**
Fórmulas de prioridade ponderadas por quadrante (Levantamento v2 sec. Score de Priorização).
Todas as variáveis normalizadas 0-10 antes de aplicar os pesos. Score final: 0-10.

**RETENCAO** (share >= 35% + QoE < 5.0) — *Prioriza geohashes com MAIOR base em risco:*

`Score = (10-Sat)x0.30 + Sharex0.25 + (10-Delta)x0.25 + Popx0.10 + Crescx0.10`

| Variável | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Satisfação (invertida) | - direto | 30% | Qualidade baixa = maior risco de churn. Invertida: quanto pior, maior o score |
| Share Atual | + direto | 25% | Quanto mais share, mais clientes em risco de perder |
| Delta de Share (invertido) | - delta | 25% | Perda de share = deterioração acelerada, urgência maior |
| População | + direto | 10% | Mais habitantes = mais clientes impactados pela má experiência |
| Cresc. Pop. | + direto | 10% | Região crescendo = perda futura amplificada |

**UPSELL** (share >= 35% + QoE >= 7.01) — *Prioriza geohashes com MAIOR potencial de receita incremental:*

`Score = Sharex0.30 + Satx0.25 + Rendax0.25 + Deltax0.10 + Popx0.10`

| Variável | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Share Atual | + direto | 30% | Maior a base, maior o potencial de upsell incremental |
| Satisfação | + direto | 25% | Clientes satisfeitos têm maior propensão a upgrade e menor churn |
| Renda Média | + direto | 25% | Proxy de ARPU. Renda alta = maior ticket médio por cliente |
| Delta de Share | + direto | 10% | Momentum positivo reforça a oportunidade de capitalização |
| População | + direto | 10% | Mais habitantes = maior mercado endereçável para upsell |

**GROWTH** (share < 35% + QoE >= 7.01) — *Prioriza geohashes com MAIOR gap de share + retorno esperado:*

`Score = (10-Share)x0.25 + Satx0.20 + Rendax0.20 + Crescx0.20 + Deltax0.15`

| Variável | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Share Atual (invertido) | - direto | 25% | Quanto menor o share, maior o gap a conquistar. Invertido: share baixo = score alto |
| Satisfação | + direto | 20% | Qualidade técnica elevada facilita a conversão de novos clientes |
| Renda Média | + direto | 20% | Renda alta = clientes com maior valor potencial (ARPU) |
| Cresc. Pop. | + direto | 20% | Regiões crescendo rapidamente terão mais clientes a adquirir nos próximos 12-24 meses |
| Delta de Share | + direto | 15% | Momentum positivo indica que a estratégia de captação já está funcionando |

**GROWTH_RETENCAO** (zona intermediária) — *Prioriza geohashes com MAIOR potencial futuro:*

`Score = Deltax0.30 + Crescx0.25 + Rendax0.20 + Satx0.15 + Sharex0.10`

| Variável | Sinal | Peso | Justificativa |
|----------|-------|------|---------------|
| Delta de Share | + direto | 30% | Crescimento de share = estratégia funcionando, investir no momentum |
| Cresc. Pop. | + direto | 25% | Demanda futura: regiões crescendo rapidamente |
| Renda Média | + direto | 20% | Potencial de ARPU. Crescimento em regiões de alta renda = maior retorno |
| Satisfação | + direto | 15% | Qualidade crescente facilita retenção dos clientes adquiridos |
| Share Atual | + direto | 10% | Base existente como ponto de partida para crescimento incremental |

**Labels de prioridade (Levantamento v2 — score normalizado 0-10):**

| Label | Score | Prazo | Ação |
|-------|-------|-------|------|
| P1 — Crítica | > 7.5 | Ação imediata | Task force ou retenção urgente |
| P2 — Alta | 6.0-7.4 | Curto prazo (30-60 dias) | Plano de ação estruturado |
| P3 — Média | 4.5-5.9 | Médio prazo (60-90 dias) | Monitorar e agir no médio prazo |
| P4 — Baixa | < 4.5 | Baixa urgência (> 90 dias) | Monitoramento contínuo |

---

## RN004-02 — Classificação de Qualidade SpeedTest

| Campo | Valor |
|-------|-------|
| **ID** | RN004-02 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 1, seção SpeedTest |

Sem alteração. Mesmos thresholds da v2: EXCELENTE (DL>=100Mbps e latência<=20ms),
BOM (DL>=50 e lat<=40), REGULAR, RUIM.

---

## RN004-03 — Geração Automática de Insights

| Campo | Valor |
|-------|-------|
| **ID** | RN004-03 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 1, seção Insights |

**Descrição (thresholds v2):**

1. **Satisfação vs Threshold**: vivoScore >= 7.01 = "Satisfação alta" | < 5.0 = "Satisfação crítica"
2. **Share vs Nacional**: |share - 32%| >= 3 pp — exibe comparativo com média nacional
3. **Gap Competitivo**: vivoScore - MAX(tim, claro). Exibe posição competitiva (RN004-07)
4. **Tendência**: delta share > +1.0 pp (ganhando mercado) ou < -1.0 pp (perdendo mercado)

---

## RN004-04 — Classificação Fibra (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-04 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 2, seção Fibra |

**Motor de decisão (Levantamento v2 — árvore de decisão Fibra):**

```
Tem fibra Vivo na área? (presença de FTTH no geohash)
  NÃO → SEM_FIBRA (área sem infraestrutura de fibra óptica)
  SIM → (2) Ocupação Crítica? (taxa_ocupação > 85% OU portas_disponíveis < 5)
    SIM → AUMENTO_CAPACIDADE (rede saturada, expansão urgente)
    NÃO → SAUDÁVEL (infra em bom estado, monitorar)
```

**Score AUMENTO_CAPACIDADE (0-100):**
`Score = (Taxa_Ocupacao, n=0.60) + (Valor_Area, n=0.40)`
- Taxa de Ocupação (60%): nível de utilização da fibra instalada. >= 85% = max urgência
- Valor da Área (40%): Renda Média (Zoox) + Densidade Pop (IBGE) + ARPU (CRM). Normalizado 0-100

**Score EXPANSAO_NOVA_AREA (0-100):**
`Score = (Potencial_Mercado, n=0.50) + (Sinergia_Movel, n=0.50)`
- Potencial de Mercado (50%): combinação de Renda Média x Densidade Populacional (Zoox/IBGE)
- Sinergia com Móvel (50%): share móvel Vivo no geohash — base móvel facilita cross-sell fibra

**Alerta de Saturação**: taxa_ocupação > 85% OU score_label móvel = CRÍTICO
- Gera alerta automático no dashboard ZooxMap (flag `alerta_saturação = TRUE`)

---

## RN004-05 — Classificação Móvel (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-05 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 2, seção Móvel |

**Motor de decisão (Levantamento v2 — árvore de decisão Móvel):**

```
Tem cobertura? (ERB Vivo no geohash)
  NÃO → Expansão de Cobertura (White Spot)
    → Separação 4G/5G (ver critério abaixo)
       SG_PREMIUM → EXPANSAO_COBERTURA_5G
       4G_MASS    → EXPANSAO_COBERTURA_4G
  SIM → Qualidade Ruim? (SpeedTest < benchmark 4.0/10)
    SIM → Melhora de Qualidade
      → Separação 4G/5G (ver critério abaixo)
         SG_PREMIUM → MELHORA_QUALIDADE_5G
         4G_MASS    → MELHORA_QUALIDADE_4G
    NÃO → SAUDÁVEL (rede em bom estado)
```

**Critério de separação 4G/5G:**

| Critério | Sinal para 5G (SG_PREMIUM) | Sinal para 4G (4G_MASS) |
|----------|---------------------------|-------------------------|
| Renda Média (Zoox/IBGE) | Alta (>= R$5k-10k) | Média/Baixa (< R$5k) |
| Device Tier (CRM) | Premium ou Mid | Basic |
| Consumo de Dados (CRM) | Alto (GB/mês acima média) | Padrão ou baixo |

Lógica: **Alta Renda + Mid/Premium Device → 5G Premium | demais → 4G Mass**

**Score de Intervenção por Trilha (0-100):**

**MELHORA_QUALIDADE_5G** (Perfil Premium, cobertura existe, qualidade ruim):
`Score = (Score_SpeedTest_inv, n=0.40) + (ARPU, n=0.30) + (Consumo_Dados, n=0.30)`
- Score SpeedTest invertido (40%): KPI primário de qualidade/latência (invertido = gap de performance)
- Valor da Base — ARPU (30%): Renda alta = maior valor em risco
- Consumo de Dados — CRM (30%): volume de GB trafegados, proxy de demanda por capacidade 5G

**EXPANSAO_COBERTURA_5G** (White Spot, sem cobertura 5G, Perfil Premium):
`Score = (Concentracao_Renda, n=0.60) + (Vulnerabilidade_Concorrencia, n=0.40)`
- Concentração de Renda (60%): prioriza geohashes com alta renda domiciliar (ARPU potencial)
- Vulnerabilidade da Concorrência (40%): SpeedTest concorrente com baixa satisfação = janela de ataque

**MELHORA_QUALIDADE_4G** (Perfil Massivo, cobertura existe, qualidade ruim):
`Score = (Gap_Performance, n=0.60) + (Volume_Usuarios, n=0.40)`
- Gap de Performance (60%): diferença entre benchmark mínimo 4G e SpeedTest atual
- Volume de Usuários (40%): densidade populacional afetada — mais usuários = maior impacto

**EXPANSAO_COBERTURA_4G** (White Spot, sem cobertura 4G, Perfil Massivo):
`Score = (Densidade_Demografica, n=0.60) + (Vulnerabilidade_Concorrencia, n=0.40)`
- Densidade Demográfica (60%): prioriza onde há mais pessoas sem cobertura (ERB por km2)
- Vulnerabilidade da Concorrência (40%): SpeedTest concorrente baixo = oportunidade de captura

**Faixas do score_label:**

| Faixa | Label | Cor | Interpretação |
|-------|-------|-----|---------------|
| 0-39 | BAIXO | #16A34A (Verde) | Intervenção não prioritária |
| 40-59 | MEDIO | #2563EB (Azul) | Monitoramento recomendado |
| 60-79 | ALTO | #D97706 (Âmbar) | Intervenção recomendada em curto prazo |
| 80-100 | CRÍTICO | #DC2626 (Vermelho) | Intervenção urgente, degradação severa |

---

## RN004-06 — Prioridade de Exibição: Pin > Hover > Vazio

| Campo | Valor |
|-------|-------|
| **ID** | RN004-06 |
| **Tipo** | Validação |
| **Passos** | Fluxo Principal e Alternativo |

Sem alteração. `displayedGeohash = pinnedGeohash ?? hoveredGeohash ?? null`.

---

## RN004-07 — Posição Competitiva

| Campo | Valor |
|-------|-------|
| **ID** | RN004-07 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 1, seção Satisfação |

**Descrição (Levantamento v2 sec.4):**
Delta competitivo = Score Vivo - Melhor Score Concorrente no mesmo geohash.
`Delta = Score_Vivo - MAX(Score_TIM, Score_Claro)`

| Posição | Delta | Risco | Cor | Retenção Estratégica |
|---------|-------|-------|-----|----------------------|
| Líder | > +0.5 | Baixo | Verde Escuro | Baixo — clientes satisfeitos sem motivo para trocar |
| Competitivo | 0 a +0.5 | Médio | Verde | Médio — qualquer queda de qualidade pode inverter |
| Empatado | -0.5 a 0 | Médio-Alto | Amarelo | Médio-Alto — decisão por preço e promoção |
| Abaixo | -1.0 a -0.5 | Alto | Laranja | Alto — clientes expostos a argumentos de venda |
| Crítico | < -1.0 | Muito Alto | Vermelho | Muito Alto — churn acelerado e perda de share iminente |

Exibida como badge no card lateral, seção de satisfação.

---

## RN004-08 — Interação de Tabs na Ficha Compacta (GeohashCard)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-08 |
| **Tipo** | Interface |
| **Passos** | Card lateral — tabs C1/C2 |
| **Fonte** | `data-vis/apps/web/app/components/GeohashCard.vue` |

**Descrição:**
A ficha compacta (GeohashCard) exibe informações do geohash em duas abas:

### Layout

- **Header**: Gradient colorido pelo quadrante + barra lateral com cor do quadrante
- **Grid de métricas**: 3 métricas em grid (Share, Satisfação, Prioridade)
- **Tabs**: C1 (Comercial) e C2 (Infraestrutura)

### Tab C1 — Comercial (default)

| Seção | Conteúdo | Dados |
|-------|----------|-------|
| Satisfação Comparativa | Barras horizontais por operadora (VIVO/TIM/CLARO) com score e badge de qualidade | score |
| SpeedTest | Download (Mbps), Latência (ms), Qualidade | vw_geohash_summary |
| CRM | ARPU (R$), Plano, Device Tier | geohash_crm |
| Perfil da Área | Renda média, População, Domicílios | geo_por_latlong |
| Insights | Geração automática por RN004-03 | Derivado |

### Tab C2 — Infraestrutura

| Seção | Conteúdo | Dados |
|-------|----------|-------|
| Fibra | Classificação (badge colorido), Score (barra 0-100), Label (BAIXO/MÉDIO/ALTO/CRÍTICO) | camada2_fibra |
| Móvel | Classificação (badge colorido), Score (barra 0-100), Label (BAIXO/MÉDIO/ALTO/CRÍTICO) | camada2_movel |

**Cores por classificação Fibra:**
- SAUDÁVEL: Verde (#16A34A)
- AUMENTO_CAPACIDADE: Âmbar (#D97706)
- EXPANSAO_NOVA_AREA: Azul (#2563EB)
- SEM_FIBRA: Cinza (#6B7280)

**Cores por classificação Móvel:**
- SAUDÁVEL: Verde (#16A34A)
- MELHORA_QUALIDADE: Vermelho (#DC2626)
- EXPANSÃO_5G/4G: Âmbar (#D97706)

### Comportamento de Interação

- Tab default: C1 (Comercial)
- Switch entre tabs preserva seleção durante a sessão
- Se Camada 2 não disponível (dados ausentes): tab C2 exibe "Dados de infraestrutura não disponíveis"
- Prioridade de exibição: Pin > Hover > Vazio (RN004-06 inalterado)
