# SD003 — Consulta de Frentes e Bairros

**UCs Referenciados:** [UC009](../UC009-consultar-frente-estrategica/UC009-main-flow.md), [UC010](../UC010-consultar-visao-bairro/UC010-main-flow.md)

**Atores/Sistemas envolvidos:** Analista, Nuxt Frontend, NestJS Backend (tRPC), PostgreSQL, Redis

---

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Usuario
        participant U as Analista
    end
    box rgb(220, 252, 231) Frontend (Nuxt)
        participant NAV as Navegacao
        participant FRT as Frentes Page
        participant BRR as Bairros Page
    end
    box rgb(254, 243, 199) Backend (NestJS)
        participant WS as tRPC WS Router
        participant SVC as AnalyticsService
    end
    box rgb(252, 231, 243) Dados
        participant DB as PostgreSQL
        participant CACHE as Redis
    end

    Note over U,CACHE: UC009 — Consultar Frente Estrategica

    U->>NAV: Clica aba "Frentes Estrategicas"
    NAV->>FRT: Navega para /frentes
    FRT->>WS: frentes.byStrategy({ strategy: RETENCAO, periodo, localizacao })
    WS->>CACHE: GET cache:frentes:RETENCAO:{hash}
    alt Cache HIT
        CACHE-->>WS: FrenteData[]
    else Cache MISS
        WS->>SVC: getByStrategy(params)
        SVC->>DB: SELECT FROM vw_geohash_summary WHERE quadrant='RETENCAO'
        DB-->>SVC: rows[]
        SVC->>SVC: Calcula ranking por prioridade (RN004-01)
        SVC->>SVC: Calcula KPIs (total clientes, media share, media sat.)
        SVC->>CACHE: SET cache:frentes:RETENCAO:{hash} TTL 5min
        SVC-->>WS: { geohashes: [], kpis: {} }
    end
    WS-->>FRT: Stream dados
    FRT->>FRT: Renderiza sidebar (ranking) + FlowPanel (3 colunas)
    FRT-->>U: Frente RETENCAO com ranking e fluxo

    U->>FRT: Seleciona geohash #3 da lista
    FRT->>FRT: Atualiza FlowPanel com dados do geohash
    FRT-->>U: Dados + Perfis + Acoes do geohash

    U->>FRT: Muda para aba UPSELL
    FRT->>WS: frentes.byStrategy({ strategy: UPSELL, ... })
    WS->>DB: (mesma cadeia de cache/query)
    WS-->>FRT: Stream dados UPSELL
    FRT-->>U: Frente UPSELL renderizada

    Note over U,CACHE: UC010 — Consultar Visao por Bairro

    U->>NAV: Clica aba "Visao por Bairro"
    NAV->>BRR: Navega para /bairros
    BRR->>WS: bairros.list({ periodo, localizacao })
    WS->>SVC: aggregateByNeighborhood(params)
    SVC->>DB: SELECT FROM vw_bairro_summary WHERE ...
    DB-->>SVC: bairros[]
    SVC-->>WS: BairroData[]
    WS-->>BRR: Stream dados

    BRR->>BRR: Renderiza ranking por categoria (default: GROWTH)
    BRR-->>U: Lista de bairros + detalhamento

    U->>BRR: Seleciona bairro "Santana"
    BRR->>WS: bairros.detail({ bairro: "Santana", periodo, localizacao })
    WS->>SVC: getBairroDetail(params)
    SVC->>DB: Query detalhada (KPIs + Camada 1 + Camada 2)
    DB-->>SVC: Dados agregados
    SVC-->>WS: BairroDetailData
    WS-->>BRR: Stream detalhe
    BRR-->>U: Painel de detalhamento completo
```

## Notas do Diagrama

- **Passos 1-16:** UC009 — fluxo completo de consulta de frente com cache Redis.
- **Passos 18-20:** Selecao de geohash e operacao local (dados ja carregados).
- **Passos 22-26:** Mudanca de aba de estrategia dispara nova query.
- **Passos 28-37:** UC010 — lista de bairros carregada na navegacao.
- **Passos 39-46:** Selecao de bairro pode carregar detalhes adicionais do backend.
