# UC003 — Filtrar Geohashes por Tecnologia

| Campo | Valor |
|-------|-------|
| **ID** | UC003 |
| **Nome** | Filtrar Geohashes por Tecnologia |
| **Ator Primário** | Analista |
| **Atores Secundários** | — |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referências** | UC001, UC002, UC011 |

## Objetivo

O Analista filtra a visibilidade dos geohashes por categoria de tecnologia (Todos, Fibra, Móvel, Ambos) para segmentar a análise por infraestrutura.

## Pré-condições

- PC01: O mapa está renderizado com polígonos (UC001 concluído)

## Pós-condições (Sucesso)

- PS01: Apenas polígonos da tecnologia selecionada são visíveis (respeitando também filtro de quadrante)
- PS02: Cores dos polígonos permanecem por quadrante (RN003-01)
- PS03: Legenda exibe nota sobre filtro de tecnologia ativo
- PS04: Estado persistido na sessão (UC011)

## Pós-condições (Falha)

- PF01: Não aplicável — operação local

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Clica em uma aba de tecnologia (TODOS, FIBRA, MOVEL, AMBOS) |
| 2 | Sistema | Atualiza `techFilter` para a categoria selecionada |
| 3 | Sistema | Para cada polígono, recalcula visibilidade (RN002-02) |
| 4 | Sistema | Atualiza `polygon.setVisible(isVisible)` |
| 5 | Sistema | Atualiza estilo da aba: ativa (cor da tecnologia) vs inativa (cinza) |
| 6 | Sistema | Atualiza badges de contagem em cada aba |
| 7 | Sistema | Se techFilter != TODOS, exibe nota na legenda (RN003-02) |
| 8 | Sistema | Persiste filtro na sessão (UC011) |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC003-alt-flows.md#fa01) | Nenhum geohash visível após filtro combinado |

## Regras de Negócio Aplicadas

Veja [UC003-business-rules.md](./UC003-business-rules.md)

## Pontos de Função

Veja [UC003-function-points.md](./UC003-function-points.md)
