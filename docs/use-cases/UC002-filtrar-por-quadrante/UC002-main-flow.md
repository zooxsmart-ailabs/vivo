# UC002 — Filtrar Geohashes por Quadrante Estratégico

| Campo | Valor |
|-------|-------|
| **ID** | UC002 |
| **Nome** | Filtrar Geohashes por Quadrante Estratégico |
| **Ator Primário** | Analista |
| **Atores Secundários** | — |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referências** | UC001, UC011 |

## Objetivo

O Analista ativa/desativa a visibilidade de geohashes por quadrante estratégico (OPORTUNIDADE, FORTALEZA, RISCO, EXPANSÃO) para focar a análise em estratégias específicas.

## Pré-condições

- PC01: O mapa está renderizado com polígonos (UC001 concluído)

## Pós-condições (Sucesso)

- PS01: Apenas polígonos dos quadrantes ativos são visíveis no mapa
- PS02: Contadores de resumo atualizados
- PS03: Estado dos filtros persistido na sessão (UC011)

## Pós-condições (Falha)

- PF01: Não aplicável — operação local, sem dependência de backend

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica no botão de toggle de um quadrante (ex: "Retenção") |
| 2 | Sistema | Alterna o estado do quadrante no Set de filtros ativos (RN002-01) |
| 3 | Sistema | Para cada polígono no mapa, recalcula visibilidade: `isVisible(gh, activeFilters, techFilter)` |
| 4 | Sistema | Atualiza `polygon.setVisible(isVisible)` para cada polígono |
| 5 | Sistema | Atualiza contadores: "X/Y visíveis" |
| 6 | Sistema | Atualiza estilo do botão: ativo (cor do quadrante, glow) ou inativo (cinza) |
| 7 | Sistema | Persiste estado dos filtros na sessão (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC002-alt-flows.md#fa01) | Todos os quadrantes desativados |

## Regras de Negócio Aplicadas

Veja [UC002-business-rules.md](./UC002-business-rules.md)

## Pontos de Função

Veja [UC002-function-points.md](./UC002-function-points.md)
