# UC004 — Inspecionar Detalhes do Geohash

| Campo | Valor |
|-------|-------|
| **ID** | UC004 |
| **Nome** | Inspecionar Detalhes do Geohash |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC001, UC006, UC007 |

## Objetivo

O Analista inspeciona os detalhes de um geohash especifico via hover (preview) ou click (fixar), visualizando metricas comerciais (Camada 1) e de infraestrutura (Camada 2) no card lateral.

## Pre-condicoes

- PC01: O mapa esta renderizado com poligonos visiveis (UC001)
- PC02: O geohash alvo esta visivel (passa nos filtros de quadrante e tecnologia)

## Pos-condicoes (Sucesso)

- PS01: Card lateral exibe dados completos do geohash (Camada 1 e/ou Camada 2)
- PS02: Poligono inspecionado esta visualmente destacado no mapa
- PS03: Se fixado (pin), o estado e persistido na sessao (UC011)

## Pos-condicoes (Falha)

- PF01: Nao aplicavel — dados ja carregados via WS

## Fluxo Principal (Hover — Preview)

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Move o cursor sobre um poligono geohash |
| 2 | Sistema | Verifica se ha geohash fixado (pinnedGeohash != null) |
| 3 | Sistema | Se nao ha pin: destaca poligono (opacity 0.72, stroke branco, zIndex 10) |
| 4 | Sistema | Atualiza card lateral com dados do geohash hovered |
| 5 | Sistema | Card exibe: header + prioridade + aba Camada 1 (default) |
| 6 | Analista | Move cursor para fora do poligono |
| 7 | Sistema | Restaura poligono ao estado normal (opacity 0.4, cor quadrante) |
| 8 | Sistema | Card lateral volta ao estado vazio ("Territorios de Acao") |

## Fluxo Alternativo: Click — Fixar (Pin)

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica em um poligono geohash |
| 2 | Sistema | Se ja existe pin no MESMO geohash: desfixa (unpin) — volta ao estado vazio |
| 3 | Sistema | Se ja existe pin em OUTRO geohash: restaura o anterior, fixa o novo |
| 4 | Sistema | Se nao existe pin: fixa o geohash clicado |
| 5 | Sistema | Destaca poligono fixado (opacity 0.8, stroke branco 3px, zIndex 20) |
| 6 | Sistema | Card lateral mostra badge "Fixado" com icone de pin |
| 7 | Sistema | Hover em outros poligonos NAO atualiza o card (pin tem prioridade) |
| 8 | Sistema | Persiste geohash fixado na sessao (UC011) |

## Conteudo do Card — Camada 1 (Comercial)

| Secao | Dados Exibidos | Fonte |
|-------|----------------|-------|
| Header | ID geohash, bairro, cidade, badge Top 10, badge tecnologia, cor quadrante | vw_geohash_summary |
| Prioridade | Label, rank #N/total, percentil 0-100, barra de progresso (RN004-01) | Calculado |
| SpeedTest Satisfacao | Barras para VIVO/TIM/CLARO (0-10), benchmarks regionais | score, benchmark_config |
| SpeedTest Tecnico | Download (Mbps), Latencia (ms), qualidade label (RN004-02) | file_transfer agregado |
| Share de Mercado | Donut %, clientes ativos, populacao, label penetracao | vw_geohash_summary |
| Trend de Share | Direcao (UP/DOWN/STABLE), delta em pp, detalhe fibra/movel | vw_geohash_summary |
| CRM | ARPU, device tier, plano predominante | Futuro: CRM externo |
| Demografia | Renda media, densidade pop., crescimento, severidade | geo_por_latlong |
| Insights | Ate 2 insights auto-gerados (RN004-03) | Calculado |
| Estrategia | Label quadrante, titulo, motivo, cor | Derivado de RN001-01 |

## Conteudo do Card — Camada 2 (Infraestrutura)

| Secao | Dados Exibidos | Fonte |
|-------|----------------|-------|
| Fibra | Classificacao, score 0-100, label, campos condicionais (RN004-04) | Calculado |
| Movel | Classificacao, score 0-100, label, campos condicionais (RN004-05) | Calculado |
| Decisao Integrada | Texto de recomendacao combinando fibra + movel | Calculado |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC004-alt-flows.md#fa01) | Geohash sem dados de Camada 2 |
| Alternativo | [FA02](./UC004-alt-flows.md#fa02) | Geohash sem dados de CRM |
| Alternativo | [FA03](./UC004-alt-flows.md#fa03) | Hover bloqueado por pin ativo |

## Regras de Negocio Aplicadas

Veja [UC004-business-rules.md](./UC004-business-rules.md)

## Pontos de Funcao

Veja [UC004-function-points.md](./UC004-function-points.md)
