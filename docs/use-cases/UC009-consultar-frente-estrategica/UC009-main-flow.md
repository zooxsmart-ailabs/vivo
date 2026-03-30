# UC009 — Consultar Frente Estratégica

| Campo | Valor |
|-------|-------|
| **ID** | UC009 |
| **Nome** | Consultar Frente Estratégica |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC006, UC008, UC011 |

## Objetivo

O Analista consulta uma das 4 frentes estratégicas (Retenção, Upsell, Growth, Expansão) para visualizar o ranking de geohashes, perfis de cliente e ações recomendadas.

## Pre-condições

- PC01: Período e localização estao definidos (UC006, UC008)
- PC02: Existem geohashes classificados no quadrante da frente selecionada

## Pos-condições (Sucesso)

- PS01: Lista de geohashes rankada por prioridade da frente selecionada
- PS02: Painel de fluxo estratégico exibido para o geohash selecionado
- PS03: KPIs da frente calculados e exibidos

## Pos-condições (Falha)

- PF01: Frente sem geohashes: mensagem "Nenhum geohash neste quadrante para o período/região"

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aba "Frentes Estratégicas" (rota `/frentes`) |
| 2 | Sistema | Restaura ultima frente e geohash da sessão (UC011) |
| 3 | Sistema | Exibe 3 abas de estratégia: Retenção, Upsell, Growth |
| 4 | Analista | Seleciona uma aba de estratégia |
| 5 | Sistema | Filtra GEOHASH_DATA por `quadrant === estratégia selecionada` |
| 6 | Sistema | Ordena por campo de sort ativo (default: share desc) |
| 7 | Sistema | Exibe lista rankada na sidebar esquerda |
| 8 | Sistema | Exibe KPIs da frente: total clientes, media share, media satisfação |
| 9 | Sistema | Seleciona primeiro geohash da lista (ou ultimo da sessão) |
| 10 | Sistema | Exibe FlowPanel no painel direito com 3 colunas (RN009-01) |

## Interacoes na Sidebar

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 11 | Analista | Digita no campo de busca |
| 12 | Sistema | Filtra lista por label ou bairro (case-insensitive) |
| 13 | Analista | Clica em header "Share" ou "Sat." para ordenar |
| 14 | Sistema | Reordena lista pelo campo; clique repetido inverte direção |
| 15 | Analista | Clica em um geohash da lista |
| 16 | Sistema | Destaca item selecionado, atualiza FlowPanel |

## Conteudo do FlowPanel (3 Colunas)

| Coluna | Conteudo | Dados |
|--------|----------|-------|
| 1 — Dados do Geohash | Donut share, clientes, trend, satisfação (3 operadoras) | vw_geohash_summary |
| 2 — Perfil de Clientes | 3 segmentos com % e caracteristicas (RN009-02) | Configuração por estratégia |
| 3 — Ações Recomendadas | Oferta por segmento com plano, preco, canal | Configuração por estratégia |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC009-alt-flows.md#fa01) | Frente EXPANSAO (painel Expansão) |
| Alternativo | [FA02](./UC009-alt-flows.md#fa02) | Geohash com Camada 2 disponível |
| Alternativo | [FA03](./UC009-alt-flows.md#fa03) | Lista vazia apos busca |

## Regras de Negócio Aplicadas

Veja [UC009-business-rules.md](./UC009-business-rules.md)

## Pontos de Função

Veja [UC009-function-points.md](./UC009-function-points.md)
