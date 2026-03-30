# SD002 — Filtros Globais (Período + Localização)

**UCs Referenciados:** [UC006](../UC006-filtrar-por-periodo/UC006-main-flow.md), [UC007](../UC007-comparar-periodos/UC007-main-flow.md), [UC008](../UC008-filtrar-por-localizacao/UC008-main-flow.md)

**Atores/Sistemas envolvidos:** Analista, Nuxt Frontend, NestJS Backend (tRPC), PostgreSQL, Google Maps API

---

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Usuário
        participant U as Analista
    end
    box rgb(220, 252, 231) Frontend (Nuxt)
        participant HDR as Header (Filtros Globais)
        participant MAP as Mapa Component
        participant FRT as Frentes Component
        participant BRR as Bairros Component
    end
    box rgb(254, 243, 199) Backend (NestJS)
        participant WS as tRPC WS Router
        participant SVC as Services
    end
    box rgb(252, 231, 243) Dados
        participant DB as PostgreSQL
    end

    Note over U,DB: UC006 — Filtrar por Período

    U->>HDR: Abre seletor de período
    HDR->>WS: period.available()
    WS->>DB: SELECT DISTINCT DATE_TRUNC('month', ts_result)
    DB-->>WS: meses[]
    WS-->>HDR: meses disponíveis
    U->>HDR: Seleciona Jan-Mar 2026
    HDR->>HDR: Valida intervalo (max 12 meses)
    HDR->>MAP: Emite periodChange({ inicio, fim })
    HDR->>FRT: Emite periodChange
    HDR->>BRR: Emite periodChange
    MAP->>WS: geohash.subscribe({ ..., período: Jan-Mar })
    FRT->>WS: frentes.subscribe({ ..., período: Jan-Mar })
    BRR->>WS: bairros.subscribe({ ..., período: Jan-Mar })
    WS->>DB: Queries filtradas por período
    DB-->>WS: Dados recalculados
    WS-->>MAP: GeohashData[] atualizado
    WS-->>FRT: FrentesData[] atualizado
    WS-->>BRR: BairroData[] atualizado

    Note over U,DB: UC007 — Comparar Períodos (Diff)

    U->>HDR: Ativa modo comparação
    U->>HDR: Seleciona período comparação: Out-Dez 2025
    HDR->>HDR: Valida nao sobreposicao
    HDR->>WS: geohash.compare({ base: Jan-Mar, comp: Out-Dez })
    WS->>DB: Query período base + Query período comparação
    DB-->>WS: Dados de ambos períodos
    WS->>WS: Calcula diff por métrica (RN007-03)
    WS-->>MAP: GeohashDiffData[]
    MAP->>MAP: Exibe indicadores de variacao
    MAP-->>U: Poligonos com deltas visiveis

    Note over U,DB: UC008 — Filtrar por Localização

    U->>HDR: Seleciona Estado: GO, Cidade: Goiania
    HDR->>MAP: Emite locationChange({ estado: GO, cidade: Goiania })
    MAP->>MAP: Centraliza mapa em Goiania, zoom 11
    MAP->>WS: geohash.subscribe({ ..., localização: { estado: GO, cidade: Goiania } })
    WS->>DB: WHERE state='GO' AND city='Goiania'
    DB-->>WS: GeohashData[] de Goiania
    WS-->>MAP: stream dados
    MAP-->>U: Mapa centralizado em Goiania
```

## Notas do Diagrama

- **Passos 1-17:** UC006 — mudança de período propaga para TODAS as abas simultaneamente via contexto global.
- **Passos 19-28:** UC007 — backend calcula diff server-side para nao sobrecarregar frontend.
- **Passos 30-38:** UC008 — localização centraliza mapa e filtra dados. Bidirecional com pan do mapa.
