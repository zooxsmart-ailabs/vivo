# UC002 — Filtrar Geohashes por Quadrante Estratégico

| Campo | Valor |
|-------|-------|
| **ID** | UC002 |
| **Nome** | Filtrar Geohashes por Quadrante Estratégico |
| **Ator Primario** | Analista |
| **Atores Secundarios** | — |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC001, UC011 |

## Objetivo

O Analista ativa/desativa a visibilidade de geohashes por quadrante estratégico (OPORTUNIDADE, FORTALEZA, RISCO, EXPANSAO) para focar a análise em estratégias especificas.

## Pre-condições

- PC01: O mapa esta renderizado com poligonos (UC001 concluido)

## Pos-condições (Sucesso)

- PS01: Apenas poligonos dos quadrantes ativos sao visiveis no mapa
- PS02: Contadores de resumo atualizados
- PS03: Estado dos filtros persistido na sessão (UC011)

## Pos-condições (Falha)

- PF01: Nao aplicavel — operação local, sem dependência de backend

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica no botao de toggle de um quadrante (ex: "Retenção") |
| 2 | Sistema | Alterna o estado do quadrante no Set de filtros ativos (RN002-01) |
| 3 | Sistema | Para cada poligono no mapa, recalcula visibilidade: `isVisible(gh, activeFilters, techFilter)` |
| 4 | Sistema | Atualiza `polygon.setVisible(isVisible)` para cada poligono |
| 5 | Sistema | Atualiza contadores: "X/Y visiveis" |
| 6 | Sistema | Atualiza estilo do botao: ativo (cor do quadrante, glow) ou inativo (cinza) |
| 7 | Sistema | Persiste estado dos filtros na sessão (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC002-alt-flows.md#fa01) | Todos os quadrantes desativados |

## Regras de Negócio Aplicadas

Veja [UC002-business-rules.md](./UC002-business-rules.md)

## Pontos de Função

Veja [UC002-function-points.md](./UC002-function-points.md)
