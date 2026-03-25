# UC002 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC002-main-flow.md)

## RN002-01 — Toggle de Quadrante

| Campo | Valor |
|-------|-------|
| **ID** | RN002-01 |
| **Tipo** | Validacao |
| **Passos** | Passo 2 |

**Descricao:**
O estado de filtro de quadrantes e um Set de quadrantes ativos. Cada clique alterna (toggle) a presenca do quadrante no Set.

- Estado inicial: todos os 4 quadrantes ativos
- Ordem de exibicao: GROWTH -> UPSELL -> GROWTH_RETENCAO -> RETENCAO
- Multiplos quadrantes podem estar ativos simultaneamente
- Todos podem ser desativados (resultado: 0 poligonos visiveis)

---

## RN002-02 — Funcao de Visibilidade

| Campo | Valor |
|-------|-------|
| **ID** | RN002-02 |
| **Tipo** | Calculo |
| **Passos** | Passo 3 |

**Descricao:**
A visibilidade de um geohash e a intersecao de dois filtros:

```
isVisible(gh, quadrantFilters, techFilter) =
  quadrantFilters.has(gh.quadrant)
  AND (techFilter === "TODOS" OR gh.technology === techFilter OR gh.technology === "AMBOS")
```

**Exemplo:**
- Filtros: {GROWTH, UPSELL}, tech=FIBRA
- Geohash(quadrant=GROWTH, tech=FIBRA) -> visivel
- Geohash(quadrant=GROWTH, tech=MOVEL) -> oculto
- Geohash(quadrant=RETENCAO, tech=FIBRA) -> oculto

---

## RN002-03 — Estilo dos Botoes de Filtro

| Campo | Valor |
|-------|-------|
| **ID** | RN002-03 |
| **Tipo** | Derivacao |
| **Passos** | Passo 6 |

**Descricao:**

| Estado | Background | Texto | Efeito |
|--------|-----------|-------|--------|
| Ativo | QUADRANT_COLORS[q].hex | branco | box-shadow glow |
| Inativo | branco | slate-400 | borda slate-200 |

Cada botao exibe: icone + label + contagem de geohashes no quadrante.
