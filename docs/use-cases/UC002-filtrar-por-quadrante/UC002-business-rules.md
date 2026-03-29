# UC002 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC002-main-flow.md)

**Versao**: 2.0 | **Data**: 2026-03-29

## RN002-01 — Toggle de Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN002-01 |
| **Tipo** | Validacao |
| **Passos** | Passo 2 |

**Descricao:**
O estado de filtro e um Set de quadrantes ativos. Cada clique alterna (toggle).

- Estado inicial: todos os 4 quadrantes ativos
- **Ordem de exibicao**: OPORTUNIDADE → FORTALEZA → EXPANSAO → RISCO
- Multiplos podem estar ativos simultaneamente
- Todos podem ser desativados (0 poligonos visiveis)

---

## RN002-02 — Funcao de Visibilidade

| Campo | Valor |
|-------|-------|
| **ID** | RN002-02 |
| **Tipo** | Calculo |
| **Passos** | Passo 3 |

**Descricao:**
```
isVisible(gh, quadrantFilters, techFilter) =
  quadrantFilters.has(gh.quadrant)
  AND (techFilter === "TODOS" OR gh.technology === techFilter OR gh.technology === "AMBOS")
```

**Exemplo:**
- Filtros: {OPORTUNIDADE, FORTALEZA}, tech=FIBRA
- Geohash(quadrant=OPORTUNIDADE, tech=FIBRA) → visivel
- Geohash(quadrant=OPORTUNIDADE, tech=MOVEL) → oculto
- Geohash(quadrant=RISCO, tech=FIBRA) → oculto

---

## RN002-03 — Estilo dos Botoes de Filtro

| Campo | Valor |
|-------|-------|
| **ID** | RN002-03 |
| **Tipo** | Derivacao |
| **Passos** | Passo 6 |

**Descricao:**

| Quadrante | Cor Ativo | Label |
|-----------|----------|-------|
| OPORTUNIDADE | #22C55E | Oportunidade |
| FORTALEZA | #7C3AED | Fortaleza |
| EXPANSAO | #F97316 | Expansao |
| RISCO | #EF4444 | Risco |

Estado inativo: fundo branco, texto cinza, borda slate-200.
