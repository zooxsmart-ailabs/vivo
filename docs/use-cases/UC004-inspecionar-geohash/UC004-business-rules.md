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
Fórmulas de prioridade por quadrante. Cada quadrante usa uma fórmula distinta que reflete o que importa para a estratégia específica.

> **v5 (2026-04-10)**: Fórmulas simplificadas adotadas como definitivas (fonte: `prototipo/utils/geohashData.ts`). Ranking por **percentil dentro do quadrante**, não por score absoluto.

**RETENCAO** (share >= 35% + QoE < 5.0) — *Prioriza geohashes com MAIOR base em risco:*

`Score = Share × 0.5 + (10 − VivoScore) × 5`

| Variável | Lógica | Justificativa |
|----------|--------|---------------|
| Share Atual | + direto × 0.5 | Quanto mais share, mais clientes em risco de perder |
| Satisfação (invertida) | (10 − score) × 5 | Qualidade baixa = maior risco de churn. Invertida: quanto pior, maior o score |

**UPSELL** (share >= 35% + QoE >= 7.01) — *Prioriza geohashes com MAIOR potencial de receita:*

`Score = VivoScore × 5 + Share × 0.5`

| Variável | Lógica | Justificativa |
|----------|--------|---------------|
| Satisfação | + direto × 5 | Clientes satisfeitos têm maior propensão a upgrade |
| Share Atual | + direto × 0.5 | Maior base = maior potencial de upsell incremental |

**GROWTH** (share < 35% + QoE >= 7.01) — *Prioriza geohashes com MAIOR janela de ataque:*

`Score = (10 − Share) × 0.5 + VivoScore × 5`

| Variável | Lógica | Justificativa |
|----------|--------|---------------|
| Share (invertido) | (10 − share) × 0.5 | Quanto menor o share, maior o gap a conquistar |
| Satisfação | + direto × 5 | Qualidade técnica elevada facilita conversão |

**GROWTH_RETENCAO** (zona intermediária) — *Prioriza geohashes com MAIOR potencial futuro:*

`Score = (RendaMédia / 1000) × 3 + CrescPop × 5 + DensidadePop / 100`

| Variável | Lógica | Justificativa |
|----------|--------|---------------|
| Renda Média | (R$/1000) × 3 | Alta renda = maior ARPU potencial |
| Cresc. Pop. | % × 5 | Regiões crescendo = demanda futura amplificada |
| Densidade Pop. | hab/km² / 100 | Maior densidade = mais clientes endereçáveis |

**Ranking e Labels de prioridade (percentil dentro do quadrante):**

Geohashes são ordenados por score decrescente dentro de cada quadrante. O **percentil** determina o label:

| Label | Percentil | Cor | Ação |
|-------|-----------|-----|------|
| Crítico | 75-100% (top quartil) | #DC2626 (Vermelho) | Ação imediata |
| Alto | 50-75% | #D97706 (Âmbar) | Curto prazo (30-60 dias) |
| Médio | 25-50% | #2563EB (Azul) | Médio prazo (60-90 dias) |
| Baixo | 0-25% | #64748B (Cinza) | Monitoramento contínuo |

**Cálculo do percentil**: `percentile = ((total − rank) / (total − 1)) × 100` (rank 1 = maior score)

---

## RN004-02 — Classificação de Qualidade SpeedTest

| Campo | Valor |
|-------|-------|
| **ID** | RN004-02 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 1, seção SpeedTest |

Mesmos thresholds da v2: EXCELENTE (DL>=100Mbps e latência<=20ms),
BOM (DL>=50 e lat<=40), REGULAR, RUIM.

