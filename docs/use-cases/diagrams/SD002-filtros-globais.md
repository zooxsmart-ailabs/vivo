# SD002 — Filtros Globais (Periodo + Localizacao)

**UCs Referenciados:** [UC006](../UC006-filtrar-por-periodo/UC006-main-flow.md), [UC007](../UC007-comparar-periodos/UC007-main-flow.md), [UC008](../UC008-filtrar-por-localizacao/UC008-main-flow.md)

**Atores/Sistemas envolvidos:** Analista, Nuxt Frontend, NestJS Backend (tRPC), PostgreSQL, Google Maps API

---

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Usuario
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

    Note over U,DB: UC006 — Filtrar por Periodo

    U->>HDR: Abre seletor de periodo
    HDR->>WS: period.available()
    WS->>DB: SELECT DISTINCT DATE_TRUNC('month', ts_result)
    DB-->>WS: meses[]
    WS-->>HDR: meses disponiveis
    U->>HDR: Seleciona Jan-Mar 2026
    HDR->>HDR: Valida intervalo (max 12 meses)
    HDR->>MAP: Emite periodChange({ inicio, fim })
    HDR->>FRT: Emite periodChange
    HDR->>BRR: Emite periodChange
    MAP->>WS: geohash.subscribe({ ..., periodo: Jan-Mar })
    FRT->>WS: frentes.subscribe({ ..., periodo: Jan-Mar })
    BRR->>WS: bairros.subscribe({ ..., periodo: Jan-Mar })
    WS->>DB: Queries filtradas por periodo
    DB-->>WS: Dados recalculados
    WS-->>MAP: GeohashData[] atualizado
    WS-->>FRT: FrentesData[] atualizado
    WS-->>BRR: BairroData[] atualizado

    Note over U,DB: UC007 — Comparar Periodos (Diff)

    U->>HDR: Ativa modo comparacao
    U->>HDR: Seleciona periodo comparacao: Out-Dez 2025
    HDR->>HDR: Valida nao sobreposicao
    HDR->>WS: geohash.compare({ base: Jan-Mar, comp: Out-Dez })
    WS->>DB: Query periodo base + Query periodo comparacao
    DB-->>WS: Dados de ambos periodos
    WS->>WS: Calcula diff por metrica (RN007-03)
    WS-->>MAP: GeohashDiffData[]
    MAP->>MAP: Exibe indicadores de variacao
    MAP-->>U: Poligonos com deltas visiveis

    Note over U,DB: UC008 — Filtrar por Localizacao

    U->>HDR: Seleciona Estado: GO, Cidade: Goiania
    HDR->>MAP: Emite locationChange({ estado: GO, cidade: Goiania })
    MAP->>MAP: Centraliza mapa em Goiania, zoom 11
    MAP->>WS: geohash.subscribe({ ..., localizacao: { estado: GO, cidade: Goiania } })
    WS->>DB: WHERE state='GO' AND city='Goiania'
    DB-->>WS: GeohashData[] de Goiania
    WS-->>MAP: stream dados
    MAP-->>U: Mapa centralizado em Goiania
```

## Notas do Diagrama

- **Passos 1-17:** UC006 — mudanca de periodo propaga para TODAS as abas simultaneamente via contexto global.
- **Passos 19-28:** UC007 — backend calcula diff server-side para nao sobrecarregar frontend.
- **Passos 30-38:** UC008 — localizacao centraliza mapa e filtra dados. Bidirecional com pan do mapa.
