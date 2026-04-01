# UC009 — Pontos de Função

[<- Voltar ao fluxo principal](./UC009-main-flow.md)

## Funções de Transação

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| T01 | Exibir ranking de geohashes GROWTH na sidebar | SE | 10 | 3 | Médio | 5 |
| T02 | Filtrar geohashes por busca de bairro/ID | CE | 3 | 1 | Simples | 3 |
| T03 | Ordenar lista por score de prioridade | CE | 2 | 1 | Simples | 3 |
| T04 | Calcular diagnóstico 4 pilares (RN009-05) | SE | 14 | 4 | Complexo | 7 |
| T05 | Exibir PilarCard — Percepção (2 métricas + sinal) | SE | 8 | 2 | Médio | 5 |
| T06 | Exibir PilarCard — Concorrência (2 métricas + sinal) | SE | 8 | 2 | Médio | 5 |
| T07 | Exibir PilarCard — Infraestrutura (2 métricas + sinal) | SE | 8 | 2 | Médio | 5 |
| T08 | Exibir PilarCard — Comportamento (2 métricas + sinal) | SE | 8 | 2 | Médio | 5 |
| T09 | Calcular recomendação IA (RN009-06) | SE | 10 | 4 | Complexo | 7 |
| T10 | Exibir RecIA card (decisão, canal, abordagem, raciocínio) | SE | 8 | 3 | Médio | 5 |
| T11 | Calcular prioridade e rank por quadrante | SE | 5 | 2 | Médio | 5 |
| T12 | Consultar geohashes GROWTH da API | CE | 8 | 2 | Médio | 4 |
| T13 | Consultar detalhes do geohash selecionado (com Camada 2) | CE | 16 | 5 | Complexo | 6 |

**Subtotal Transações:** 65 PF

## Funções de Dados

| ID | Descrição | Tipo | DET | RET | Complexidade | PF |
|----|-----------|------|-----|-----|--------------|-----|
| D16 | diagnostico_growth (pré-calculado) | ALI | 16 | 1 | Simples | 7 |

**Subtotal Dados:** 7 PF

## Resumo

| Categoria | PF |
|-----------|-----|
| Dados | 7 |
| Transações | 65 |
| **Total UC009** | **72** |

> PF efetivo no INDEX: 22 → atualizar para 29.
