# UC002 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC002-main-flow.md)

**Versão**: 2.0 | **Data**: 2026-03-29

## RN002-01 — Toggle de Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN002-01 |
| **Tipo** | Validação |
| **Passos** | Passo 2 |

**Descrição:**
O estado de filtro é um Set de quadrantes ativos. Cada clique alterna (toggle).

- Estado inicial: todos os 4 quadrantes ativos
- **Ordem de exibição**: OPORTUNIDADE → FORTALEZA → EXPANSÃO → RISCO
- Múltiplos podem estar ativos simultaneamente
- Todos podem ser desativados (0 polígonos visíveis)

---

## RN002-02 — Função de Visibilidade

| Campo | Valor |
|-------|-------|
| **ID** | RN002-02 |
| **Tipo** | Cálculo |
| **Passos** | Passo 3 |

**Descrição:**
```
isVisible(gh, quadrantFilters, techFilter) =
  quadrantFilters.has(gh.quadrant)
  AND (techFilter === "TODOS" OR gh.technology === techFilter OR gh.technology === "AMBOS")
```

**Exemplo:**
- Filtros: {OPORTUNIDADE, FORTALEZA}, tech=FIBRA
- Geohash(quadrant=OPORTUNIDADE, tech=FIBRA) → visível
- Geohash(quadrant=OPORTUNIDADE, tech=MOVEL) → oculto
- Geohash(quadrant=RISCO, tech=FIBRA) → oculto

---

## RN002-03 — Estilo dos Botões de Filtro

| Campo | Valor |
|-------|-------|
| **ID** | RN002-03 |
| **Tipo** | Derivação |
| **Passos** | Passo 6 |

**Descrição:**

| Quadrante | Cor Ativo | Label |
|-----------|----------|-------|
| OPORTUNIDADE | #22C55E | Oportunidade |
| FORTALEZA | #7C3AED | Fortaleza |
| EXPANSÃO | #F97316 | Expansão |
| RISCO | #EF4444 | Risco |

Estado inativo: fundo branco, texto cinza, borda slate-200.