> **v4 (2026-04-09)**: A classificação de qualidade SpeedTest agora considera os scores QoE separados por tecnologia. O card exibe **score_mobile** (`vw_score_mobile.score_final`) e **score_fibra** (`vw_score_fibra.score_final`) quando ambos estão disponíveis. Se apenas uma tecnologia tem dados, exibe apenas essa. Os thresholds de classificação são iguais para ambas as tecnologias, mas os **pesos internos** diferem (ver `docs/levantamento/scores.pdf`):
> - **Mobile**: Latência 30% + Vídeo 30% + Web 30% + Sinal 10% + Throughput 10%
> - **Fibra**: Responsividade 40% + Vídeo 30% + Web 20% + Throughput 10%
>
> **v5 (2026-04-11)**: Refinamentos do notebook validado pelo time de analistas (`estudo/query_score_v2.ipynb`) aplicados às views `vw_score_mobile` / `vw_score_fibra`:
> - **Filtros nas raw tables**: `is_wifi_connected` (NOT TRUE para mobile, TRUE para fibra), `id_location_type = 1`, `val_latency_avg IS NOT NULL`.
> - **FULL OUTER JOIN** entre file_transfer, video e web_browsing — preserva geohashes com dados parciais.
> - **Score taxa de falha em 4-tier (mobile)** ou **3-tier (fibra)** — alinhado com `scores.pdf` pag 2.
> - **Degradação graciosa** nos pilares Responsividade e Vídeo (fibra) — divide por N componentes disponíveis.
> - **Score resolução fibra**: denominador = soma manual de todas as resoluções classificadas (não usa `val_video_quality_time_total`).
> - **Classificação por percentil dinâmico**: `vw_score_*.classificacao` ∈ {BOM, MEDIO, RUIM} via p25/p75 do `score_final`.
> - Detalhes completos em `docs/db/physical/data-dictionary.md` (seção "Views de Score QoE v5").

---

## RN004-03 — Geração Automática de Insights

| Campo | Valor |
|-------|-------|
| **ID** | RN004-03 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 1, seção Insights |

**Descrição (thresholds v2, atualizado v4):**

1. **Satisfação vs Threshold**: vivoScore >= 7.01 = "Satisfação alta" | < 5.0 = "Satisfação crítica"
   > **v4**: Satisfação agora é exibida por tecnologia — `satisfacao_fibra` e `satisfacao_movel` (derivados de `vw_score_fibra` e `vw_score_mobile`, normalizados 0–10). Os thresholds se aplicam a cada score de tecnologia individualmente.
2. **Share vs Nacional**: |share - 32%| >= 3 pp — exibe comparativo com média nacional
3. **Gap Competitivo**: vivoScore - MAX(tim, claro). Exibe posição competitiva (RN004-07)
   > **v4**: O delta competitivo pode ser calculado por tecnologia usando as views de score por tech.
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
  SIM → (2) Qualidade comprometida? (SpeedTest Fibra < benchmark)
    SIM → MELHORA_QUALIDADE (fibra existe mas qualidade ruim — intervenção recomendada)
    NÃO → (3) Ocupação Crítica? (taxa_ocupação > 85% OU portas_disponíveis < 5)
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

**Descrição (Levantamento v2 sec.4, atualizado v4):**
Delta competitivo = Score Vivo - Melhor Score Concorrente no mesmo geohash.
`Delta = Score_Vivo - MAX(Score_TIM, Score_Claro)`

> **v4**: O delta competitivo agora pode ser calculado **por tecnologia**:
> - `delta_fibra = vw_score_fibra(VIVO).score_final - MAX(vw_score_fibra(TIM), vw_score_fibra(CLARO))`
> - `delta_movel = vw_score_mobile(VIVO).score_final - MAX(vw_score_mobile(TIM), vw_score_mobile(CLARO))`
> O card exibe ambos os deltas quando disponíveis. A posição competitiva principal usa o score da **tech dominante** (mais testes no geohash).

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
| **Fonte** | `data-viz/apps/web/app/components/GeohashCard.vue` |

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
- MELHORA_QUALIDADE: Vermelho (#DC2626) — **v5**: novo estado (qualidade ruim com fibra existente)
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

---

## RN004-09 — Classificação de Classe Social (ABEP/IBGE)

| Campo | Valor |
|-------|-------|
| **ID** | RN004-09 |
| **Tipo** | Derivação |
| **Passos** | Card Camada 1, seção Perfil da Área |
| **Fonte** | `prototipo/pages/frentes.vue:418-425` |

**Descrição (v5):**
Classificação da classe social do geohash baseada na renda média mensal domiciliar, seguindo critérios ABEP/IBGE:

| Classe | Renda Mínima (R$) | Cor | Fundo |
|--------|-------------------|-----|-------|
| A | > R$ 11.296 | #15803D (Verde) | #F0FDF4 |
| B | > R$ 5.648 | #6D28D9 (Roxo) | #F5F3FF |
| C | > R$ 2.824 | #1D4ED8 (Azul) | #EFF6FF |
| D | > R$ 1.412 | #B45309 (Âmbar) | #FFFBEB |
| E | ≤ R$ 1.412 | #6B7280 (Cinza) | #F9FAFB |

**Fonte do dado**: `demographics.avgIncome` (renda média mensal via geo_por_latlong / CRM)
**Exibição**: Badge no card lateral, seção de perfil socioeconômico
