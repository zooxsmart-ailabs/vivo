# UC011 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC011-main-flow.md)

## RN011-01 — Estrutura do SessionState

| Campo | Valor |
|-------|-------|
| **ID** | RN011-01 |
| **Tipo** | Derivação |
| **Passos** | Persistir Passo 3 |

**Descrição:**

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

## RN011-02 — Defaults (Primeira Sessão)

| Campo | Valor |
|-------|-------|
| **ID** | RN011-02 |
| **Tipo** | Derivação |
| **Passos** | Restaurar Passo 7 |

**Descrição:**

| Campo | Default |
|-------|---------|
| activeTab | "/" |
| mapCenter | Centro da última cidade com dados |
| mapZoom | 11 |
| período | Últimos 3 meses com dados |
| localização | Estado e cidade com mais dados |
| activeQuadrants | Todos (OPORTUNIDADE, FORTALEZA, EXPANSAO, RISCO) |
| techFilter | "TODOS" |
| pinnedGeohashId | null |
| activeStrategy | "RISCO" |
| rankingTab | "OPORTUNIDADE" |

---

## RN011-03 — Estratégia de Persistência

| Campo | Valor |
|-------|-------|
| **ID** | RN011-03 |
| **Tipo** | Derivação |
| **Passos** | Persistir Passo 5 |

**Descrição:**
Dupla persistência para resiliência:

1. **Redis** (primário): TTL 30 dias, acesso rápido, chave `session:{userId}`
2. **PostgreSQL** (backup): tabela `user_session`, sem TTL, atualizado a cada save

Na restauração:
1. Tenta Redis (rápido)
2. Fallback para PostgreSQL se Redis miss
3. Defaults se ambos falham
