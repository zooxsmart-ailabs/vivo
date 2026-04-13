# UC009 — Consultar Frente Estratégica

| Campo | Valor |
|-------|-------|
| **ID** | UC009 |
| **Nome** | Consultar Frente Estratégica |
| **Ator Primário** | Analista |
| **Atores Secundários** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versão** | 2.0 |
| **Referências** | UC006, UC008, UC011 |

## Objetivo

O Analista consulta a frente estratégica Growth para visualizar o ranking de geohashes, diagnóstico dos 4 pilares (Percepção, Concorrência, Infraestrutura, Comportamento) e recomendação IA (ATACAR/AGUARDAR/BLOQUEADO).

## Pré-condições

- PC01: Período e localização estão definidos (UC006, UC008)
- PC02: Existem geohashes classificados no quadrante da frente selecionada

## Pós-condições (Sucesso)

- PS01: Lista de geohashes GROWTH rankada por prioridade na sidebar esquerda
- PS02: Painel de diagnóstico com 4 cards de pilar + card de recomendação IA exibido para o geohash selecionado
- PS03: Recomendação IA (ATACAR/AGUARDAR/BLOQUEADO) com canal, abordagem e raciocínio

## Pós-condições (Falha)

- PF01: Frente sem geohashes: mensagem "Nenhum geohash neste quadrante para o período/região"

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aba "Estratégias Growth" (rota `/frentes`) |
| 2 | Sistema | Restaura último geohash da sessão (UC011) |
| 3 | Sistema | Filtra geohashes por `quadrant === GROWTH` |
| 4 | Sistema | Ordena por score de prioridade descendente (RN004-01) |
| 5 | Sistema | Exibe ranking na sidebar dark esquerda com: posição, ID, bairro, share, score, prioridade (P1-P4) |
| 6 | Sistema | Seleciona primeiro geohash da lista (ou último da sessão) |
| 7 | Sistema | Calcula diagnóstico dos 4 pilares (RN009-05) via `buildDiagnostico()` |
| 8 | Sistema | Calcula recomendação IA (RN009-06) via `gerarRec()` |
| 9 | Sistema | Exibe no painel principal direito: 4 PilarCards + 1 RecIA card |
| 10 | Sistema | Cada PilarCard mostra: título, sinal (OK/Alerta/Crítico), 2 métricas com valores e fórmulas |

## Interações na Sidebar

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 11 | Analista | Digita no campo de busca |
| 12 | Sistema | Filtra lista por label ou bairro (case-insensitive) |
| 13 | Analista | Clica em header "Share" ou "Sat." para ordenar |
| 14 | Sistema | Reordena lista pelo campo; clique repetido inverte direção |
| 15 | Analista | Clica em um geohash da lista |
| 16 | Sistema | Destaca item selecionado, atualiza FlowPanel |

## Conteúdo do Painel Diagnóstico

### Cards de Pilar (4x — PilarCard.vue)

| Card | Pilar | Métricas Exibidas | Fonte |
|------|-------|-------------------|-------|
| 1 | Percepção | Score Ookla (0-10), Vol. Chamados (%) | score, (stub) |
| 2 | Concorrência | Share/Penetração (%), Vantagem vs Líder (delta) | vw_share_real, score |
| 3 | Infraestrutura | Fibra Status (classificação), Móvel Status (classificação) | camada2_fibra, camada2_movel |
| 4 | Comportamento | Sensibilidade a Preço (ratio), Afinidade de Canal (%) | geohash_crm, (stub) |

Cada card exibe: título do pilar, badge de sinal (OK/Alerta/Crítico) com cor, e 2 linhas de métrica com label, valor, fórmula e detalhe.

### Card de Recomendação IA (RecIA.vue)

| Campo | Conteúdo | Exemplo |
|-------|----------|---------|
| Decisão | ATACAR / AGUARDAR / BLOQUEADO | Badge colorido com estado |
| Decisão Móvel | ATACAR / AGUARDAR | Badge per-tech (v5) |
| Decisão Fibra | ATACAR / AGUARDAR | Badge per-tech (v5) |
| Prioridade Móvel | ALTA / MÉDIA / BAIXA | Badge com cor (v5) |
| Prioridade Fibra | ALTA / MÉDIA / BAIXA | Badge com cor (v5) |
| Canal | Canal recomendado + alocação | "Digital (dominante — priorizar 80% da verba)" |
| Abordagem | Texto prescritivo de abordagem comercial | "Oferta de totalização (Fibra + Móvel + Streaming)..." |
| Raciocínio | Justificativa composta dos sinais avaliados | "Decisão baseada em: percepção excelente; alta oportunidade..." |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC009-alt-flows.md#fa01) | Frente EXPANSAO (painel Expansão) |
| Alternativo | [FA02](./UC009-alt-flows.md#fa02) | Geohash com Camada 2 disponível |
| Alternativo | [FA03](./UC009-alt-flows.md#fa03) | Lista vazia após busca |

## Regras de Negócio Aplicadas

Veja [UC009-business-rules.md](./UC009-business-rules.md)

## Pontos de Função

Veja [UC009-function-points.md](./UC009-function-points.md)
