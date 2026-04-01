# UC004 — Inspecionar Detalhes do Geohash

| Campo | Valor |
|-------|-------|
| **ID** | UC004 |
| **Nome** | Inspecionar Detalhes do Geohash |
| **Ator Primário** | Analista |
| **Atores Secundários** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referências** | UC001, UC006, UC007 |

## Objetivo

O Analista inspeciona os detalhes de um geohash específico via hover (preview) ou click (fixar), visualizando métricas comerciais (Camada 1) e de infraestrutura (Camada 2) no card lateral.

## Pré-condições

- PC01: O mapa está renderizado com polígonos visíveis (UC001)
- PC02: O geohash alvo está visível (passa nos filtros de quadrante e tecnologia)

## Pós-condições (Sucesso)

- PS01: Card lateral exibe dados completos do geohash (Camada 1 e/ou Camada 2)
- PS02: Polígono inspecionado está visualmente destacado no mapa
- PS03: Se fixado (pin), o estado é persistido na sessão (UC011)

## Pós-condições (Falha)

- PF01: Não aplicável — dados já carregados via WS

## Fluxo Principal (Hover — Preview)

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Move o cursor sobre um polígono geohash |
| 2 | Sistema | Verifica se há geohash fixado (pinnedGeohash != null) |
| 3 | Sistema | Se não há pin: destaca polígono (opacity 0.72, stroke branco, zIndex 10) |
| 4 | Sistema | Atualiza card lateral com dados do geohash hovered |
| 5 | Sistema | Card exibe: header + prioridade + aba Camada 1 (default) |
| 6 | Analista | Move cursor para fora do polígono |
| 7 | Sistema | Restaura polígono ao estado normal (opacity 0.4, cor quadrante) |
| 8 | Sistema | Card lateral volta ao estado vazio ("Territórios de Ação") |

## Fluxo Alternativo: Click — Fixar (Pin)

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica em um polígono geohash |
| 2 | Sistema | Se já existe pin no MESMO geohash: desfixa (unpin) — volta ao estado vazio |
| 3 | Sistema | Se ja existe pin em OUTRO geohash: restaura o anterior, fixa o novo |
| 4 | Sistema | Se não existe pin: fixa o geohash clicado |
| 5 | Sistema | Destaca polígono fixado (opacity 0.8, stroke branco 3px, zIndex 20) |
| 6 | Sistema | Card lateral mostra badge "Fixado" com ícone de pin |
| 7 | Sistema | Hover em outros polígonos NÃO atualiza o card (pin tem prioridade) |
| 8 | Sistema | Persiste geohash fixado na sessão (UC011) |

## Conteúdo do Card — Camada 1 (Comercial)

| Seção | Dados Exibidos | Fonte |
|-------|----------------|-------|
| Header | ID geohash, bairro, cidade, badge Top 10, badge tecnologia, cor quadrante | vw_geohash_summary |
| Prioridade | Label, rank #N/total, percentil 0-100, barra de progresso (RN004-01) | Calculado |
| SpeedTest Satisfação | Barras para VIVO/TIM/CLARO (0-10), benchmarks regionais | score, benchmark_config |
| SpeedTest Técnico | Download (Mbps), Latência (ms), qualidade label (RN004-02) | file_transfer agregado |
| Share de Mercado | Donut %, clientes ativos, população, label penetração | vw_geohash_summary |
| Trend de Share | Direção (UP/DOWN/STABLE), delta em pp, detalhe fibra/movel | vw_geohash_summary |
| CRM | ARPU, device tier, plano predominante | Futuro: CRM externo |
| Demografia | Renda média, densidade pop., crescimento, severidade | geo_por_latlong |
| Insights | Até 2 insights auto-gerados (RN004-03) | Calculado |
| Estratégia | Label quadrante, título, motivo, cor | Derivado de RN001-01 |

## Conteúdo do Card — Camada 2 (Infraestrutura)

| Seção | Dados Exibidos | Fonte |
|-------|----------------|-------|
| Fibra | Classificação, score 0-100, label, campos condicionais (RN004-04) | Calculado |
| Móvel | Classificação, score 0-100, label, campos condicionais (RN004-05) | Calculado |
| Decisão Integrada | Texto de recomendação combinando fibra + móvel | Calculado |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC004-alt-flows.md#fa01) | Geohash sem dados de Camada 2 |
| Alternativo | [FA02](./UC004-alt-flows.md#fa02) | Geohash sem dados de CRM |
| Alternativo | [FA03](./UC004-alt-flows.md#fa03) | Hover bloqueado por pin ativo |

## Regras de Negócio Aplicadas

Veja [UC004-business-rules.md](./UC004-business-rules.md)

## Pontos de Função

Veja [UC004-function-points.md](./UC004-function-points.md)
