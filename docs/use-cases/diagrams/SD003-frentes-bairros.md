# SD003 — Consulta de Frentes e Bairros

**UCs Referenciados:** [UC009](../UC009-consultar-frente-estrategica/UC009-main-flow.md), [UC010](../UC010-consultar-visao-bairro/UC010-main-flow.md)

**Atores/Sistemas envolvidos:** Analista, Nuxt Frontend, NestJS Backend (tRPC), PostgreSQL, Redis

---

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Usuário
        participant U as Analista
    end
    box rgb(220, 252, 231) Frontend (Nuxt)
        participant NAV as Navegação
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

    Note over U,CACHE: UC009 — Consultar Frente Estratégica

    U->>NAV: Clica aba "Frentes Estratégicas"
    NAV->>FRT: Navega para /frentes
    FRT->>WS: frentes.byStrategy({ strategy: RISCO, período, localização })
    WS->>CACHE: GET cache:frentes:RISCO:{hash}
    alt Cache HIT
        CACHE-->>WS: FrenteData[]
    else Cache MISS
        WS->>SVC: getByStrategy(params)
        SVC->>DB: SELECT FROM vw_geohash_summary WHERE quadrant='RISCO'
        DB-->>SVC: rows[]
        SVC->>SVC: Calcula ranking por prioridade (RN004-01)
        SVC->>SVC: Calcula KPIs (total clientes, media share, media sat.)
        SVC->>CACHE: SET cache:frentes:RISCO:{hash} TTL 5min
        SVC-->>WS: { geohashes: [], kpis: {} }
    end
    WS-->>FRT: Stream dados
    FRT->>FRT: Renderiza sidebar (ranking) + FlowPanel (3 colunas)
    FRT-->>U: Frente RISCO com ranking e fluxo

    U->>FRT: Seleciona geohash #3 da lista
    FRT->>FRT: Atualiza FlowPanel com dados do geohash
    FRT-->>U: Dados + Perfis + Ações do geohash

    U->>FRT: Muda para aba FORTALEZA
    FRT->>WS: frentes.byStrategy({ strategy: FORTALEZA, ... })
    WS->>DB: (mesma cadeia de cache/query)
    WS-->>FRT: Stream dados FORTALEZA
    FRT-->>U: Frente FORTALEZA renderizada

    Note over U,CACHE: UC010 — Consultar Visão por Bairro

    U->>NAV: Clica aba "Visão por Bairro"
    NAV->>BRR: Navega para /bairros
    BRR->>WS: bairros.list({ período, localização })
    WS->>SVC: aggregateByNeighborhood(params)
    SVC->>DB: SELECT FROM vw_bairro_summary WHERE ...
    DB-->>SVC: bairros[]
    SVC-->>WS: BairroData[]
    WS-->>BRR: Stream dados

    BRR->>BRR: Renderiza ranking por categoria (default: OPORTUNIDADE)
    BRR-->>U: Lista de bairros + detalhamento

    U->>BRR: Seleciona bairro "Santana"
    BRR->>WS: bairros.detail({ bairro: "Santana", período, localização })
    WS->>SVC: getBairroDetail(params)
    SVC->>DB: Query detalhada (KPIs + Camada 1 + Camada 2)
    DB-->>SVC: Dados agregados
    SVC-->>WS: BairroDetailData
    WS-->>BRR: Stream detalhe
    BRR-->>U: Painel de detalhamento completo
```

## Notas do Diagrama

- **Passos 1-16:** UC009 — fluxo completo de consulta de frente com cache Redis.
- **Passos 18-20:** Seleção de geohash e operação local (dados já carregados).
- **Passos 22-26:** Mudança de aba de estratégia dispara nova query.
- **Passos 28-37:** UC010 — lista de bairros carregada na navegação.
- **Passos 39-46:** Seleção de bairro pode carregar detalhes adicionais do backend.
