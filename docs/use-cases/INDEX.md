# Casos de Uso — Zoox x Vivo GeoIntelligence

**Versão:** 3.0 | **Data:** 2026-03-30 | **Total de PF:** 212

## Atores

| Ator | Tipo | Descrição |
|------|------|-----------|
| Analista | Primário | Usuário da plataforma que analisa métricas de QoE e toma decisoes estratégicas |
| Sistema de Auth | Secundário | Provedor externo de autenticação /autorização (plugavel) |
| Google Maps API | Secundário | Servico de mapas para renderização de poligonos geohash |
| PostgreSQL + TimescaleDB | Secundário | Base de dados geoespacial e temporal |
| Redis | Secundário | Cache e pub/sub para WebSocket |
| SigNoz | Secundário | Plataforma de observabilidade via OpenTelemetry/gRPC |

## Módulos Funcionais

### M1 — Mapa Estratégico

| ID | Nome | Ator Primário | Prioridade | PF | Status |
|----|------|---------------|------------|-----|--------|
| [UC001](./UC001-visualizar-mapa-estrategico/UC001-main-flow.md) | Visualizar Mapa Estratégico de Geohashes | Analista | Alta | 28 | Rascunho |
| [UC002](./UC002-filtrar-por-quadrante/UC002-main-flow.md) | Filtrar Geohashes por Quadrante Estratégico | Analista | Alta | 10 | Rascunho |
| [UC003](./UC003-filtrar-por-tecnologia/UC003-main-flow.md) | Filtrar Geohashes por Tecnologia | Analista | Alta | 10 | Rascunho |
| [UC004](./UC004-inspecionar-geohash/UC004-main-flow.md) | Inspecionar Detalhes do Geohash | Analista | Alta | 22 | Rascunho |

### M2 — Navegação Geoespacial

| ID | Nome | Ator Primário | Prioridade | PF | Status |
|----|------|---------------|------------|-----|--------|
| [UC005](./UC005-drill-down-geoespacial/UC005-main-flow.md) | Realizar Drill-down Geoespacial | Analista | Alta | 15 | Rascunho |

### M3 — Filtros Globais

| ID | Nome | Ator Primário | Prioridade | PF | Status |
|----|------|---------------|------------|-----|--------|
| [UC006](./UC006-filtrar-por-periodo/UC006-main-flow.md) | Filtrar por Período Temporal | Analista | Alta | 13 | Rascunho |
| [UC007](./UC007-comparar-periodos/UC007-main-flow.md) | Comparar Períodos (Diff) | Analista | Media | 16 | Rascunho |
| [UC008](./UC008-filtrar-por-localizacao/UC008-main-flow.md) | Filtrar por Localização Geográfica | Analista | Alta | 13 | Rascunho |

### M4 — Frentes Estratégicas

| ID | Nome | Ator Primário | Prioridade | PF | Status |
|----|------|---------------|------------|-----|--------|
| [UC009](./UC009-consultar-frente-estrategica/UC009-main-flow.md) | Consultar Frente Estratégica | Analista | Alta | 22 | Rascunho |

### M5 — Visão por Bairro

| ID | Nome | Ator Primário | Prioridade | PF | Status |
|----|------|---------------|------------|-----|--------|
| [UC010](./UC010-consultar-visao-bairro/UC010-main-flow.md) | Consultar Visão por Bairro | Analista | Alta | 19 | Rascunho |

### M6 — Sessão e Segurança

| ID | Nome | Ator Primário | Prioridade | PF | Status |
|----|------|---------------|------------|-----|--------|
| [UC011](./UC011-persistir-sessao/UC011-main-flow.md) | Persistir e Restaurar Estado da Sessão | Analista | Media | 13 | Rascunho |
| [UC012](./UC012-autenticar-usuario/UC012-main-flow.md) | Autenticar Usuário (Guard Plugavel) | Sistema de Auth | Alta | 13 | Rascunho |

## Diagramas de Sequência

| ID | Título | UCs Cobertos |
|----|--------|--------------|
| [SD001](./diagrams/SD001-navegacao-mapa.md) | Navegação e Filtragem no Mapa | UC001, UC002, UC003, UC004, UC005 |
| [SD002](./diagrams/SD002-filtros-globais.md) | Filtros Globais (Período + Localização ) | UC006, UC007, UC008 |
| [SD003](./diagrams/SD003-frentes-bairros.md) | Consulta de Frentes e Bairros | UC009, UC010 |
| [SD004](./diagrams/SD004-sessao-auth.md) | Sessão e Autenticação | UC011, UC012 |

## Contagem Consolidada de Pontos de Função 

### Funções de Dados (contadas uma única vez)

| ID | Nome | Tipo | DET | RET | Complexidade | PF |
|----|------|------|-----|-----|--------------|-----|
| D01 | file_transfer (QoE File Transfer) | AIE | 182 | 8 | Complexo | 10 |
| D02 | video (QoE Video Streaming) | AIE | 95 | 6 | Complexo | 10 |
| D03 | web_browsing (QoE Web Browsing) | AIE | 100 | 6 | Complexo | 10 |
| D04 | score (CS Score Calc) | AIE | 14 | 1 | Simples | 5 |
| D05 | geo_por_latlong (Dados Socioeconomicos v3) | AIE | 21 | 1 | Medio | 7 |
| D06 | user_session (Estado da Sessão) | ALI | 12 | 3 | Medio | 10 |
| D07 | vw_geohash_summary (View Consolidada v2) | ALI | 42 | 6 | Complexo | 15 |
| D08 | vw_bairro_summary (View Agregação Bairro) | ALI | 20 | 3 | Medio | 10 |
| D09 | vw_share_real (View Share FTTH+ERB) | ALI | 10 | 2 | Medio | 10 |
| D10 | benchmark_config (Parametros de Referência) | ALI | 12 | 1 | Medio | 10 |
| **D11** | **vivo_ftth_coverage (Instalações FTTH Vivo)** | **AIE** | 11 | 1 | **Medio** | **7** |
| **D12** | **vivo_mobile_erb (ERBs Movel Vivo)** | **AIE** | 10 | 1 | **Medio** | **7** |
| **D13** | **geohash_crm (Dados CRM por Geohash)** | **ALI** | 9 | 1 | **Medio** | **10** |
| **D14** | **camada2_fibra (Scores CAPEX Fibra)** | **ALI** | 14 | 2 | **Medio** | **10** |
| **D15** | **camada2_movel (Scores CAPEX Movel)** | **ALI** | 22 | 3 | **Complexo** | **15** |

**Subtotal Dados: 153 PF**

### Funções de Transação (resumo por UC)

| UC | EE | SE | CE | PF |
|----|----|----|-----|-----|
| UC001 | 0 | 7 | 3 | 28 |
| UC002 | 3 | 4 | 0 | 10 |
| UC003 | 3 | 4 | 0 | 10 |
| UC004 | 0 | 7 | 4 | 22 |
| UC005 | 3 | 5 | 0 | 15 |
| UC006 | 4 | 5 | 0 | 13 |
| UC007 | 4 | 7 | 0 | 16 |
| UC008 | 4 | 5 | 0 | 13 |
| UC009 | 0 | 7 | 4 | 22 |
| UC010 | 0 | 7 | 3 | 19 |
| UC011 | 4 | 3 | 3 | 13 |
| UC012 | 3 | 4 | 3 | 13 |

**Subtotal Transacoes: 212 PF**

### Total Geral

| Categoria | PF | Delta v3 |
|-----------|-----|---------|
| Dados | 153 | +42 (D13+D14+D15) |
| Transacoes | 212 | — |
| **Total** | **365** | **+42** |
