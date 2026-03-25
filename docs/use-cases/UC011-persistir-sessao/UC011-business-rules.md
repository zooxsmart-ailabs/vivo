# UC011 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC011-main-flow.md)

## RN011-01 — Estrutura do SessionState

| Campo | Valor |
|-------|-------|
| **ID** | RN011-01 |
| **Tipo** | Derivacao |
| **Passos** | Persistir Passo 3 |

**Descricao:**

```typescript
interface SessionState {
  // Navegacao
  activeTab: "/" | "/frentes" | "/bairros";

  // Mapa
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  geohashPrecision: number;

  // Filtros globais
  periodo: { inicio: string; fim: string };  // ISO month: "2026-01"
  comparacao?: { inicio: string; fim: string };
  localizacao: { estado: string; cidade: string; bairro?: string };

  // Filtros do mapa
  activeQuadrants: Quadrant[];
  techFilter: TechCategory | "TODOS";

  // Selecoes
  pinnedGeohashId?: string;

  // Frentes
  activeStrategy?: StrategyKey;
  selectedFrentesGeohashId?: string;
  frentesSortField?: string;
  frentesSortDir?: "asc" | "desc";

  // Bairros
  rankingTab?: RankingTab;
  selectedBairro?: string;

  // Metadata
  updatedAt: string;  // ISO datetime
}
```

---

## RN011-02 — Defaults (Primeira Sessao)

| Campo | Valor |
|-------|-------|
| **ID** | RN011-02 |
| **Tipo** | Derivacao |
| **Passos** | Restaurar Passo 7 |

**Descricao:**

| Campo | Default |
|-------|---------|
| activeTab | "/" |
| mapCenter | Centro da ultima cidade com dados |
| mapZoom | 11 |
| periodo | Ultimos 3 meses com dados |
| localizacao | Estado e cidade com mais dados |
| activeQuadrants | Todos (GROWTH, UPSELL, GROWTH_RETENCAO, RETENCAO) |
| techFilter | "TODOS" |
| pinnedGeohashId | null |
| activeStrategy | "RETENCAO" |
| rankingTab | "GROWTH" |

---

## RN011-03 — Estrategia de Persistencia

| Campo | Valor |
|-------|-------|
| **ID** | RN011-03 |
| **Tipo** | Derivacao |
| **Passos** | Persistir Passo 5 |

**Descricao:**
Dupla persistencia para resiliencia:

1. **Redis** (primario): TTL 30 dias, acesso rapido, chave `session:{userId}`
2. **PostgreSQL** (backup): tabela `user_session`, sem TTL, atualizado a cada save

Na restauracao:
1. Tenta Redis (rapido)
2. Fallback para PostgreSQL se Redis miss
3. Defaults se ambos falham
