# UC009 — Consultar Frente Estrategica

| Campo | Valor |
|-------|-------|
| **ID** | UC009 |
| **Nome** | Consultar Frente Estrategica |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC006, UC008, UC011 |

## Objetivo

O Analista consulta uma das 4 frentes estrategicas (Retencao, Upsell, Growth, Expansao) para visualizar o ranking de geohashes, perfis de cliente e acoes recomendadas.

## Pre-condicoes

- PC01: Periodo e localizacao estao definidos (UC006, UC008)
- PC02: Existem geohashes classificados no quadrante da frente selecionada

## Pos-condicoes (Sucesso)

- PS01: Lista de geohashes rankada por prioridade da frente selecionada
- PS02: Painel de fluxo estrategico exibido para o geohash selecionado
- PS03: KPIs da frente calculados e exibidos

## Pos-condicoes (Falha)

- PF01: Frente sem geohashes: mensagem "Nenhum geohash neste quadrante para o periodo/regiao"

## Fluxo Principal

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aba "Frentes Estrategicas" (rota `/frentes`) |
| 2 | Sistema | Restaura ultima frente e geohash da sessao (UC011) |
| 3 | Sistema | Exibe 3 abas de estrategia: Retencao, Upsell, Growth |
| 4 | Analista | Seleciona uma aba de estrategia |
| 5 | Sistema | Filtra GEOHASH_DATA por `quadrant === estrategia selecionada` |
| 6 | Sistema | Ordena por campo de sort ativo (default: share desc) |
| 7 | Sistema | Exibe lista rankada na sidebar esquerda |
| 8 | Sistema | Exibe KPIs da frente: total clientes, media share, media satisfacao |
| 9 | Sistema | Seleciona primeiro geohash da lista (ou ultimo da sessao) |
| 10 | Sistema | Exibe FlowPanel no painel direito com 3 colunas (RN009-01) |

## Interacoes na Sidebar

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 11 | Analista | Digita no campo de busca |
| 12 | Sistema | Filtra lista por label ou bairro (case-insensitive) |
| 13 | Analista | Clica em header "Share" ou "Sat." para ordenar |
| 14 | Sistema | Reordena lista pelo campo; clique repetido inverte direcao |
| 15 | Analista | Clica em um geohash da lista |
| 16 | Sistema | Destaca item selecionado, atualiza FlowPanel |

## Conteudo do FlowPanel (3 Colunas)

| Coluna | Conteudo | Dados |
|--------|----------|-------|
| 1 — Dados do Geohash | Donut share, clientes, trend, satisfacao (3 operadoras) | vw_geohash_summary |
| 2 — Perfil de Clientes | 3 segmentos com % e caracteristicas (RN009-02) | Configuracao por estrategia |
| 3 — Acoes Recomendadas | Oferta por segmento com plano, preco, canal | Configuracao por estrategia |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC009-alt-flows.md#fa01) | Frente EXPANSAO (painel Expansao) |
| Alternativo | [FA02](./UC009-alt-flows.md#fa02) | Geohash com Camada 2 disponivel |
| Alternativo | [FA03](./UC009-alt-flows.md#fa03) | Lista vazia apos busca |

## Regras de Negocio Aplicadas

Veja [UC009-business-rules.md](./UC009-business-rules.md)

## Pontos de Funcao

Veja [UC009-function-points.md](./UC009-function-points.md)
