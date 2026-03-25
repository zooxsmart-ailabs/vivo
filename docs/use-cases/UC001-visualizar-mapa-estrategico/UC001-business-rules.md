# UC001 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC001-main-flow.md)

## RN001-01 — Classificacao de Quadrante Estrategico

| Campo | Valor |
|-------|-------|
| **ID** | RN001-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
O quadrante de cada geohash e derivado do cruzamento de duas variaveis:
- **Eixo X**: Market Share da Vivo (`sharePct` de `vw_geohash_summary`)
- **Eixo Y**: Satisfacao do usuario Vivo (`score` de `satisfactionScore` onde operator='VIVO')

Os limiares sao definidos por benchmarks regionais (configuraveis por periodo):

| Condicao | Quadrante | Cor | Significado |
|----------|-----------|-----|-------------|
| share < limiar AND satisfacao >= limiar | GROWTH | #22C55E (verde) | Janela de ataque |
| share >= limiar AND satisfacao >= limiar | UPSELL | #7C3AED (roxo) | Maximizar receita |
| share < limiar AND satisfacao < limiar | GROWTH_RETENCAO | #F97316 (laranja) | Dupla frente |
| share >= limiar AND satisfacao < limiar | RETENCAO | #EF4444 (vermelho) | Risco de churn |

**Limiares default (SP):**
- Share: 35% (`shareMediaEstadoSP`)
- Satisfacao: 6.8 (`satisfacaoMediaEstadoSP`)

**Exemplo:**
- Geohash com share=28%, satisfacao=7.2 -> GROWTH (verde)
- Geohash com share=42%, satisfacao=5.9 -> RETENCAO (vermelho)

---

## RN001-02 — Cores dos Poligonos

| Campo | Valor |
|-------|-------|
| **ID** | RN001-02 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
Poligonos sao SEMPRE coloridos pelo quadrante estrategico, independente do filtro de tecnologia ativo. O filtro de tecnologia apenas mostra/oculta poligonos, nunca altera cores.

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
A precisao do geohash enviada na subscription varia conforme o nivel de zoom do mapa:

| Zoom Google Maps | Precisao Geohash | Tamanho Aprox. Celula |
|------------------|------------------|-----------------------|
| <= 8 | 4 | ~39km x 20km |
| 9-10 | 5 | ~5km x 5km |
| 11-13 | 6 | ~1.2km x 0.6km |
| 14-15 | 7 | ~153m x 153m |
| >= 16 | 8 | ~38m x 19m |

---

## RN001-04 — Contadores de Resumo

| Campo | Valor |
|-------|-------|
| **ID** | RN001-04 |
| **Tipo** | Calculo |
| **Passos** | Passo 10 |

**Descricao:**
- **Visiveis**: Contagem de geohashes que passam pelos filtros ativos (quadrante + tecnologia)
- **Total**: Contagem total de geohashes no viewport/periodo
- **Em risco**: Contagem de geohashes no quadrante RETENCAO (independe de filtro de visibilidade)

Formula: `visibleCount = geohashes.filter(isVisible).length`

O badge "em risco" pulsa em vermelho quando riscoCount > 0.

---

## RN001-05 — Estilo do Mapa Base

| Campo | Valor |
|-------|-------|
| **ID** | RN001-05 |
| **Tipo** | Validacao |
| **Passos** | Passo 7 |

**Descricao:**
O mapa base utiliza estilo analitico minimalista para nao competir visualmente com os poligonos:
- Geometria: cinza claro (#f5f5f5)
- Estradas: branco, highways #dadada
- Agua: cinza medio (#c9c9c9)
- POIs: ocultos
- Labels: cinza (#616161)

---

## RN001-06 — Benchmarks de Referencia

| Campo | Valor |
|-------|-------|
| **ID** | RN001-06 |
| **Tipo** | Derivacao |
| **Passos** | Passo 5 |

**Descricao:**
Benchmarks sao carregados da tabela `benchmark_config` (ou view) e usados em multiplos UCs:

| Benchmark | Valor Default | Uso |
|-----------|---------------|-----|
| satisfacaoMediaEstadoSP | 6.8 | Limiar quadrante Y |
| satisfacaoMediaNacional | 6.5 | Comparacao insights |
| satisfacaoMediaMercado | 7.2 | Comparacao insights |
| shareMediaEstadoSP | 35% | Limiar quadrante X |
| shareMediaNacional | 32% | Comparacao insights |
| shareMediaCidadeSP | 38% | Comparacao insights |
| densidadeMediaSP | 420 cl/km2 | Referencia |
| churnMedioNacional | 2.8%/mes | Referencia |
| churnMedioSP | 2.4%/mes | Referencia |
