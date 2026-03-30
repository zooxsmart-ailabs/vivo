# UC010 — Consultar Visão por Bairro

| Campo | Valor |
|-------|-------|
| **ID** | UC010 |
| **Nome** | Consultar Visão por Bairro |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC006, UC008, UC011 |

## Objetivo

O Analista consulta a agregação de geohashes por bairro, com ranking por categoria estratégica e detalhamento com KPIs, satisfação comparativa e infraestrutura.

## Pre-condições

- PC01: Período e localização definidos (UC006, UC008)
- PC02: Existem geohashes agrupados por bairro na localização/período

## Pos-condições (Sucesso)

- PS01: Lista de bairros rankada pela categoria selecionada
- PS02: Painel de detalhamento exibido para o bairro selecionado
- PS03: Dados agregados de todos os geohashes do bairro

## Pos-condições (Falha)

- PF01: Sem bairros para a categoria: lista vazia com mensagem informativa

## Fluxo Principal

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Acessa a aba "Visão por Bairro" (rota `/bairros`) |
| 2 | Sistema | Restaura ultimo bairro e categoria da sessão (UC011) |
| 3 | Sistema | Agrega geohashes por bairro (RN010-01) |
| 4 | Sistema | Exibe 3 abas de categoria: Growth, Upsell, Retenção |
| 5 | Analista | Seleciona categoria de ranking |
| 6 | Sistema | Filtra bairros que possuem geohashes na categoria selecionada |
| 7 | Sistema | Ordena por contagem de geohashes na categoria (desc) |
| 8 | Sistema | Exibe lista rankada na sidebar com: posição, nome, share, contagem, satisfação, trend |
| 9 | Analista | Seleciona bairro da lista |
| 10 | Sistema | Exibe detalhamento no painel direito |

## Conteudo do Painel de Detalhamento

| Seção | Dados | Fonte |
|-------|-------|-------|
| Dados Regionais | Total domicilios, população, renda media | Agregado geo_por_latlong |
| Header | Nome, pills quadrantes, trend, share % | Agregado vw_bairro_summary |
| KPIs | Total clientes, satisfação media, delta vs melhor concorrente | Calculado |
| Satisfação | Barras VIVO/TIM/CLARO (0-10) | Agregado scores |
| Camada 1 | Grid 2x2 quadrantes: contagem, %, barra, label estratégico | Agregado |
| Camada 2 Fibra | Score medio, classificacoes (Capacidade/Expansão/Saudavel) | Agregado |
| Camada 2 Movel | Score medio, classificacoes (Qualidade/Saudavel/5G/4G) | Agregado |

## Interacoes na Sidebar

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 11 | Analista | Digita no campo de busca |
| 12 | Sistema | Filtra lista por nome do bairro (case-insensitive) |
| 13 | Analista | Clica em outro bairro |
| 14 | Sistema | Atualiza painel de detalhamento |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC010-alt-flows.md#fa01) | Bairro sem dados de Camada 2 |
| Alternativo | [FA02](./UC010-alt-flows.md#fa02) | Busca sem resultados |

## Regras de Negócio Aplicadas

Veja [UC010-business-rules.md](./UC010-business-rules.md)

## Pontos de Função

Veja [UC010-function-points.md](./UC010-function-points.md)
