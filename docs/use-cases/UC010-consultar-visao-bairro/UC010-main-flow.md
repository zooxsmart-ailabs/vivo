# UC010 — Consultar Visao por Bairro

| Campo | Valor |
|-------|-------|
| **ID** | UC010 |
| **Nome** | Consultar Visao por Bairro |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC006, UC008, UC011 |

## Objetivo

O Analista consulta a agregacao de geohashes por bairro, com ranking por categoria estrategica e detalhamento com KPIs, satisfacao comparativa e infraestrutura.

## Pre-condicoes

- PC01: Periodo e localizacao definidos (UC006, UC008)
- PC02: Existem geohashes agrupados por bairro na localizacao/periodo

## Pos-condicoes (Sucesso)

- PS01: Lista de bairros rankada pela categoria selecionada
- PS02: Painel de detalhamento exibido para o bairro selecionado
- PS03: Dados agregados de todos os geohashes do bairro

## Pos-condicoes (Falha)

- PF01: Sem bairros para a categoria: lista vazia com mensagem informativa

## Fluxo Principal

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aba "Visao por Bairro" (rota `/bairros`) |
| 2 | Sistema | Restaura ultimo bairro e categoria da sessao (UC011) |
| 3 | Sistema | Agrega geohashes por bairro (RN010-01) |
| 4 | Sistema | Exibe 3 abas de categoria: Growth, Upsell, Retencao |
| 5 | Analista | Seleciona categoria de ranking |
| 6 | Sistema | Filtra bairros que possuem geohashes na categoria selecionada |
| 7 | Sistema | Ordena por contagem de geohashes na categoria (desc) |
| 8 | Sistema | Exibe lista rankada na sidebar com: posicao, nome, share, contagem, satisfacao, trend |
| 9 | Analista | Seleciona bairro da lista |
| 10 | Sistema | Exibe detalhamento no painel direito |

## Conteudo do Painel de Detalhamento

| Secao | Dados | Fonte |
|-------|-------|-------|
| Dados Regionais | Total domicilios, populacao, renda media | Agregado geo_por_latlong |
| Header | Nome, pills quadrantes, trend, share % | Agregado vw_bairro_summary |
| KPIs | Total clientes, satisfacao media, delta vs melhor concorrente | Calculado |
| Satisfacao | Barras VIVO/TIM/CLARO (0-10) | Agregado scores |
| Camada 1 | Grid 2x2 quadrantes: contagem, %, barra, label estrategico | Agregado |
| Camada 2 Fibra | Score medio, classificacoes (Capacidade/Expansao/Saudavel) | Agregado |
| Camada 2 Movel | Score medio, classificacoes (Qualidade/Saudavel/5G/4G) | Agregado |

## Interacoes na Sidebar

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 11 | Analista | Digita no campo de busca |
| 12 | Sistema | Filtra lista por nome do bairro (case-insensitive) |
| 13 | Analista | Clica em outro bairro |
| 14 | Sistema | Atualiza painel de detalhamento |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC010-alt-flows.md#fa01) | Bairro sem dados de Camada 2 |
| Alternativo | [FA02](./UC010-alt-flows.md#fa02) | Busca sem resultados |

## Regras de Negocio Aplicadas

Veja [UC010-business-rules.md](./UC010-business-rules.md)

## Pontos de Funcao

Veja [UC010-function-points.md](./UC010-function-points.md)
