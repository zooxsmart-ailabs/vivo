# UC001 — Visualizar Mapa Estrategico de Geohashes

| Campo | Valor |
|-------|-------|
| **ID** | UC001 |
| **Nome** | Visualizar Mapa Estrategico de Geohashes |
| **Ator Primario** | Analista |
| **Atores Secundarios** | Google Maps API, NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC002, UC003, UC004, UC005, UC006, UC008 |

## Objetivo

O Analista visualiza o mapa interativo com poligonos geohash coloridos por quadrante estrategico, obtendo uma visao geral da distribuicao territorial de share e satisfacao da Vivo vs concorrentes.

## Pre-condicoes

- PC01: O Analista esta autenticado (UC012) ou o guard esta em modo bypass (dev)
- PC02: Existe conexao WebSocket ativa com o backend via tRPC
- PC03: Existem dados de QoE carregados no banco para o periodo selecionado (UC006)
- PC04: O filtro de localizacao esta definido (UC008) — default: ultimo estado/cidade usado na sessao

## Pos-condicoes (Sucesso)

- PS01: O mapa exibe poligonos geohash coloridos por quadrante dentro do viewport e periodo selecionado
- PS02: A legenda mostra os 4 quadrantes com cores e contadores
- PS03: Os contadores de resumo estao visiveis (total, visiveis, em risco)
- PS04: O estado do mapa (centro, zoom, filtros) e persistido na sessao (UC011)

## Pos-condicoes (Falha)

- PF01: Mapa renderiza sem poligonos; mensagem "Sem dados para o periodo/regiao selecionados"
- PF02: Estado anterior da sessao e mantido

## Fluxo Principal

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aba "Mapa Estrategico" (rota `/`) |
| 2 | Sistema | Restaura estado da sessao: centro do mapa, zoom, filtros ativos (UC011) |
| 3 | Sistema | Calcula o viewport (bounding box) a partir do centro e zoom |
| 4 | Sistema | Envia subscription tRPC via WebSocket: `geohash.subscribe({ viewport, periodo, localizacao, precisao })` |
| 5 | Sistema | Backend consulta `vw_geohash_summary` filtrada por viewport, periodo e localizacao |
| 6 | Sistema | Backend retorna array de GeohashData via WS stream |
| 7 | Sistema | Renderiza Google Maps com estilo analitico (cinza claro, sem POIs) |
| 8 | Sistema | Para cada geohash recebido, cria poligono com cor do quadrante (RN001-01) |
| 9 | Sistema | Exibe legenda com 4 quadrantes, cores e contadores |
| 10 | Sistema | Exibe contadores de resumo: "X/Y visiveis", "Z em risco" (RISCO) |
| 11 | Sistema | Exibe hint flutuante: "Passe o cursor sobre uma celula para ver a ficha estrategica" |
| 12 | Analista | Visualiza o mapa com poligonos coloridos |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC001-alt-flows.md#fa01) | Viewport sem dados para o periodo |
| Alternativo | [FA02](./UC001-alt-flows.md#fa02) | Reconexao WebSocket apos perda |
| Excecao | [FE01](./UC001-alt-flows.md#fe01) | Falha na conexao WebSocket |
| Excecao | [FE02](./UC001-alt-flows.md#fe02) | Google Maps API indisponivel |
| Include | [UC006](../UC006-filtrar-por-periodo/UC006-main-flow.md) | Sempre (periodo default: ultimos 3 meses) |
| Include | [UC008](../UC008-filtrar-por-localizacao/UC008-main-flow.md) | Sempre (localizacao default: sessao ou centro SP) |
| Extend | [UC002](../UC002-filtrar-por-quadrante/UC002-main-flow.md) | Analista ativa/desativa quadrantes |
| Extend | [UC003](../UC003-filtrar-por-tecnologia/UC003-main-flow.md) | Analista muda filtro de tecnologia |
| Extend | [UC004](../UC004-inspecionar-geohash/UC004-main-flow.md) | Analista interage com poligono |
| Extend | [UC005](../UC005-drill-down-geoespacial/UC005-main-flow.md) | Analista altera zoom do mapa |

## Regras de Negocio Aplicadas

Veja [UC001-business-rules.md](./UC001-business-rules.md)

## Pontos de Funcao

Veja [UC001-function-points.md](./UC001-function-points.md)
