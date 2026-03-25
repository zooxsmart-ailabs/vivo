# UC008 — Filtrar por Localizacao Geografica

| Campo | Valor |
|-------|-------|
| **ID** | UC008 |
| **Nome** | Filtrar por Localizacao Geografica |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL + PostGIS |
| **Prioridade** | Alta |
| **Versao** | 1.0 |
| **Referencias** | UC001, UC005, UC009, UC010, UC011 |

## Objetivo

O Analista define a localizacao geografica (Estado > Cidade > Bairro) para filtrar os dados em todas as abas. O filtro pode ser definido pelo centro do mapa ou por selecao explicita.

## Pre-condicoes

- PC01: O Analista esta autenticado (UC012)

## Pos-condicoes (Sucesso)

- PS01: Todas as visualizacoes filtradas pela localizacao selecionada
- PS02: Mapa centralizado na localizacao
- PS03: Seletor de localizacao exibe a hierarquia selecionada
- PS04: Estado persistido na sessao (UC011)

## Pos-condicoes (Falha)

- PF01: Localizacao sem dados: mensagem informativa

## Fluxo Principal (Selecao Explicita)

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Abre o seletor de localizacao (componente global no header) |
| 2 | Sistema | Exibe dropdown cascata: Estado > Cidade > Bairro |
| 3 | Sistema | Popula Estados com dados disponiveis no banco |
| 4 | Analista | Seleciona Estado (ex: GO) |
| 5 | Sistema | Popula Cidades do estado selecionado |
| 6 | Analista | Seleciona Cidade (ex: Goiania) |
| 7 | Sistema | Popula Bairros da cidade selecionada (opcional — pode ficar "Todos") |
| 8 | Analista | Seleciona Bairro ou mantem "Todos" |
| 9 | Sistema | Atualiza contexto global de localizacao |
| 10 | Sistema | Centraliza mapa na localizacao selecionada com zoom adequado (RN008-01) |
| 11 | Sistema | Reenvia subscriptions com nova localizacao |
| 12 | Sistema | Re-renderiza todas as visualizacoes |
| 13 | Sistema | Persiste localizacao na sessao (UC011) |

## Fluxo Alternativo: Derivado do Centro do Mapa

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Navega no mapa (pan/zoom) para outra regiao |
| 2 | Sistema | Detecta que o centro do mapa mudou de cidade (geocoding reverso) |
| 3 | Sistema | Atualiza seletor de localizacao para refletir nova cidade/estado |
| 4 | Sistema | NaO muda bairro (fica "Todos" ao navegar pelo mapa) |
| 5 | Sistema | Propaga nova localizacao para abas Frentes e Bairros |

## Fluxos Relacionados

| Tipo | ID | Condicao de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC008-alt-flows.md#fa01) | Localizacao sem dados no periodo |
| Excecao | [FE01](./UC008-alt-flows.md#fe01) | Geocoding reverso falha |

## Regras de Negocio Aplicadas

Veja [UC008-business-rules.md](./UC008-business-rules.md)

## Pontos de Funcao

Veja [UC008-function-points.md](./UC008-function-points.md)
