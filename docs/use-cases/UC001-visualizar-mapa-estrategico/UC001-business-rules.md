# UC001 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC001-main-flow.md)

**Versao**: 2.0 | **Data**: 2026-03-29 | **Fonte**: Levantamento v1203

## RN001-01 — Classificacao de Quadrante Estrategico

| Campo | Valor |
|-------|-------|
| **ID** | RN001-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
O quadrante de cada geohash e derivado do cruzamento de duas variaveis:
- **Eixo X**: Share de Mercado Vivo (calculado com dados reais FTTH + ERB)
- **Eixo Y**: Satisfacao do usuario Vivo (score SpeedTest 0-10)

**Quadrantes (Levantamento v1203 sec.5):**

| Condicao | Quadrante | Cor | Significado | Acao |
|----------|-----------|-----|-------------|------|
| share < 30% AND sat >= 7.5 | **OPORTUNIDADE** | #22C55E (verde) | Janela de ataque | Geracao de Leads e Marketing de Ataque |
| share >= 40% AND sat >= 7.5 | **FORTALEZA** | #7C3AED (roxo) | Base solida | Ofertas Premium e Cross-sell |
| share >= 40% AND sat < 6.0 | **RISCO** | #EF4444 (vermelho) | Risco de churn | Blindagem e Atendimento Proativo |
| share < 30% AND sat < 6.0 | **EXPANSAO** | #F97316 (laranja) | Dupla frente | Diagnostico Tecnico + Captacao |

**Zona intermediaria** (share 30-39% ou sat 6.0-7.4):
- Classificar pelo quadrante mais proximo usando ponto medio dos thresholds
- sat >= 6.75: share >= 35% → FORTALEZA, share < 35% → OPORTUNIDADE
- sat < 6.75: share >= 35% → RISCO, share < 35% → EXPANSAO

**Thresholds (configuraveis via `benchmark_config`):**
- Share alto: >= 40% | Share baixo: < 30%
- Satisfacao alta: >= 7.5 | Satisfacao baixa: < 6.0

---

## RN001-02 — Cores dos Poligonos

| Campo | Valor |
|-------|-------|
| **ID** | RN001-02 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
Poligonos sao SEMPRE coloridos pelo quadrante estrategico, independente do filtro de tecnologia ativo.

| Propriedade | Valor Default | Hover | Pinned |
|-------------|---------------|-------|--------|
| fillOpacity | 0.4 | 0.72 | 0.8 |
| strokeWeight | 1.5 | 2.5 | 3.0 |
| strokeColor | quadrant+CC | #ffffff | #ffffff |
| zIndex | 1 | 10 | 20 |

---

## RN001-03 — Precisao do Geohash por Nivel de Zoom

| Campo | Valor |
|-------|-------|
| **ID** | RN001-03 |
| **Tipo** | Derivacao |
| **Passos** | Passo 3, 4 |

**Descricao:**
Precisoes suportadas (com continuous aggregates e dados operacionais):

| Zoom Google Maps | Precisao | Tamanho Celula | Fonte Share | Fonte QoE |
|---|---|---|---|---|
| 11-13 | 6 | ~1.2km x 0.6km | FTTH/ERB agrupados por geohash6 | cagg_*_gh6 |
| 14-15 | 7 | ~153m x 153m | FTTH/ERB agrupados por geohash7 | cagg_*_gh7 |

Zoom fora dessas faixas: clamp para 6 (zoom <= 13) ou 7 (zoom >= 14).

---

## RN001-04 — Contadores de Resumo

| Campo | Valor |
|-------|-------|
| **ID** | RN001-04 |
| **Tipo** | Calculo |
| **Passos** | Passo 10 |

**Descricao:**
- **Visiveis**: geohashes que passam nos filtros (quadrante + tecnologia)
- **Total**: geohashes no viewport/periodo
- **Em risco**: geohashes no quadrante **RISCO** (badge vermelho pulsante)

---

## RN001-05 — Estilo do Mapa Base

| Campo | Valor |
|-------|-------|
| **ID** | RN001-05 |
| **Tipo** | Validacao |
| **Passos** | Passo 7 |

**Descricao:**
Estilo analitico minimalista: geometria cinza claro, estradas brancas, POIs ocultos.

---

## RN001-06 — Benchmarks de Referencia

| Campo | Valor |
|-------|-------|
| **ID** | RN001-06 |
| **Tipo** | Derivacao |
| **Passos** | Passo 5 |

**Descricao:**
Benchmarks carregados de `benchmark_config` (Levantamento v1203):

| Benchmark | Valor | Uso |
|-----------|-------|-----|
| shareThresholdAlto | 40% | Limiar quadrante X (alto) |
| shareThresholdBaixo | 30% | Limiar quadrante X (baixo) |
| satisfacaoThresholdAlta | 7.5 | Limiar quadrante Y (alta) |
| satisfacaoThresholdBaixa | 6.0 | Limiar quadrante Y (baixa) |
| trendThresholdUp | +1.0 pp | Delta > +1.0 = UP |
| trendThresholdDown | -1.0 pp | Delta < -1.0 = DOWN |
| satisfacaoMedia NACIONAL | 6.5 | Comparacao insights |
| shareMedia NACIONAL | 32% | Comparacao insights |
| rendaAlta | R$10.000 | Referencia |
| rendaBaixa | R$3.500 | Referencia |
| densidadeAlta | 15.000 hab/km2 | Referencia |
| densidadeBaixa | 5.000 hab/km2 | Referencia |

---

## RN001-07 — Calculo de Share Real

| Campo | Valor |
|-------|-------|
| **ID** | RN001-07 |
| **Tipo** | Calculo |
| **Passos** | Passo 5 |

**Descricao:**
Share calculado com dados operacionais reais da Vivo (Levantamento sec.1):

**FIBRA**: `Domicilios com Vivo Fibra Ativa / Total de Domicilios no Geohash × 100`
- Numerador: COUNT de `vivo_ftth_coverage` no geohash
- Denominador: SUM de `geo_por_latlong.total_de_domicilios_media` no geohash

**MOVEL**: `Clientes Vivo com ERB Casa / Total de Pessoas Residentes × 100`
- Numerador: SUM de `vivo_mobile_erb.(pos + ctrl + pre)` no geohash
- Denominador: SUM de `geo_por_latlong.populacao_total_media` no geohash

**Share combinado**: GREATEST(share_fibra, share_movel)

**Niveis de share (Levantamento sec.1):**

| Nivel | Threshold | Cor | Descricao |
|-------|-----------|-----|-----------|
| Muito Alta | > 50% | Verde Escuro | Lideranca absoluta |
| Alta | 40-50% | Verde | Alta presenca |
| Media | 30-39% | Amarelo | Presenca competitiva |
| Baixa | < 30% | Vermelho | Presenca fraca |

---

## RN001-08 — Tecnologia Derivada

| Campo | Valor |
|-------|-------|
| **ID** | RN001-08 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
A tecnologia do geohash e derivada da presenca de dados operacionais Vivo:

| Condicao | Tecnologia | Cor |
|----------|-----------|-----|
| Geohash tem instalacoes FTTH E ERBs | AMBOS | #8B5CF6 |
| Geohash tem apenas instalacoes FTTH | FIBRA | #0EA5E9 |
| Geohash tem apenas ERBs | MOVEL | #F97316 |
