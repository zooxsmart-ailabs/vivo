# UC005 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

## RN005-01 — Debounce de Zoom

| Campo | Valor |
|-------|-------|
| **ID** | RN005-01 |
| **Tipo** | Temporização |
| **Passos** | Passo 2 |

**Descrição:**
Mudanças de zoom sao agrupadas com debounce de 300ms para evitar múltiplas subscriptions durante scroll continuo. Somente o ultimo zoom apos 300ms de inatividade dispara nova subscription.

---

## RN005-02 — Agregação por Precisao

| Campo | Valor |
|-------|-------|
| **ID** | RN005-02 |
| **Tipo** | Cálculo |
| **Passos** | Passo 6 |

**Descrição:**
O sistema suporta duas precisoes: **6** (zoom 11-13) e **7** (zoom 14-15). Cada uma tem pipeline de dados próprio:

**Precisao 7 (detalhada):**
- QoE: `cagg_ft_monthly_gh7`, `cagg_video_monthly_gh7`, `cagg_web_monthly_gh7`
- Scores: tabela `score` direta (cd_geo_hsh7)
- Demografia: `geo_por_latlong` agrupado por geohash7

**Precisao 6 (agregada — zoom out):**
- QoE: `cagg_ft_monthly_gh6`, `cagg_video_monthly_gh6`, `cagg_web_monthly_gh6` — continuous aggregates que agregam diretamente dos dados raw por `attr_geohash6`
- Scores: agregados dos geohash7 filhos via `LEFT(cd_geo_hsh7, 6)` com `AVG(score)` e `SUM(sample_size)`
- Demografia: `geo_por_latlong` agrupado por `LEFT(geohash7, 6)`

**Derivacoes recalculadas em ambas as precisoes:**
- **Share**: proporção de testes Vivo / total de testes (via continuous aggregates)
- **Quadrante**: recalculado com share e satisfação agregados vs benchmarks (RN001-01)
- **Prioridade**: formula por quadrante aplicada sobre valores agregados (RN004-01)
- **Qualidade**: classificação via thresholds de download/latência (RN004-02)

**Implementacao**: A `vw_geohash_summary` ja contem ambas as precisoes. O backend filtra com `WHERE gc.precision = ?`. Toda agregação e feita no PostgreSQL, nunca no frontend.

---

## RN005-03 — Transição Visual

| Campo | Valor |
|-------|-------|
| **ID** | RN005-03 |
| **Tipo** | Derivação |
| **Passos** | Passo 7, 8 |

**Descrição:**
A transição entre precisoes usa fade para suavizar a experiência:
1. Poligonos atuais: fade out (opacity 0.4 -> 0, 200ms)
2. Remove poligonos do mapa
3. Adiciona novos poligonos com opacity 0
4. Novos poligonos: fade in (opacity 0 -> 0.4, 200ms)
