# UC005 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

## RN005-01 — Debounce de Zoom

| Campo | Valor |
|-------|-------|
| **ID** | RN005-01 |
| **Tipo** | Temporização |
| **Passos** | Passo 2 |

**Descrição:**
Mudanças de zoom são agrupadas com debounce de 300ms para evitar múltiplas subscriptions durante scroll contínuo. Somente o último zoom após 300ms de inatividade dispara nova subscription.

---

## RN005-02 — Agregação por Precisão

| Campo | Valor |
|-------|-------|
| **ID** | RN005-02 |
| **Tipo** | Cálculo |
| **Passos** | Passo 6 |

**Descrição:**
O sistema suporta duas precisões: **6** (zoom 11-13) e **7** (zoom 14-15). Cada uma tem pipeline de dados próprio:

**Precisão 7 (detalhada):**
- QoE: `cagg_ft_monthly_gh7`, `cagg_video_monthly_gh7`, `cagg_web_monthly_gh7`
- Scores: tabela `score` direta (cd_geo_hsh7)
- Demografia: `geo_por_latlong` agrupado por geohash7

**Precisão 6 (agregada — zoom out):**
- QoE: `cagg_ft_monthly_gh6`, `cagg_video_monthly_gh6`, `cagg_web_monthly_gh6` — continuous aggregates que agregam diretamente dos dados raw por `attr_geohash6`
- Scores: agregados dos geohash7 filhos via `LEFT(cd_geo_hsh7, 6)` com `AVG(score)` e `SUM(sample_size)`
- Demografia: `geo_por_latlong` agrupado por `LEFT(geohash7, 6)`

**Derivações recalculadas em ambas as precisões:**
- **Share**: proporção de testes Vivo / total de testes (via continuous aggregates)
- **Quadrante**: recalculado com share e satisfação agregados vs benchmarks (RN001-01)
- **Prioridade**: fórmula por quadrante aplicada sobre valores agregados (RN004-01)
- **Qualidade**: classificação via thresholds de download/latência (RN004-02)

**Implementação**: A `vw_geohash_summary` já contém ambas as precisões. O backend filtra com `WHERE gc.precision = ?`. Toda agregação é feita no PostgreSQL, nunca no frontend.

---

## RN005-03 — Transição Visual

| Campo | Valor |
|-------|-------|
| **ID** | RN005-03 |
| **Tipo** | Derivação |
| **Passos** | Passo 7, 8 |

**Descrição:**
A transição entre precisões usa fade para suavizar a experiência:
1. Polígonos atuais: fade out (opacity 0.4 -> 0, 200ms)
2. Remove polígonos do mapa
3. Adiciona novos polígonos com opacity 0
4. Novos polígonos: fade in (opacity 0 -> 0.4, 200ms)
