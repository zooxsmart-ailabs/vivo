# SD001 — Navegação e Filtragem no Mapa

**UCs Referenciados:** [UC001](../UC001-visualizar-mapa-estrategico/UC001-main-flow.md), [UC002](../UC002-filtrar-por-quadrante/UC002-main-flow.md), [UC003](../UC003-filtrar-por-tecnologia/UC003-main-flow.md), [UC004](../UC004-inspecionar-geohash/UC004-main-flow.md), [UC005](../UC005-drill-down-geoespacial/UC005-main-flow.md)

**Atores/Sistemas envolvidos:** Analista, Nuxt Frontend, NestJS Backend (tRPC), PostgreSQL, Redis, Google Maps API

---

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Usuário
        participant U as Analista
    end
    box rgb(220, 252, 231) Frontend (Nuxt)
        participant MAP as Mapa Component
        participant FILT as Filtros Component
        participant CARD as GeohashCard
    end
    box rgb(254, 243, 199) Backend (NestJS)
        participant WS as tRPC WS Router
        participant SVC as GeohashService
    end
    box rgb(252, 231, 243) Dados
        participant DB as PostgreSQL + TimescaleDB
        participant CACHE as Redis
    end

    Note over U,CACHE: UC001 — Visualizar Mapa Estratégico

    U->>MAP: Acessa aba Mapa Estratégico
    MAP->>WS: geohash.subscribe({ viewport, período, precisao })
    WS->>CACHE: GET cache:geohash:{hash}
    alt Cache HIT
        CACHE-->>WS: GeohashData[]
    else Cache MISS
        WS->>SVC: findByViewport(params)
        SVC->>DB: SELECT * FROM vw_geohash_summary WHERE ...
        DB-->>SVC: rows[]
        SVC->>CACHE: SET cache:geohash:{hash} TTL 5min
        SVC-->>WS: GeohashData[]
    end
    WS-->>MAP: stream GeohashData[]
    MAP->>MAP: Renderiza poligonos por quadrante (RN001-01)
    MAP-->>U: Mapa com poligonos coloridos

    Note over U,CACHE: UC002 — Filtrar por Quadrante

    U->>FILT: Toggle quadrante (ex: desativa RISCO)
    FILT->>MAP: Emite filterChange({ quadrants })
    MAP->>MAP: polygon.setVisible(isVisible) para cada poligono
    MAP->>MAP: Atualiza contadores
    MAP-->>U: Poligonos filtrados

    Note over U,CACHE: UC003 — Filtrar por Tecnologia

    U->>FILT: Seleciona FIBRA
    FILT->>MAP: Emite techFilterChange("FIBRA")
    MAP->>MAP: polygon.setVisible(isVisible) + nota na legenda
    MAP-->>U: Apenas geohashes FIBRA/AMBOS visiveis

    Note over U,CACHE: UC004 — Inspecionar Geohash (Hover + Pin)

    U->>MAP: Hover sobre poligono
    MAP->>CARD: setHoveredGeohash(data)
    CARD-->>U: Exibe card Camada 1 (satisfação, share, trend)
    U->>MAP: Click no poligono (pin)
    MAP->>CARD: setPinnedGeohash(data)
    CARD-->>U: Card fixado com badge "Fixado"

    Note over U,CACHE: UC005 — Drill-down Geoespacial

    U->>MAP: Zoom in (11 -> 14)
    MAP->>MAP: Debounce 300ms, calcula precisao 6 -> 7
    MAP->>WS: geohash.subscribe({ viewport, precisao: 7 })
    WS->>SVC: findByViewport(params)
    SVC->>DB: SELECT * FROM vw_geohash_summary WHERE precisao=7
    DB-->>SVC: rows[] (mais granulares)
    SVC-->>WS: GeohashData[]
    WS-->>MAP: stream novos dados
    MAP->>MAP: Fade out antigos, fade in novos
    MAP-->>U: Poligonos na precisao 7
```

## Notas do Diagrama

- **Passos 3-11:** UC001 fluxo principal. Cache Redis com TTL 5min para reduzir carga no PG.
- **Passos 13-16:** UC002 e operação local (frontend), sem ida ao backend.
- **Passos 18-20:** UC003 idem — filtro local.
- **Passos 22-26:** UC004 — hover e pin sao operacoes locais sobre dados ja carregados.
- **Passos 28-36:** UC005 — drill-down dispara nova subscription com precisao diferente.
